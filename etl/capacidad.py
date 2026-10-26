"""Ingredientes de la capacidad de cada municipio: vivienda, colegios y sanidad.

Python deja preparados los datos fijos (cuántas viviendas, colegios, centros…)
La web (motor.ts) calcula los umbrales y la cuenta final con las palancas del usuario.
"""
import geopandas as gpd
import pandas as pd
import pyogrio

from comun import ANIO_BASE, RAW

# ---------- Vivienda ----------

def leer_viviendas() -> pd.DataFrame:
    """Censo 2021 (INE): viviendas principales y no principales, viviendas vacías y hogares.

    Las vacías salen del consumo eléctrico (tabla 59531): el INE las publica solo para
    los municipios más grandes, así que a algunos les falta (quedan vacías, NaN).
    """
    def censo(archivo, columna):
        df = pd.read_csv(RAW / archivo, sep=";", encoding="utf-8-sig", thousands=".", dtype={"Total": "Int64"})
        df = df[df["Municipios"].fillna("").str.match(r"^28\d{3} ")]
        df["ine"] = df["Municipios"].str[:5]
        return df.pivot_table(index="ine", columns=columna, values="Total", aggfunc="sum")

    viv = censo("ine_59525_viviendas_censo2021.csv", "Tipo de vivienda (principal o no)")
    hog = censo("ine_59543_hogares_censo2021.csv", "Tamaño del hogar")
    vac = censo("ine_59531_viviendas_vacias_censo2021.csv", "Consumo eléctrico")
    out = pd.DataFrame({
        "viv_principales": viv["Vivienda principal"],
        "viv_no_principales": viv["Vivienda no principal"],
        "viv_vacias_ine": vac["Viviendas vacías"].reindex(viv.index),
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


def leer_ninos(pob: pd.DataFrame) -> pd.DataFrame:
    """Niños en edad de primaria (6-11 años) y de secundaria (12-17) en 2025 [est.].

    El Censo anual (CM) da la población por grupos de 5 años, así que se estima:
        primaria   ≈ 0,8 × «5-9» + 0,4 × «10-14»
        secundaria ≈ 0,6 × «10-14» + 0,6 × «15-19»
    De ahí sale la proporción de niños del municipio, que se aplica a su población
    del Padrón 2025 (la misma que usa el resto del modelo).
    """
    e = pd.read_csv(RAW / "cm_poblacion_por_edad_censo_anual.csv", sep=";", encoding="latin-1",
                    dtype={"Código territorio": str})
    e = e[(e["Año"] == ANIO_BASE) & (e["Tipo territorio"] == "Municipios")
          & (e["Nacionalidad"] == "Total") & (e["Sexo"] == "Total")]
    e["ine"] = "28" + e["Código territorio"].str[:3]  # el código del portal lleva un dígito de control
    g = e.pivot_table(index="ine", columns="Edad", values="Valor", aggfunc="sum")
    proporcion = pd.DataFrame({
        "ninos_primaria": 0.8 * g["De 5-9 años"] + 0.4 * g["De 10-14 años"],
        "ninos_secundaria": 0.6 * g["De 10-14 años"] + 0.6 * g["De 15-19 años"],
    }).div(g["Total"], axis=0)
    hoy = pob.set_index("ine")[ANIO_BASE]
    return proporcion.mul(hoy.reindex(proporcion.index), axis=0).round().reset_index()


# Alumnos matriculados (ALMUDENA, IECM): el último año que publica (provisional)
ALUMNOS = {"primaria": "iecm_almudena_501032_alumnos_primaria.csv", "secundaria": "iecm_almudena_501033_alumnos_eso.csv"}


def leer_alumnos() -> tuple[pd.DataFrame, str]:
    """Alumnos matriculados en primaria y en ESO en los colegios de cada municipio (ALMUDENA, IECM).

    Son los alumnos de los centros del municipio, vivan donde vivan: lo que de verdad carga sus colegios.
    El código de municipio de ALMUDENA lleva un dígito de control al final (0014 = 001).
    Devuelve (alumnos_primaria y alumnos_secundaria por municipio, año de los datos).
    """
    out, anio = [], ""
    for nivel, archivo in ALUMNOS.items():
        x = pd.read_csv(RAW / archivo, sep=";", encoding="utf-8-sig", skiprows=1, dtype=str, index_col=False)
        x.columns = ["tipo", "codigo", "nombre", *x.columns[3:]]
        x = x[x["codigo"].fillna("").str.fullmatch(r"\d{4}")]
        anio = x.columns[-1]  # el último año publicado, p. ej. «2024(P)»
        valor = pd.to_numeric(x[anio].str.replace(".", "", regex=False).str.replace(",", ".", regex=False))
        out.append(pd.Series(valor.to_numpy(), index="28" + x["codigo"].str[:3], name=f"alumnos_{nivel}"))
    return pd.concat(out, axis=1).rename_axis("ine").reset_index(), anio


# ---------- Sanidad ----------

def leer_sanidad(pob: pd.DataFrame, anio: int = ANIO_BASE) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Zona básica de salud de cada municipio y cuánta gente atiende.

    - Cada zona básica de salud tiene su centro de salud (es la zona que atiende
      un equipo de atención primaria). No se cuentan centros en el registro sanitario
      porque ahí muchos aparecen como "consultorio" y saldrían zonas sin centro.
    - Cada municipio se asigna a la zona que más superficie suya cubre.
    - La población de la zona viene del Padrón 2019 (en el propio mapa de zonas)
      y se actualiza con el crecimiento 2019-`anio` del municipio principal de la zona
      (2025 en el modelo; validacion.py lo pide a 2021 para compararlo con el Censo).
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

    factor = pob.set_index("ine")[anio] / pob.set_index("ine")[2019]
    zbs = zbs.set_index("codigo_geo")
    zbs["pob_estimada"] = (zbs["pob_pad19"] * mun_principal.map(factor).reindex(zbs.index).fillna(1)).round()
    out = zona_de_mun.join(zbs[["pob_estimada"]], on="codigo_geo")
    out = out.rename(columns={"codigo_geo": "zbs_codigo", "zona_basic": "zbs_nombre", "pob_estimada": "zbs_poblacion"})
    zonas = zbs.reset_index()[["codigo_geo", "zona_basic", "pob_estimada"]].rename(
        columns={"codigo_geo": "codigo", "zona_basic": "nombre", "pob_estimada": "poblacion"})
    return out.reset_index(), zonas
