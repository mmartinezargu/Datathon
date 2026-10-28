"""Prepara los «ingredientes» de cada municipio para la web de CABIDA.

Uso (desde etl/):  uv run preparar.py

Salidas:
  web/public/datos/municipios.json   datos por municipio que lee la web
  web/public/datos/limites.geojson   contornos simplificados para el mapa
  data/out/tabla_maestra.csv         lo mismo en CSV (licencia CC BY 4.0)
  data/out/obras_referencia.csv      obras reales que dan los costes por defecto del plan (obras_referencia.py)
  web/public/datos/obras_referencia.json  lo mismo, con la mediana de cada tipo de obra, para la web
  data/out/diccionario.csv           qué es cada columna de los CSV de data/out y del CSV del escenario
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
import obras_referencia
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
    "viv_principales", "viv_no_principales", "viv_vacias", "viv_vacias_sin_dato", "personas_hogar", "viv_previstas", "viv_previstas_estimadas",
    "viv_previstas_con_estimacion", "suelo_pendiente_ha",
    "colegios_primaria", "colegios_secundaria", "ninos_primaria", "ninos_secundaria",
    "alumnos_primaria", "alumnos_secundaria", "alumnos_estimados", "zbs_codigo", "zbs_nombre", "zbs_poblacion",
]


def anadir_capacidad(df: pd.DataFrame, pob: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Une vivienda, planeamiento, colegios y sanidad (ver capacidad.py). Devuelve también las zonas de salud."""
    sanidad, zonas = capacidad.leer_sanidad(pob)
    ambitos = capacidad.leer_ambitos_pendientes()
    df = (df.merge(capacidad.leer_viviendas(), on="ine", how="left")
            .merge(capacidad.leer_planeamiento(ambitos), on="ine", how="left")
            .merge(capacidad.leer_colegios(), on="ine", how="left")
            .merge(capacidad.leer_ninos(pob), on="ine", how="left")
            .merge(capacidad.leer_alumnos()[0], on="ine", how="left")
            .merge(sanidad, on="ine", how="left"))
    df[["viv_previstas", "suelo_pendiente_ha", "colegios_primaria", "colegios_secundaria"]] = (
        df[["viv_previstas", "suelo_pendiente_ha", "colegios_primaria", "colegios_secundaria"]].fillna(0))
    df = estimar_suelo_sin_cifra(df, ambitos)
    # Viviendas vacías (consumo eléctrico, INE 59531). Si el INE no da la cifra del municipio, se estiman:
    # no principales × (vacías ÷ no principales) de su zona estadística, con los municipios de la zona que sí
    # tienen dato. Se marca en viv_vacias_sin_dato
    df["viv_vacias_sin_dato"] = df["viv_vacias_ine"].isna()
    con = df[~df["viv_vacias_sin_dato"]].groupby("zona")[["viv_vacias_ine", "viv_no_principales"]].sum()
    vacias_zona = con["viv_vacias_ine"] / con["viv_no_principales"]
    estimadas = (df["viv_no_principales"] * df["zona"].map(vacias_zona)).round()
    df["viv_vacias"] = df["viv_vacias_ine"].fillna(estimadas)
    sin = df[df["universo"] & df["viv_vacias_sin_dato"]]
    print(f"Viviendas vacías: sin dato del INE en {len(sin)} de los {int(df['universo'].sum())} municipios del reto; "
          f"se estiman con su zona: {miles(sin['viv_vacias'].sum())} (no principales: {miles(sin['viv_no_principales'].sum())})")
    if df.loc[df["universo"], "viv_vacias"].isna().any():
        raise SystemExit("Hay municipios del reto sin viviendas vacías: su zona no tiene ningún municipio con dato")
    # Alumnos matriculados (ALMUDENA). Si tiene colegio de un nivel pero ALMUDENA no le da alumnos
    # (colegio nuevo o dato que falta), se usan los niños estimados por edad, pasados a alumnos con la
    # relación alumnos ÷ niños de los demás municipios del reto, y se marca en alumnos_estimados
    df["alumnos_estimados"] = False
    for nivel in ("primaria", "secundaria"):
        col, ninos, alumnos = df[f"colegios_{nivel}"], df[f"ninos_{nivel}"], df[f"alumnos_{nivel}"].fillna(0)
        ambos = df["universo"] & (col > 0) & (alumnos > 0) & (ninos > 0)
        relacion = alumnos[ambos].sum() / ninos[ambos].sum()
        falta = (col > 0) & (alumnos <= 0)
        df[f"alumnos_{nivel}"] = alumnos.where(~falta, (ninos * relacion).round())
        df["alumnos_estimados"] |= falta
        print(f"Alumnos de {nivel}: {int(falta[df['universo']].sum())} municipios del reto con colegio y sin alumnos "
              f"en ALMUDENA (se estiman con {relacion:.2f} alumnos por niño de esa edad)")
    # Personas por hogar del municipio (Censo 2021): sirve para pasar viviendas a personas
    df["personas_hogar"] = (df[2021] / df["hogares_2021"]).round(3)
    return df, zonas


def estimar_suelo_sin_cifra(df: pd.DataFrame, ambitos: pd.DataFrame) -> pd.DataFrame:
    """Viviendas del suelo residencial pendiente que el planeamiento deja sin cifra.

    Se estiman con la densidad (viviendas/ha) de los ámbitos residenciales que sí la traen:
    1. los del mismo municipio y clase de suelo (viviendas ÷ hectáreas de todos ellos);
    2. si no hay, la mediana de los de su zona estadística;
    3. si tampoco, la mediana de toda la Comunidad.
    El suelo industrial, terciario, de equipamientos, etc. no se cuenta. Se suman a viv_previstas;
    viv_previstas_estimadas dice cuántas son estimadas y viv_previstas_con_estimacion marca el municipio.
    """
    res = ambitos[ambitos["residencial"]].merge(df[["ine", "zona"]], on="ine", how="left")
    con = res[res["viviendas"].notna() & (res["ha"] > 0)].assign(densidad=lambda d: d["viviendas"] / d["ha"])
    por_clase = con.groupby(["ine", "clase"])[["viviendas", "ha"]].sum()
    por_clase = (por_clase["viviendas"] / por_clase["ha"]).rename("d_municipio")
    sin = (res[res["viviendas"].isna()]
           .merge(por_clase, left_on=["ine", "clase"], right_index=True, how="left")
           .merge(con.groupby("zona")["densidad"].median().rename("d_zona"), left_on="zona", right_index=True, how="left"))
    sin["densidad"] = sin["d_municipio"].fillna(sin["d_zona"]).fillna(con["densidad"].median())
    sin["origen"] = np.select([sin["d_municipio"].notna(), sin["d_zona"].notna()], ["municipio", "zona"], "comunidad")
    sin["estimadas"] = sin["densidad"] * sin["ha"]

    estimadas = sin.groupby("ine")["estimadas"].sum().round()
    df["viv_previstas_estimadas"] = df["ine"].map(estimadas).fillna(0)
    df["viv_previstas"] = df["viv_previstas"] + df["viv_previstas_estimadas"]
    df["viv_previstas_con_estimacion"] = df["viv_previstas_estimadas"] > 0

    del_reto = df.loc[df["universo"], "ine"]
    reto = sin[sin["ine"].isin(del_reto)]
    no_res = ambitos[~ambitos["residencial"] & ambitos["viviendas"].isna() & ambitos["ine"].isin(del_reto)]
    print(f"Suelo residencial sin cifra de viviendas en los municipios del reto: {len(reto)} ámbitos "
          f"({miles(reto['ha'].sum())} ha) → {miles(reto['estimadas'].sum())} viviendas estimadas en "
          f"{int(df.loc[df['universo'], 'viv_previstas_con_estimacion'].sum())} municipios (densidad del municipio "
          f"en {(reto['origen'] == 'municipio').sum()}, de la zona en {(reto['origen'] == 'zona').sum()}, "
          f"de la Comunidad en {(reto['origen'] == 'comunidad').sum()}). Sin cifra y no residencial, no se cuenta: "
          f"{len(no_res)} ámbitos ({miles(no_res['ha'].sum())} ha)")
    return df


def terminos_municipales() -> gpd.GeoDataFrame:
    """Términos municipales (IDEM), uno por código INE, en UTM 30N."""
    mun = gpd.read_file(RAW / "idem_limites_municipales.geojson").dissolve(by="CD_INE", as_index=False).to_crs(25830)
    return mun.rename(columns={"CD_INE": "ine"})[["ine", "geometry"]]


def hospitales(mun: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    """Hospitales generales públicos de la CM, con el municipio (`ine`) en el que caen, en UTM 30N.

    Registro de centros sanitarios de la CM: «Hospital general» que dependen del servicio de
    salud de la Comunidad. El CSV repite cada centro una vez por servicio.
    """
    s = pd.read_csv(RAW / "cm_centros_sanitarios.csv", sep=";", encoding="utf-8-sig", dtype=str)
    s = s[(s["centro_tipo"] == "Hospital general")
          & (s["dependecia_funcional"] == "Servicios o Institutos de Salud de las CC.AA")]
    s = s.drop_duplicates("centro_nro_registro")
    hosp = gpd.GeoDataFrame({"registro": s["centro_nro_registro"].to_numpy()},
                            geometry=gpd.points_from_xy(s["localizacion_coordenada_x"].astype(float),
                                                        s["localizacion_coordenada_y"].astype(float)), crs=25830)
    # Municipio de cada hospital: el término municipal en el que cae el punto
    return gpd.sjoin(hosp, mun, how="left", predicate="within").drop(columns="index_right").reset_index(drop=True)


def nucleos(mun: gpd.GeoDataFrame) -> pd.DataFrame:
    """Núcleo de cada municipio, en metros (UTM 30N), con índice `ine`.

    Mediana de las coordenadas de sus colegios (donde vive la gente); si no tiene colegios,
    el centroide de su término municipal.
    """
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
    return nucleo


def anadir_hospital(df: pd.DataFrame) -> pd.DataFrame:
    """Núcleo de cada municipio y hospital general público más cercano, de dos formas.

    - En línea recta (hospital_km): el hospital más cercano en km, desde el núcleo.
      El núcleo se exporta en km (UTM 30N) para que la web mida la distancia entre pueblos al reubicar.
    - En coche, sin tráfico (hospital_min): el hospital más cercano por tiempo, que puede ser otro.
      Lo calcula tiempos.py con OSRM (data/raw/tiempos_osrm.json), junto con los minutos entre
      los pueblos del reto (vecinos_min).
    """
    mun = terminos_municipales()
    hosp = hospitales(mun)
    nombres = dict(zip(df["ine"], df["nombre"]))
    print(f"Hospitales generales públicos: {len(hosp)}")
    nucleo = nucleos(mun)

    distancia, cual = cKDTree(np.column_stack([hosp.geometry.x, hosp.geometry.y])).query(nucleo[["x", "y"]].to_numpy())
    out = pd.DataFrame({
        "ine": nucleo.index,
        "nucleo_x": (nucleo["x"] / 1000).round(2).to_numpy(),
        "nucleo_y": (nucleo["y"] / 1000).round(2).to_numpy(),
        "hospital_km": (distancia / 1000).round(1),
        "hospital_municipio": hosp["ine"].iloc[cual].map(nombres).to_numpy(),
    })

    archivo = RAW / "tiempos_osrm.json"
    if not archivo.exists():
        raise SystemExit(f"Falta {archivo.name}: ejecuta antes «uv run tiempos.py» (minutos en coche con OSRM)")
    t = json.loads(archivo.read_text(encoding="utf-8"))
    out["hospital_min"] = out["ine"].map(lambda i: t["hospital"][i]["min"])
    out["hospital_min_municipio"] = out["ine"].map(lambda i: nombres.get(t["hospital"][i]["ine"]))
    # Minutos desde cada pueblo del reto hasta los demás a 60 min o menos (del más cercano al más lejano)
    out["vecinos_min"] = out["ine"].map(lambda i: t["vecinos"].get(i, {}))
    otro = (out["hospital_min_municipio"] != out["hospital_municipio"]).sum()
    print(f"Minutos en coche (OSRM, {t['fecha']}): en {otro} municipios el hospital más cercano por tiempo "
          f"está en otro municipio que el más cercano en línea recta")
    return df.merge(out, on="ine", how="left")


def limpio(v):
    """Convierte valores de pandas/numpy a algo que JSON entienda (y redondea)."""
    if pd.isna(v):
        return None
    if isinstance(v, (str, bool, np.bool_)):
        return v if isinstance(v, str) else bool(v)
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
            "hospital_min": float(f["hospital_min"]),
            "hospital_min_municipio": f["hospital_min_municipio"],
            "vecinos_min": f["vecinos_min"],
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
                *COLUMNAS_CAPACIDAD, "nucleo_x", "nucleo_y", "hospital_km", "hospital_municipio",
                "hospital_min", "hospital_min_municipio", "vecinos_min"]
    diccionario.comprobar("tabla_maestra.csv", columnas)
    tabla = df[columnas].copy()
    # En el CSV, los vecinos van como texto JSON ({"28002": 12.3, ...}); vacío si no es del reto
    tabla["vecinos_min"] = tabla["vecinos_min"].map(lambda v: json.dumps(v) if v else "")
    tabla.to_csv(OUT / "tabla_maestra.csv", index=False, encoding="utf-8")
    obras_referencia.escribir()
    diccionario.escribir()
    shutil.copyfile(OUT / "tabla_maestra.csv", WEB_DATOS / "tabla_maestra.csv")

    for nombre in ("municipios.json", "limites.geojson"):
        print(f"  {nombre}: {(WEB_DATOS / nombre).stat().st_size / 1e3:.0f} KB")


if __name__ == "__main__":
    main()
