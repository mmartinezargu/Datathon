"""Prepara los «ingredientes» de cada municipio para la web de CABIDA.

Uso (desde etl/):  uv run preparar.py

Salidas:
  web/public/datos/municipios.json   datos por municipio que lee la web
  web/public/datos/limites.geojson   contornos simplificados para el mapa
  data/out/tabla_maestra.csv         lo mismo en CSV (licencia CC BY 4.0)
  data/out/diccionario.csv           qué es cada columna de tabla_maestra.csv y validacion_municipios.csv
  web/public/datos/tabla_maestra.csv copia para descargarla desde la web (también sin internet)
"""
import json
import shutil

import geopandas as gpd
import numpy as np
import pandas as pd
from scipy.spatial import cKDTree

import capacidad
import diccionario
from comun import ANIO_BASE, LIMITE_HABITANTES, OUT, RAW, WEB_DATOS, leer_poblacion, miles

# Peso del suavizado: un pueblo con K habitantes se fía a medias de su propia tasa
# y a medias de la de su zona. Con 100 vecinos casi solo cuenta la zona.
K_SUAVIZADO = 5_000
ANIOS_TENDENCIA = (2015, 2025)


def leer_zonas() -> pd.DataFrame:
    """Zona estadística (NUTS4) y superficie de cada municipio, del portal de la CM."""
    df = pd.read_csv(RAW / "cm_municipios.csv", sep=";", encoding="cp1252", dtype=str)
    # El código INE del portal lleva un dígito de control al final (280014): se quita
    df["ine"] = df["municipio_codigo_ine"].str[:5]
    df["zona"] = df["nuts4_nombre"]
    df["superficie_km2"] = df["superficie_km2"].astype(float)
    return df[["ine", "zona", "superficie_km2"]]


def calcular_tendencia(df: pd.DataFrame) -> pd.DataFrame:
    """Tasa anual 2015-2025 de cada municipio, suavizada hacia la de su zona.

    Estimador bayesiano empírico (en palabras sencillas: una media ponderada):
        g_suavizada = w * g_propia + (1 - w) * g_zona,   w = P / (P + K)
    Así un pueblo minúsculo con un año raro no da una tasa disparatada.
    """
    a0, a1 = ANIOS_TENDENCIA
    anios = a1 - a0
    df = df.copy()
    df["g_propia"] = (df[a1] / df[a0]) ** (1 / anios) - 1

    # Tasa de cada zona, calculada solo con los municipios del universo
    zona = df.groupby("zona")[[a0, a1]].sum()
    zona["g_zona"] = (zona[a1] / zona[a0]) ** (1 / anios) - 1
    df = df.merge(zona[["g_zona"]], left_on="zona", right_index=True)

    w = df[a0] / (df[a0] + K_SUAVIZADO)
    df["g_suavizada"] = w * df["g_propia"] + (1 - w) * df["g_zona"]
    return df


def preparar_limites(universo: set[str], nombres: dict[str, str]) -> dict:
    """Une los enclaves de cada municipio, simplifica los contornos y los pasa a GeoJSON ligero."""
    gdf = gpd.read_file(RAW / "idem_limites_municipales.geojson")
    gdf = gdf.dissolve(by="CD_INE", as_index=False)[["CD_INE", "geometry"]]
    # Simplificar en metros (UTM 30N) y volver a grados para el mapa web
    gdf = gdf.to_crs(25830)
    gdf["geometry"] = gdf.simplify(60, preserve_topology=True)
    gdf = gdf.to_crs(4326)
    gdf["ine"] = gdf["CD_INE"]
    gdf["nombre"] = gdf["ine"].map(nombres)
    gdf["universo"] = gdf["ine"].isin(universo)
    geo = json.loads(gdf[["ine", "nombre", "universo", "geometry"]].to_json(drop_id=True))
    redondear_coordenadas(geo, 5)  # 5 decimales ≈ 1 metro: sobra para el mapa
    return geo


def redondear_coordenadas(geo: dict, decimales: int) -> None:
    def r(c):
        return [r(x) for x in c] if isinstance(c[0], list) else [round(v, decimales) for v in c]

    for f in geo["features"]:
        f["geometry"]["coordinates"] = r(f["geometry"]["coordinates"])


COLUMNAS_CAPACIDAD = [
    "viv_principales", "viv_no_principales", "personas_hogar", "viv_previstas", "suelo_pendiente_ha",
    "colegios_primaria", "colegios_secundaria", "ninos_primaria", "ninos_secundaria", "zbs_codigo", "zbs_nombre", "zbs_poblacion",
]


def anadir_capacidad(df: pd.DataFrame, pob: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Une vivienda, planeamiento, colegios y sanidad (ver capacidad.py). Devuelve también las zonas de salud."""
    sanidad, zonas = capacidad.leer_sanidad(pob)
    df = (df.merge(capacidad.leer_viviendas(), on="ine", how="left")
            .merge(capacidad.leer_planeamiento(), on="ine", how="left")
            .merge(capacidad.leer_colegios(), on="ine", how="left")
            .merge(capacidad.leer_ninos(pob), on="ine", how="left")
            .merge(sanidad, on="ine", how="left"))
    df[["viv_previstas", "suelo_pendiente_ha", "colegios_primaria", "colegios_secundaria"]] = (
        df[["viv_previstas", "suelo_pendiente_ha", "colegios_primaria", "colegios_secundaria"]].fillna(0))
    # Personas por hogar del municipio (Censo 2021): sirve para pasar viviendas a personas
    df["personas_hogar"] = (df[2021] / df["hogares_2021"]).round(3)
    return df, zonas


def anadir_hospital(df: pd.DataFrame) -> pd.DataFrame:
    """Núcleo de cada municipio y distancia en línea recta al hospital general público más cercano.

    - Hospitales: registro de centros sanitarios de la CM, «Hospital general» que dependen
      del servicio de salud de la Comunidad. El CSV repite cada centro una vez por servicio.
    - Núcleo del municipio: mediana de las coordenadas de sus colegios (donde vive la gente);
      si no tiene colegios, el centroide de su término municipal.
      Se exporta en km (UTM 30N) para que la web mida la distancia entre pueblos al reubicar.
    - En línea recta, no tiempo real: es una aproximación (ver «Cómo se calcula»).
    """
    s = pd.read_csv(RAW / "cm_centros_sanitarios.csv", sep=";", encoding="utf-8-sig", dtype=str)
    s = s[(s["centro_tipo"] == "Hospital general")
          & (s["dependecia_funcional"] == "Servicios o Institutos de Salud de las CC.AA")]
    s = s.drop_duplicates("centro_nro_registro")
    hosp = gpd.GeoDataFrame(geometry=gpd.points_from_xy(s["localizacion_coordenada_x"].astype(float),
                                                        s["localizacion_coordenada_y"].astype(float)), crs=25830)

    mun = gpd.read_file(RAW / "idem_limites_municipales.geojson").dissolve(by="CD_INE", as_index=False).to_crs(25830)
    mun = mun.rename(columns={"CD_INE": "ine"})[["ine", "geometry"]]
    # Municipio de cada hospital: el término municipal en el que cae el punto
    hosp = gpd.sjoin(hosp, mun, how="left", predicate="within")
    nombres = dict(zip(df["ine"], df["nombre"]))
    print(f"Hospitales generales públicos: {len(hosp)}")

    c = pd.read_csv(RAW / "cm_centros_educativos.csv", sep=";", encoding="utf-8-sig", dtype=str)
    c = c[(c["SITUACIÓN"] == "ALTA") & c["UTM_X"].notna() & c["UTM_Y"].notna()]
    tipo = c["TIPO_EXT"].str.strip()
    c = c[tipo.isin(capacidad.TIPOS_PRIMARIA | capacidad.TIPOS_SECUNDARIA)]  # mismos colegios que capacidad.py
    c["ine"] = "28" + c["CDMUNI"].str.zfill(3)
    nucleo = c.assign(x=c["UTM_X"].astype(float), y=c["UTM_Y"].astype(float)).groupby("ine")[["x", "y"]].median()
    centro = mun.set_index("ine").centroid
    nucleo = nucleo.reindex(mun["ine"])
    nucleo["x"] = nucleo["x"].fillna(centro.x)
    nucleo["y"] = nucleo["y"].fillna(centro.y)

    distancia, cual = cKDTree(np.column_stack([hosp.geometry.x, hosp.geometry.y])).query(nucleo[["x", "y"]].to_numpy())
    out = pd.DataFrame({
        "ine": nucleo.index,
        "nucleo_x": (nucleo["x"] / 1000).round(2).to_numpy(),
        "nucleo_y": (nucleo["y"] / 1000).round(2).to_numpy(),
        "hospital_km": (distancia / 1000).round(1),
        "hospital_municipio": hosp["ine"].iloc[cual].map(nombres).to_numpy(),
    })
    return df.merge(out, on="ine", how="left")


def limpio(v):
    """Convierte valores de pandas/numpy a algo que JSON entienda (y redondea)."""
    if pd.isna(v):
        return None
    if isinstance(v, str):
        return v
    return round(float(v), 3)


def main() -> None:
    pob = leer_poblacion()
    df = pob.merge(leer_zonas(), on="ine", how="left")
    df["universo"] = df[ANIO_BASE] < LIMITE_HABITANTES
    uni = calcular_tendencia(df[df["universo"]])
    df = df.merge(uni[["ine", "g_propia", "g_zona", "g_suavizada"]], on="ine", how="left")
    df, zonas = anadir_capacidad(df, pob)
    df = anadir_hospital(df)

    n = int(df["universo"].sum())
    hab = int(df.loc[df["universo"], ANIO_BASE].sum())
    print(f"Universo: {n} municipios con < {miles(LIMITE_HABITANTES)} hab.; suman {miles(hab)}")

    anios = [c for c in df.columns if isinstance(c, int)]
    registros = []
    for _, f in df.iterrows():
        registros.append({
            "ine": f["ine"],
            "nombre": f["nombre"],
            "zona": f["zona"],
            "superficie_km2": f["superficie_km2"],
            "universo": bool(f["universo"]),
            "poblacion": {str(a): int(f[a]) for a in anios if pd.notna(f[a])},
            "g_propia": None if pd.isna(f["g_propia"]) else round(f["g_propia"], 6),
            "g_zona": None if pd.isna(f["g_zona"]) else round(f["g_zona"], 6),
            "g_suavizada": None if pd.isna(f["g_suavizada"]) else round(f["g_suavizada"], 6),
            "nucleo_x": float(f["nucleo_x"]),
            "nucleo_y": float(f["nucleo_y"]),
            "hospital_km": float(f["hospital_km"]),
            "hospital_municipio": f["hospital_municipio"],
            "capacidad": None if not f["universo"] else {c: limpio(f[c]) for c in COLUMNAS_CAPACIDAD},
        })

    WEB_DATOS.mkdir(parents=True, exist_ok=True)
    OUT.mkdir(parents=True, exist_ok=True)
    (WEB_DATOS / "municipios.json").write_text(json.dumps(registros, ensure_ascii=False), encoding="utf-8")

    (WEB_DATOS / "zonas_salud.json").write_text(
        json.dumps(zonas.to_dict(orient="records"), ensure_ascii=False, default=int), encoding="utf-8")

    limites = preparar_limites(set(df.loc[df["universo"], "ine"]), dict(zip(df["ine"], df["nombre"])))
    (WEB_DATOS / "limites.geojson").write_text(json.dumps(limites, ensure_ascii=False), encoding="utf-8")

    columnas = ["ine", "nombre", "zona", "superficie_km2", "universo", *anios, "g_propia", "g_zona", "g_suavizada",
                *COLUMNAS_CAPACIDAD, "nucleo_x", "nucleo_y", "hospital_km", "hospital_municipio"]
    diccionario.comprobar("tabla_maestra.csv", columnas)
    df[columnas].to_csv(OUT / "tabla_maestra.csv", index=False, encoding="utf-8")
    diccionario.escribir()
    shutil.copyfile(OUT / "tabla_maestra.csv", WEB_DATOS / "tabla_maestra.csv")

    for nombre in ("municipios.json", "limites.geojson"):
        print(f"  {nombre}: {(WEB_DATOS / nombre).stat().st_size / 1e3:.0f} KB")


if __name__ == "__main__":
    main()
