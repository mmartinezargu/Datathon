"""Ingredientes de la capacidad de cada municipio: vivienda, colegios y sanidad.

Python deja preparados los datos fijos (cuántas viviendas, colegios, centros…)
La web (motor.ts) calcula los umbrales y la cuenta final con las palancas del usuario.
"""
import geopandas as gpd
import pandas as pd
import pyogrio

from comun import RAW

# ---------- Vivienda ----------

def leer_viviendas() -> pd.DataFrame:
    """Censo 2021 (INE): viviendas principales y no principales, y hogares."""
    def censo(archivo, columna):
        df = pd.read_csv(RAW / archivo, sep=";", encoding="utf-8-sig", thousands=".", dtype={"Total": "Int64"})
        df = df[df["Municipios"].fillna("").str.match(r"^28\d{3} ")]
        df["ine"] = df["Municipios"].str[:5]
        return df.pivot_table(index="ine", columns=columna, values="Total", aggfunc="sum")

    viv = censo("ine_59525_viviendas_censo2021.csv", "Tipo de vivienda (principal o no)")
    hog = censo("ine_59543_hogares_censo2021.csv", "Tamaño del hogar")
    out = pd.DataFrame({
        "viv_principales": viv["Vivienda principal"],
        "viv_no_principales": viv["Vivienda no principal"],
        "hogares_2021": hog["Total (tamaño del hogar)"],
    })
    return out.reset_index()


def leer_planeamiento() -> pd.DataFrame:
    """Viviendas previstas en suelo aún pendiente de desarrollar (planeamiento refundido 2025, IDEM).

    Pendiente = suelo urbanizable, apto para urbanizar, de reserva o urbano no consolidado,
    también si está "aplazado". Se excluye lo ya "incorporado" a la ciudad y el no urbanizable.
    """
    a = pyogrio.read_dataframe(RAW / "vpla_ref_25_gpkg.gpkg", layer="VPLA_AMBITOS_REF", read_geometry=False)
    clase = a["DS_CLAS_SUE"].fillna("")
    pendiente = (
        clase.str.contains("Urbanizable|Apto Para Urbanizar|Reserva Urbana|No Consolidado")
        & ~clase.str.contains("No Urbanizable")
        & ~clase.str.contains("INCORPORADO")
    )
    a = a[pendiente].copy()
    a["ine"] = "28" + a["CD_MUNICIPIO"].str[-3:]
    ambitos = a.groupby(["ine", "DS_NOMB_AMB", "DS_CLAS_SUE"]).agg(
        viv_previstas=("NM_VIV_TOT", viviendas_ambito), suelo_pendiente_ha=("NM_AREA", lambda s: s.sum() / 1e4))
    return ambitos.groupby("ine").sum().reset_index()


def viviendas_ambito(v: pd.Series) -> float:
    """Un ámbito partido en varios polígonos repite sus viviendas en cada uno: si todos traen
    la misma cifra se cuenta una vez; si traen cifras distintas, se suman las distintas
    (4 ámbitos en la capa de 2025, p. ej. «S-R8 LOS HUEROS» de Villalbilla: 2.832 ×3 y 3.802)."""
    return v.dropna().drop_duplicates().sum()


# ---------- Colegios ----------

# Tipos de centro (TIPO_EXT) que cuentan como colegio de cada nivel. Fuera: educación de adultos,
# aulas hospitalarias y centros de enseñanzas artísticas, aunque den algún curso de primaria o secundaria.
TIPOS_PRIMARIA = {
    "COLEGIO DE EDUCACIÓN PRIMARIA",
    "COLEGIO DE EDUCACIÓN INFANTIL Y PRIMARIA",
    "COLEGIO DE EDUCACIÓN INFANTIL, PRIMARIA Y SECUNDARIA",
    "CENTRO PRIVADO DE EDUCACIÓN PRIMARIA",
    "CENTRO PRIVADO DE EDUCACIÓN INFANTIL Y PRIMARIA",
    "CENTRO PRIVADO DE EDUCACIÓN PRIMARIA Y SECUNDARIA",
    "CENTRO PRIVADO DE EDUCACIÓN INFANTIL, PRIMARIA Y SECUNDARIA",
}
TIPOS_SECUNDARIA = {
    "INSTITUTO DE EDUCACIÓN SECUNDARIA",
    "COLEGIO DE EDUCACIÓN INFANTIL, PRIMARIA Y SECUNDARIA",
    "CENTRO PRIVADO DE EDUCACIÓN SECUNDARIA",
    "CENTRO PRIVADO DE INFANTIL Y SECUNDARIA",
    "CENTRO PRIVADO DE EDUCACIÓN PRIMARIA Y SECUNDARIA",
    "CENTRO PRIVADO DE EDUCACIÓN INFANTIL, PRIMARIA Y SECUNDARIA",
}


def leer_colegios() -> pd.DataFrame:
    """Centros educativos en alta (portal de la CM) que dan primaria o secundaria."""
    c = pd.read_csv(RAW / "cm_centros_educativos.csv", sep=";", encoding="utf-8-sig", dtype=str)
    c = c[c["SITUACIÓN"] == "ALTA"]
    c["ine"] = "28" + c["CDMUNI"].str.zfill(3)
    tipo = c["TIPO_EXT"].str.strip()
    c["primaria"] = tipo.isin(TIPOS_PRIMARIA)
    c["secundaria"] = tipo.isin(TIPOS_SECUNDARIA)
    return (c.groupby("ine")[["primaria", "secundaria"]].sum()
             .rename(columns={"primaria": "colegios_primaria", "secundaria": "colegios_secundaria"})
             .reset_index())


# ---------- Sanidad ----------

def leer_sanidad(pob: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Zona básica de salud de cada municipio y cuánta gente atiende.

    - Cada zona básica de salud tiene su centro de salud (es la zona que atiende
      un equipo de atención primaria). No se cuentan centros en el registro sanitario
      porque ahí muchos aparecen como "consultorio" y saldrían zonas sin centro.
    - Cada municipio se asigna a la zona que más superficie suya cubre.
    - La población de la zona viene del Padrón 2019 (en el propio mapa de zonas)
      y se actualiza con el crecimiento 2019-2025 del municipio principal de la zona.
    Devuelve (zona de cada municipio, lista de las 286 zonas con su población).
    El umbral de saturación lo calcula la web, porque es una palanca.
    """
    zbs = gpd.read_file("zip://" + str(RAW / "cm_zonas_basicas_salud.zip") + "!zonas_basicas_salud/zonas_basicas_salud.shp")
    zbs = zbs.to_crs(25830)
    zbs["geometry"] = zbs.buffer(0)  # arregla polígonos mal cerrados
    mun = gpd.read_file(RAW / "idem_limites_municipales.geojson").dissolve(by="CD_INE", as_index=False).to_crs(25830)
    mun = mun.rename(columns={"CD_INE": "ine"})[["ine", "geometry"]]

    # Cruce municipio x zona y superficie de cada trozo
    trozos = gpd.overlay(mun, zbs[["codigo_geo", "zona_basic", "pob_pad19", "geometry"]], how="intersection")
    trozos["area"] = trozos.area
    zona_de_mun = trozos.sort_values("area").groupby("ine").last()[["codigo_geo", "zona_basic"]]
    mun_principal = trozos.sort_values("area").groupby("codigo_geo").last()["ine"]

    factor = pob.set_index("ine")[2025] / pob.set_index("ine")[2019]
    zbs = zbs.set_index("codigo_geo")
    zbs["pob_2025"] = (zbs["pob_pad19"] * mun_principal.map(factor).reindex(zbs.index).fillna(1)).round()
    out = zona_de_mun.join(zbs[["pob_2025"]], on="codigo_geo")
    out = out.rename(columns={"codigo_geo": "zbs_codigo", "zona_basic": "zbs_nombre", "pob_2025": "zbs_poblacion"})
    zonas = zbs.reset_index()[["codigo_geo", "zona_basic", "pob_2025"]].rename(
        columns={"codigo_geo": "codigo", "zona_basic": "nombre", "pob_2025": "poblacion"})
    return out.reset_index(), zonas
