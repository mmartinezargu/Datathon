"""Plan de inversión para el escenario por defecto (para una diapositiva; sin interfaz).

Uso (desde etl/):  uv run plan_inversion.py
                   uv run plan_inversion.py --vivienda 0.3   (otra «Vivienda vacía que se ocupa»)

Con el escenario por defecto (2035, ritmo de la última década), con y sin
«Reubicar en pueblos cercanos»: en cada municipio donde falta sitio y manda
el límite de colegios o de sanidad, se añade un colegio o un centro de salud
(el que limite) y se recalcula, hasta que manda la vivienda o el ritmo, o ya
cabe todo el mundo. Imprime cuántos colegios y centros hacen falta, lo que
cuestan, el año en que abriría lo último y cuánta gente sigue sin sitio.

Lee los datos que usa la web (web/public/datos) y repite las cuentas de
web/src/motor.ts, que es donde vive el modelo. Si cambias el motor, cambia
esto también: al arrancar se comprueba que salen las cifras de la web.
"""
import argparse
import json
import math

from comun import ANIO_BASE, WEB_DATOS, miles

# Mismos valores que web/src/motor.ts
CRECIMIENTO_DECADA = 134_426
MARGEN_MINIMO = 25
COSTE_COLEGIO = 9_500_000
COSTE_CENTRO_SALUD = 8_000_000
PLAZO_COLEGIO_ANIOS = 2
PLAZO_CENTRO_SALUD_ANIOS = 3
HOSPITAL_LEJOS_KM = 25
ESCENARIO = {
    "anio": 2035, "personas": round(CRECIMIENTO_DECADA / 10 * 10), "pct_suelo": 0.5, "pct_vivienda": 0.15,
    "ritmo_max": 0.03, "exigencia": 0.9, "radio_km": 25,
}
# Supuesto de este script, no del motor: las obras empiezan todas a la vez en este año
INICIO_OBRAS = 2027
NIVELES = ("primaria", "secundaria")


def percentil(v: list[float], q: float) -> float:
    s = sorted(v)
    pos = (len(s) - 1) * q
    i = math.floor(pos)
    return s[i] + (s[i + 1] - s[i]) * (pos - i) if i + 1 < len(s) else s[i]


def mediana(v: list[float]) -> float:
    s = sorted(v)
    m = len(s) // 2
    return s[m] if len(s) % 2 else (s[m - 1] + s[m]) / 2


def hoy(m: dict) -> float:
    return m["poblacion"][str(ANIO_BASE)]


def umbrales(universo: list[dict], zonas: list[dict], exigencia: float) -> dict:
    def curva(nivel: str) -> dict:
        pts = [(math.log(hoy(m)), math.log(m["capacidad"][f"alumnos_{nivel}"] / m["capacidad"][f"colegios_{nivel}"]))
               for m in universo
               if m["capacidad"][f"colegios_{nivel}"] > 0 and m["capacidad"][f"alumnos_{nivel}"] > 0]
        mx = sum(x for x, _ in pts) / len(pts)
        my = sum(y for _, y in pts) / len(pts)
        b = sum((x - mx) * (y - my) for x, y in pts) / sum((x - mx) ** 2 for x, _ in pts)
        a = my - b * mx
        return {"a": a, "b": b, "ajuste": percentil([y - (a + b * x) for x, y in pts], exigencia)}
    return {"primaria": curva("primaria"), "secundaria": curva("secundaria"),
            "zona_salud": percentil([z["poblacion"] for z in zonas], exigencia)}


def limites(m: dict, u: dict, colegios_nuevos: int, centros_nuevos: int) -> dict:
    c, p, anios = m["capacidad"], hoy(m), ESCENARIO["anio"] - ANIO_BASE
    vivienda = (c["viv_vacias"] * ESCENARIO["pct_vivienda"]
                + c["viv_previstas"] * ESCENARIO["pct_suelo"]) * c["personas_hogar"]

    niveles = [{"n": c[f"colegios_{x}"], "alumnos": c[f"alumnos_{x}"], "ninos_por_vecino": c[f"ninos_{x}"] / p,
                "limite": math.exp(u[x]["a"] + u[x]["b"] * math.log(p) + u[x]["ajuste"])}
               for x in NIVELES if c[f"colegios_{x}"] > 0 and c[f"alumnos_{x}"] > 0]

    def caben(x: dict) -> float:
        return max(0, x["n"] * x["limite"] - x["alumnos"]) / x["ninos_por_vecino"]
    for _ in range(colegios_nuevos if niveles else 0):
        min(niveles, key=caben)["n"] += 1  # el colegio nuevo va al nivel con menos sitio
    colegios = min(caben(x) for x in niveles) if niveles else None

    libre_zona = (u["zona_salud"] - c["zbs_poblacion"]) * min(1, p / c["zbs_poblacion"])
    sanidad = max(0, libre_zona + centros_nuevos * u["zona_salud"])
    ritmo = p * ((1 + ESCENARIO["ritmo_max"]) ** anios - 1)
    return {"vivienda": vivienda, "colegios": colegios, "sanidad": sanidad, "ritmo": ritmo}


def minimo(lim: dict) -> tuple[str, float]:
    mejor = ("ritmo", math.inf)
    for k, v in lim.items():
        if v is not None and v < mejor[1]:
            mejor = (k, v)
    return mejor


def calcular(universo: list[dict], u: dict, inversiones: dict, reubicar: bool) -> list[dict]:
    """Como calcular() de motor.ts. Con reubicación, añade `envia` y `recibe`."""
    anios = ESCENARIO["anio"] - ANIO_BASE
    # Ningún municipio llega a su tope (son infinitos): el reparto es proporcional sin más
    pesos = [max(0, hoy(m) * ((1 + (m["g_suavizada"] or 0)) ** anios - 1)) for m in universo]
    llegan = [ESCENARIO["personas"] * w / sum(pesos) for w in pesos]

    filas = []
    for m, ll in zip(universo, llegan):
        col, cen = inversiones.get(m["ine"], (0, 0))
        limitante, caben = minimo(limites(m, u, col, cen))
        caben_sin = minimo(limites(m, u, 0, 0))[1]
        filas.append({"ine": m["ine"], "m": m, "poblacion": hoy(m), "llegan": ll, "crecimiento": ll / hoy(m),
                      "caben": caben, "caben_sin": caben_sin, "limitante": limitante, "margen": caben - ll,
                      "envia": 0.0, "recibe": 0.0})

    med_p = mediana([f["crecimiento"] for f in filas])
    med_c = mediana([f["caben_sin"] / f["poblacion"] for f in filas])
    for f in filas:
        if f["llegan"] - f["caben"] >= MARGEN_MINIMO:
            f["tipo"] = "tension"
        elif f["crecimiento"] >= med_p:
            f["tipo"] = "polo"
        elif f["caben"] / f["poblacion"] >= med_c:
            f["tipo"] = "oportunidad"
        else:
            f["tipo"] = "consolidacion"
        f["condicionada"] = f["tipo"] == "oportunidad" and f["m"]["hospital_km"] > HOSPITAL_LEJOS_KM

    if reubicar:
        repartir_cerca(filas)
    return filas


def repartir_cerca(filas: list[dict]) -> None:
    """Como reubicar() de motor.ts: de la pareja más cercana a la más lejana, lo que quepa."""
    por_ine = {f["ine"]: f for f in filas}
    exceso = {f["ine"]: -f["margen"] for f in filas if f["margen"] < 0}
    sitio = {f["ine"]: f["margen"] for f in filas if f["margen"] > 0 and f["m"]["hospital_km"] <= HOSPITAL_LEJOS_KM}
    parejas = []
    for o in exceso:
        a = por_ine[o]["m"]
        for d in sitio:
            b = por_ine[d]["m"]
            km = math.hypot(a["nucleo_x"] - b["nucleo_x"], a["nucleo_y"] - b["nucleo_y"])
            if km <= ESCENARIO["radio_km"]:
                parejas.append((km, o, d))
    for _, o, d in sorted(parejas):
        personas = min(exceso[o], sitio[d])
        if personas <= 0:
            continue
        exceso[o] -= personas
        sitio[d] -= personas
        por_ine[o]["envia"] += personas
        por_ine[d]["recibe"] += personas


def sin_sitio(f: dict) -> float:
    return max(0, -f["margen"]) - f["envia"]


def planificar(universo: list[dict], u: dict, reubicar: bool) -> tuple[dict, list[dict]]:
    """Añade de uno en uno, donde más gente falta, el colegio o el centro que limita."""
    inversiones: dict[str, tuple[int, int]] = {}
    filas = calcular(universo, u, inversiones, reubicar)
    while True:
        candidatos = [f for f in filas if sin_sitio(f) >= MARGEN_MINIMO and f["limitante"] in ("colegios", "sanidad")]
        if not candidatos:
            return inversiones, filas
        f = max(candidatos, key=sin_sitio)
        col, cen = inversiones.get(f["ine"], (0, 0))
        inversiones[f["ine"]] = (col + 1, cen) if f["limitante"] == "colegios" else (col, cen + 1)
        filas = calcular(universo, u, inversiones, reubicar)


def main() -> None:
    args = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    args.add_argument("--vivienda", type=float, default=ESCENARIO["pct_vivienda"],
                      help="parte de las viviendas vacías que se ocupa (0-1); por defecto, la de la web")
    ESCENARIO["pct_vivienda"] = args.parse_args().vivienda
    if ESCENARIO["pct_vivienda"] != 0.15:
        print(f"Vivienda vacía que se ocupa: {ESCENARIO['pct_vivienda']:.0%} (la web usa 15 %)")
    municipios = json.loads((WEB_DATOS / "municipios.json").read_text(encoding="utf-8"))
    zonas = json.loads((WEB_DATOS / "zonas_salud.json").read_text(encoding="utf-8"))
    universo = [m for m in municipios if m["universo"] and m["capacidad"]]
    u = umbrales(universo, zonas, ESCENARIO["exigencia"])

    # Comprobación: sin invertir tienen que salir las cifras de la web (PENDIENTE.md)
    base = calcular(universo, u, {}, reubicar=False)
    print(f"Sin invertir: caben {miles(sum(min(f['caben'], f['llegan']) for f in base))}, "
          f"sin sitio {miles(sum(sin_sitio(f) for f in base))}")

    for reubicar in (False, True):
        inversiones, filas = planificar(universo, u, reubicar)
        colegios = sum(c for c, _ in inversiones.values())
        centros = sum(c for _, c in inversiones.values())
        coste = colegios * COSTE_COLEGIO + centros * COSTE_CENTRO_SALUD
        plazo = max(PLAZO_COLEGIO_ANIOS if colegios else 0, PLAZO_CENTRO_SALUD_ANIOS if centros else 0)
        antes = sum(sin_sitio(f) for f in calcular(universo, u, {}, reubicar))
        quedan = sum(sin_sitio(f) for f in filas)
        limitan = {}
        for f in filas:
            if sin_sitio(f) >= 1:
                limitan[f["limitante"]] = limitan.get(f["limitante"], 0) + sin_sitio(f)

        print(f"\n{'Con' if reubicar else 'Sin'} reubicar en pueblos cercanos"
              + (f" (a {ESCENARIO['radio_km']} km)" if reubicar else ""))
        print(f"  Municipios donde se invierte:      {len(inversiones)}")
        print(f"  Colegios nuevos:                   {colegios}")
        print(f"  Centros de salud nuevos:           {centros}")
        print(f"  Coste:                             {miles(coste / 1e6)} M€")
        print(f"  Última apertura (obras desde {INICIO_OBRAS}): {INICIO_OBRAS + plazo}")
        print(f"  Sin sitio antes de invertir:       {miles(antes)}")
        print(f"  Siguen sin sitio:                  {miles(quedan)}"
              + "".join(f"; {miles(v)} por {k}" for k, v in sorted(limitan.items(), key=lambda kv: -kv[1])))


if __name__ == "__main__":
    main()
