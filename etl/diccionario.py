"""Diccionario de datos de data/out (columna, descripción, unidad, fuente y URL).

Lo escribe preparar.py en data/out/diccionario.csv. preparar.py y validacion.py comprueban
que cada columna que escriben está aquí, para que el diccionario no se desfase.
"""
import pandas as pd

from comun import OUT

PADRON = ("INE, Padrón continuo (tabla 2881)", "https://www.ine.es/jaxiT3/Tabla.htm?t=2881")
VIVIENDAS = ("INE, Censo 2021 (tabla 59525)", "https://www.ine.es/jaxi/Tabla.htm?tpx=59525&L=0")
HOGARES = ("INE, Censo 2021 (tablas 59543 y 2881)", "https://www.ine.es/jaxi/Tabla.htm?tpx=59543&L=0")
MUNICIPIOS = ("Portal de Datos Abiertos de la Comunidad de Madrid, Municipios",
              "https://datos.comunidad.madrid/dataset/0781c37e-bc64-4143-8029-18865bedbc3d")
COLEGIOS = ("Portal de Datos Abiertos de la Comunidad de Madrid, Centros educativos",
            "https://datos.comunidad.madrid/dataset/c750856d-3166-4dac-8e80-d1b824c968b5")
ZONAS_SALUD = ("Portal de Datos Abiertos de la Comunidad de Madrid, Zonas básicas de salud",
               "https://datos.comunidad.madrid/dataset/924044d0-b75e-402c-8c13-96ace11da0ff")
SANITARIOS = ("Portal de Datos Abiertos de la Comunidad de Madrid, Centros sanitarios; IDEM, límites municipales",
              "https://datos.comunidad.madrid/dataset/d8a0a444-adf5-4c04-8999-0eac3de52cb7")
NUCLEO = ("Portal de Datos Abiertos de la Comunidad de Madrid, Centros educativos; IDEM, límites municipales",
          "https://datos.comunidad.madrid/dataset/c750856d-3166-4dac-8e80-d1b824c968b5")
PLANEAMIENTO = ("IDEM, Planeamiento urbanístico refundido 2025",
                "https://idem.comunidad.madrid/recursos_cat_geo/Catalogo/recursos/Planeamiento/Refundido/vpla_ref_25_gpkg.zip")
CABIDA = ("Cálculo de CABIDA (etl/validacion.py) a partir del Padrón", "https://www.ine.es/jaxiT3/Tabla.htm?t=2881")

# archivo -> [(columna, descripción, unidad, (fuente, url))]
DICCIONARIO: dict[str, list[tuple[str, str, str, tuple[str, str]]]] = {
    "tabla_maestra.csv": [
        ("ine", "Código INE del municipio (5 cifras). Clave para cruzar con otros datos", "código", PADRON),
        ("nombre", "Nombre del municipio", "texto", PADRON),
        ("zona", "Zona estadística de la Comunidad de Madrid (NUTS4)", "texto", MUNICIPIOS),
        ("superficie_km2", "Superficie del término municipal", "km²", MUNICIPIOS),
        ("universo", "True si tenía menos de 50.000 habitantes el 1/1/2025 (los 155 municipios del reto)", "sí/no", PADRON),
        ("2005…2025", "Una columna por año: población a 1 de enero (cifras oficiales del Padrón)", "personas", PADRON),
        ("g_propia", "Tasa de crecimiento anual 2015-2025 del municipio", "tanto por uno al año", PADRON),
        ("g_zona", "Tasa de crecimiento anual 2015-2025 de su zona estadística (solo municipios del reto)", "tanto por uno al año", PADRON),
        ("g_suavizada", "Mezcla de las dos: peso × g_propia + (1 − peso) × g_zona, con peso = población 2015 ÷ (población 2015 + 5.000)",
         "tanto por uno al año", PADRON),
        ("viv_principales", "Viviendas principales (donde vive un hogar habitualmente)", "viviendas", VIVIENDAS),
        ("viv_no_principales", "Viviendas no principales: vacías o de segunda residencia", "viviendas", VIVIENDAS),
        ("personas_hogar", "Personas por hogar: población 2021 ÷ hogares del Censo 2021", "personas por hogar", HOGARES),
        ("viv_previstas", "Viviendas previstas en suelo aún pendiente de desarrollar (urbanizable o urbano no consolidado)",
         "viviendas", PLANEAMIENTO),
        ("suelo_pendiente_ha", "Superficie de ese suelo pendiente de desarrollar", "hectáreas", PLANEAMIENTO),
        ("colegios_primaria", "Centros educativos en funcionamiento que dan primaria", "centros", COLEGIOS),
        ("colegios_secundaria", "Centros educativos en funcionamiento que dan secundaria", "centros", COLEGIOS),
        ("zbs_codigo", "Código de la zona básica de salud a la que se asigna (la que cubre más superficie del municipio)",
         "código", ZONAS_SALUD),
        ("zbs_nombre", "Nombre de esa zona básica de salud", "texto", ZONAS_SALUD),
        ("zbs_poblacion", "Población que atiende la zona: Padrón 2019 actualizado con el crecimiento 2019-2025 de su municipio principal",
         "personas", ZONAS_SALUD),
        ("nucleo_x", "Núcleo del municipio, coordenada X: mediana de sus colegios de primaria o secundaria "
         "(si no tiene, centroide del término). Sirve para medir distancias entre pueblos", "km (UTM 30N, ETRS89)", NUCLEO),
        ("nucleo_y", "Núcleo del municipio, coordenada Y (ver nucleo_x)", "km (UTM 30N, ETRS89)", NUCLEO),
        ("hospital_km", "Distancia en línea recta desde el núcleo del municipio (mediana de sus colegios; si no tiene, "
         "centroide del término) hasta el hospital general público más cercano de la Comunidad de Madrid", "km", SANITARIOS),
        ("hospital_municipio", "Municipio en el que está ese hospital", "texto", SANITARIOS),
    ],
    "validacion_municipios.csv": [
        ("ine", "Código INE del municipio (5 cifras)", "código", PADRON),
        ("nombre", "Nombre del municipio", "texto", PADRON),
        ("poblacion_2015", "Población a 1/1/2015", "personas", PADRON),
        ("crecimiento_real", "Lo que creció de verdad entre 2015 y 2025", "personas", PADRON),
        ("crecimiento_previsto", "Lo que preveía el modelo de CABIDA con datos solo hasta 2015", "personas", CABIDA),
        ("error", "crecimiento_previsto − crecimiento_real (positivo = el modelo se pasó)", "personas", CABIDA),
    ],
}


def columnas(archivo: str) -> set[str]:
    return {c for c, *_ in DICCIONARIO[archivo]}


def comprobar(archivo: str, cols: list) -> None:
    """Falla si alguna columna escrita no está en el diccionario (los años van juntos en «2005…2025»)."""
    faltan = [c for c in cols if not isinstance(c, int) and str(c) not in columnas(archivo)]
    if faltan:
        raise SystemExit(f"Columnas de {archivo} sin describir en diccionario.py: {faltan}")


def escribir() -> None:
    filas = [{"archivo": a, "columna": c, "descripcion": d, "unidad": u, "fuente": f, "url": url}
             for a, lista in DICCIONARIO.items() for c, d, u, (f, url) in lista]
    pd.DataFrame(filas).to_csv(OUT / "diccionario.csv", index=False, encoding="utf-8")
