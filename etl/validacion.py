"""Validación de CABIDA contra el pasado (backtesting 2015 -> 2025).

Uso (desde etl/):  uv run validacion.py

Idea: hacemos como si estuviéramos en 2015. Con datos solo hasta 2015,
cada modelo reparte entre los 155 municipios el crecimiento que hubo de verdad
en 2015-2025. Luego comparamos con lo que pasó.

Error (WAPE): suma de |previsto - real| entre lo que crecieron de verdad.
Cuenta dos veces a cada persona mal colocada: una donde falta y otra donde sobra.

Personas colocadas en otro municipio: la mitad de esa suma, entre el total
(sum|previsto - real| / 2 / total). Es la parte del total que el modelo puso en
un municipio que no era. 1 menos eso = de cada 100, cuántas acierta dónde van.
Se calcula también agrupando por zona (lo que se coloca en otra zona).
Menos es mejor.

Además, la población de las 286 zonas básicas de salud que usa el límite de
sanidad (Padrón 2019 actualizado con su municipio principal) se compara con la
del Censo 2021 por zona básica de salud (IECM, tabla T21SALUD01), llevando
nuestra estimación a 2021 con el mismo método. No se sustituye nada: es una prueba.

Salidas: web/public/datos/validacion.json y data/out/validacion_municipios.csv
"""
import io
import json
import warnings
import zipfile

import numpy as np
import pandas as pd
from scipy.stats import spearmanr

import capacidad
import diccionario
from comun import ANIO_BASE, LIMITE_HABITANTES, OUT, RAW, WEB_DATOS, leer_poblacion, miles
from preparar import K_SUAVIZADO, leer_zonas

INICIO, CORTE, FIN = 2005, 2015, 2025
G_MAX = 0.03  # techo de ritmo: un municipio no absorbe más de un 3 % al año


def repartir_con_tope(total: float, pesos: np.ndarray, topes: np.ndarray) -> np.ndarray:
    """Reparte `total` en proporción a `pesos`, sin pasar de `topes`.

    Lo que no cabe en un municipio lleno se vuelve a repartir entre los que
    tienen sitio, hasta que todo encaja (o no queda sitio). Es el mismo
    algoritmo que usa la web (motor.ts).
    """
    asignado = np.zeros_like(pesos, dtype=float)
    libres = pesos > 0
    resto = total
    for _ in range(len(pesos)):
        if resto <= 1e-9 or not libres.any():
            break
        reparto = resto * pesos * libres / pesos[libres].sum()
        hueco = topes - asignado
        llenos = libres & (reparto >= hueco)
        if not llenos.any():
            asignado += reparto
            resto = 0
            break
        # Los que se llenan reciben justo su hueco y salen del reparto
        asignado[llenos] = topes[llenos]
        resto = total - asignado.sum()
        libres &= ~llenos
    return asignado


def colocadas_fuera(pred: np.ndarray, real: np.ndarray, grupos: np.ndarray | None = None) -> float:
    """Parte del total colocada en otro municipio (o en otra zona, si se dan `grupos`)."""
    if grupos is not None:
        pred = pd.Series(pred).groupby(grupos).sum().to_numpy()
        real = pd.Series(real).groupby(grupos).sum().to_numpy()
    return float(np.abs(pred - real).sum() / 2 / real.sum())


def leer_censo_zonas() -> pd.DataFrame:
    """Censo 2021, población por zona básica de salud (IECM, T21SALUD01). Sin «Sin zona asignada (colectivos)»."""
    with zipfile.ZipFile(RAW / "iecm_censo2021_zonas_basicas_salud.zip") as z, warnings.catch_warnings():
        warnings.simplefilter("ignore")  # openpyxl avisa de un pie de página que no entiende
        t = pd.read_excel(io.BytesIO(z.read("T21SALUD01.xlsx")), header=None, dtype={0: str})
    t = t[t[0].fillna("").str.fullmatch(r"\d{3}")]
    return pd.DataFrame({"codigo": t[0], "censo_2021": t[2].astype(float)})


def comparar_zonas(pob: pd.DataFrame, universo: set[str]) -> dict:
    """Nuestra población de cada zona de salud, con el mismo método pero a 2021, frente al Censo 2021."""
    mun_zona, zonas = capacidad.leer_sanidad(pob, anio=2021)
    d = zonas.merge(leer_censo_zonas(), on="codigo", how="inner")
    d["estimada_2021"] = d["poblacion"].astype(float)
    d["dif"] = d["estimada_2021"] / d["censo_2021"] - 1
    del_reto = set(mun_zona.loc[mun_zona["ine"].isin(universo), "zbs_codigo"])

    def resumen(x: pd.DataFrame) -> dict:
        return {"zonas": len(x), "correlacion": round(float(np.corrcoef(x["estimada_2021"], x["censo_2021"])[0, 1]), 4),
                "dif_media": round(float(x["dif"].mean()), 4), "dif_abs_media": round(float(x["dif"].abs().mean()), 4),
                "dif_abs_mediana": round(float(x["dif"].abs().median()), 4)}

    peores = d.reindex(d["dif"].abs().sort_values(ascending=False).index).head(10)
    return {
        "todas": resumen(d), "del_reto": resumen(d[d["codigo"].isin(del_reto)]),
        "mas_se_apartan": [{"codigo": f.codigo, "nombre": f.nombre, "estimada_2021": int(f.estimada_2021),
                            "censo_2021": int(f.censo_2021), "dif": round(float(f.dif), 4),
                            "del_reto": f.codigo in del_reto} for f in peores.itertuples()],
    }


def main() -> None:
    df = leer_poblacion().merge(leer_zonas(), on="ine")
    # Mismo universo que la app: los 155 municipios con < 50.000 hab. en 2025
    df = df[df[ANIO_BASE] < LIMITE_HABITANTES].copy()

    p0, p1, real_fin = df[INICIO].to_numpy(), df[CORTE].to_numpy(), df[FIN].to_numpy()
    real = real_fin - p1                      # crecimiento real 2015-2025
    total = real.sum()
    anios_hist, anios_pred = CORTE - INICIO, FIN - CORTE

    # Tendencia conocida en 2015 (2005-2015), propia y de la zona
    g = (p1 / p0) ** (1 / anios_hist) - 1
    zona = df.groupby("zona")[[INICIO, CORTE]].sum()
    g_zona_tab = (zona[CORTE] / zona[INICIO]) ** (1 / anios_hist) - 1
    g_zona = df["zona"].map(g_zona_tab).to_numpy()
    w = p1 / (p1 + K_SUAVIZADO)
    g_suav = w * g + (1 - w) * g_zona

    def tendencial(tasa):
        # Crecimiento si sigue la tasa; los que pierden población no reciben nadie
        return np.clip(p1 * ((1 + tasa) ** anios_pred - 1), 0, None)

    def escalar(pesos):
        return total * pesos / pesos.sum()

    tope = p1 * ((1 + G_MAX) ** anios_pred - 1)
    modelos = {
        "Repartir según el tamaño del municipio": escalar(p1.astype(float)),
        "Extrapolar la tendencia 2005-2015": escalar(tendencial(g)),
        "Tendencia suavizada hacia la zona": escalar(tendencial(g_suav)),
        "Suavizada + techo de crecimiento (3 %/año)": repartir_con_tope(total, tendencial(g_suav), tope),
    }

    top_real = set(np.argsort(-real)[:20])
    zonas = df["zona"].to_numpy()
    filas = []
    for nombre, pred in modelos.items():
        wape = np.abs(pred - real).sum() / np.abs(real).sum()
        aciertos = len(top_real & set(np.argsort(-pred)[:20]))
        rho = spearmanr(pred / p1, real / p1).statistic
        filas.append({"modelo": nombre, "wape": round(float(wape), 4),
                      "fuera_municipio": round(colocadas_fuera(pred, real), 4),
                      "fuera_zona": round(colocadas_fuera(pred, real, zonas), 4),
                      "aciertos_top20": aciertos, "spearman": round(float(rho), 3)})

    print(f"Crecimiento real 2015-2025 de los {len(df)} municipios: {miles(total)} personas\n")
    print(f"{'Modelo':46} {'WAPE':>7} {'Otro mun.':>10} {'Otra zona':>10} {'Top 20':>7} {'Spearman':>9}")
    for f in filas:
        print(f"{f['modelo']:46} {f['wape']:>7.1%} {f['fuera_municipio']:>10.1%} {f['fuera_zona']:>10.1%}"
              f" {f['aciertos_top20']:>4}/20 {f['spearman']:>9.2f}")

    final = list(modelos.values())[-1]
    detalle = pd.DataFrame({
        "ine": df["ine"], "nombre": df["nombre"], f"poblacion_{CORTE}": p1,
        "crecimiento_real": real, "crecimiento_previsto": final.round(0),
    })
    detalle["error"] = detalle["crecimiento_previsto"] - detalle["crecimiento_real"]
    OUT.mkdir(parents=True, exist_ok=True)
    diccionario.comprobar("validacion_municipios.csv", list(detalle.columns))
    detalle.to_csv(OUT / "validacion_municipios.csv", index=False, encoding="utf-8")

    pob = leer_poblacion()
    zonas_salud = comparar_zonas(pob, set(df["ine"]))
    t, r = zonas_salud["todas"], zonas_salud["del_reto"]
    print(f"\nZonas de salud frente al Censo 2021 (IECM): {t['zonas']} zonas, correlación {t['correlacion']:.3f}, "
          f"diferencia media {t['dif_media']:+.1%}, media en valor absoluto {t['dif_abs_media']:.1%} "
          f"(mediana {t['dif_abs_mediana']:.1%})")
    print(f"  Las {r['zonas']} zonas de los municipios del reto: correlación {r['correlacion']:.3f}, "
          f"diferencia media {r['dif_media']:+.1%}, en valor absoluto {r['dif_abs_media']:.1%}")
    for z in zonas_salud["mas_se_apartan"]:
        print(f"  {z['codigo']} {z['nombre']:32} {miles(z['estimada_2021']):>8} vs {miles(z['censo_2021']):>8}  {z['dif']:+.1%}"
              + ("  (del reto)" if z["del_reto"] else ""))

    salida = {
        "periodo": f"{CORTE}-{FIN}", "datos_hasta": CORTE, "municipios": len(df),
        "crecimiento_real_total": int(total), "techo_g_max": G_MAX, "modelos": filas,
        # Los 10 que más fallan, para la página de metodología
        "mayores_errores": detalle.reindex(detalle["error"].abs().sort_values(ascending=False).index)
                                  .head(10)[["ine", "nombre", "crecimiento_real", "crecimiento_previsto"]]
                                  .to_dict(orient="records"),
        "zonas_salud": zonas_salud,
    }
    WEB_DATOS.mkdir(parents=True, exist_ok=True)
    (WEB_DATOS / "validacion.json").write_text(
        json.dumps(salida, ensure_ascii=False, default=int), encoding="utf-8")


if __name__ == "__main__":
    main()
