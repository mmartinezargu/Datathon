"""Diccionario de datos de data/out (columna, descripción, unidad, fuente y URL).

Lo escribe preparar.py en data/out/diccionario.csv. preparar.py y validacion.py comprueban
que cada columna que escriben está aquí, para que el diccionario no se desfase.
"""
import pandas as pd

from comun import OUT

PADRON = ("INE, Padrón continuo (tabla 2881)", "https://www.ine.es/jaxiT3/Tabla.htm?t=2881")
VIVIENDAS = ("INE, Censo 2021 (tabla 59525)", "https://www.ine.es/jaxi/Tabla.htm?tpx=59525&L=0")
VACIAS = ("INE, Censo 2021, viviendas por intensidad de uso según el consumo eléctrico (tabla 59531)",
          "https://www.ine.es/jaxi/Tabla.htm?tpx=59531")
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
EDAD = ("Portal de Datos Abiertos de la Comunidad de Madrid, Población censada por edad (Censo anual) y Padrón (INE)",
        "https://datos.comunidad.madrid/dataset/0a14fbfe-783e-4de3-81b1-ff3792bfd402")
ALUMNOS = ("Instituto de Estadística de la Comunidad de Madrid, ALMUDENA (banco de datos municipal): alumnos matriculados "
           "en educación primaria (tema 501032) y en ESO (tema 501033), último año publicado (2024, provisional)",
           "https://gestiona.comunidad.madrid/desvan/Inicio.icm?enlace=almudena")
OSRM = ("OSRM (router.project-osrm.org, perfil de coche, sin tráfico) sobre OpenStreetMap (© colaboradores de OpenStreetMap, "
        "ODbL); hospitales: Portal de Datos Abiertos de la Comunidad de Madrid, Centros sanitarios", "https://project-osrm.org")
ESCENARIO = ("Cálculo de CABIDA en la web (web/src/motor.ts) con el escenario elegido; se descarga desde «Llévate los datos»", "")
CABIDA = ("Cálculo de CABIDA (etl/validacion.py) a partir del Padrón", "https://www.ine.es/jaxiT3/Tabla.htm?t=2881")
NOTICIAS_CM = ("Comunidad de Madrid, noticias de obras en comunidad.madrid (2023–2026); la de cada obra, en la columna url",
               "https://www.comunidad.madrid/noticias")
RESULTADOS = ("Cálculo de CABIDA con el motor de la web (web/scripts/datasets.ts, npm run datasets): escenario por defecto, "
              "2035, minutos en coche, exigencia media", "https://cabida.vercel.app")
OBRAS_CABIDA = ("Cálculo de CABIDA (etl/obras_referencia.py) a partir de las noticias", "https://www.comunidad.madrid/noticias")

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
        ("viv_vacias", "Viviendas vacías según su consumo eléctrico (Censo 2021). Si el INE no da la cifra del municipio, se estima: "
         "no principales × (vacías ÷ no principales) de su zona estadística, con los municipios de la zona que sí tienen dato "
         "(ver viv_vacias_sin_dato)", "viviendas", VACIAS),
        ("viv_vacias_sin_dato", "True si el INE no publica las viviendas vacías del municipio y viv_vacias es una estimación con su zona",
         "sí/no", VACIAS),
        ("personas_hogar", "Personas por hogar: población 2021 ÷ hogares del Censo 2021", "personas por hogar", HOGARES),
        ("viv_previstas", "Viviendas previstas en suelo aún pendiente de desarrollar (urbanizable o urbano no consolidado). "
         "Un ámbito partido en varios polígonos se cuenta una sola vez. Incluye las estimadas (viv_previstas_estimadas)",
         "viviendas", PLANEAMIENTO),
        ("viv_previstas_estimadas", "[est.] Parte de viv_previstas en suelo residencial que el planeamiento deja sin cifra de "
         "viviendas: hectáreas × viviendas por hectárea de los ámbitos residenciales con cifra del mismo municipio y clase "
         "de suelo; si no hay, la mediana de su zona estadística; si no, la de la Comunidad. Residencial = uso predominante "
         "(DS_US_PRED) residencial, unifamiliar o multifamiliar; el industrial, terciario, etc. sin cifra no cuenta",
         "viviendas", PLANEAMIENTO),
        ("viv_previstas_con_estimacion", "True si el municipio tiene suelo residencial pendiente sin cifra de viviendas "
         "(viv_previstas_estimadas > 0)", "sí/no", PLANEAMIENTO),
        ("suelo_pendiente_ha", "Superficie de ese suelo pendiente de desarrollar", "hectáreas", PLANEAMIENTO),
        ("colegios_primaria", "Centros educativos en funcionamiento que dan primaria (colegios públicos, concertados y privados; "
         "sin educación de adultos, aulas hospitalarias ni enseñanzas artísticas)", "centros", COLEGIOS),
        ("colegios_secundaria", "Centros educativos en funcionamiento que dan secundaria", "centros", COLEGIOS),
        ("ninos_primaria", "[est.] Niños en edad de primaria (6-11 años) en 2025: 0,8 × «5-9 años» + 0,4 × «10-14 años» "
         "del Censo anual, como proporción de la población, aplicada al Padrón 2025. Pasa plazas de colegio a personas "
         "(niños por vecino) y estima los alumnos donde alumnos_estimados", "personas", EDAD),
        ("ninos_secundaria", "[est.] Niños en edad de secundaria (12-17 años) en 2025: 0,6 × «10-14 años» + 0,6 × «15-19 años» "
         "del Censo anual, como proporción de la población, aplicada al Padrón 2025. Pasa plazas de colegio a personas "
         "(niños por vecino) y estima los alumnos donde alumnos_estimados", "personas", EDAD),
        ("alumnos_primaria", "Alumnos matriculados en educación primaria en los colegios del municipio (vivan donde vivan). "
         "Es lo que usa el límite de colegios", "alumnos", ALUMNOS),
        ("alumnos_secundaria", "Alumnos matriculados en ESO en los centros del municipio", "alumnos", ALUMNOS),
        ("alumnos_estimados", "True si tiene colegio de algún nivel pero ALMUDENA no le da alumnos: ese nivel usa los niños estimados "
         "por edad × la relación alumnos ÷ niños de los demás municipios del reto", "sí/no", ALUMNOS),
        ("zbs_codigo", "Código de la zona básica de salud a la que se asigna (la que cubre más superficie del municipio)",
         "código", ZONAS_SALUD),
        ("zbs_nombre", "Nombre de esa zona básica de salud", "texto", ZONAS_SALUD),
        ("zbs_poblacion", "Población que atiende la zona: Padrón 2019 actualizado con el crecimiento 2019-2025 de su municipio principal",
         "personas", ZONAS_SALUD),
        ("nucleo_x", "Núcleo del municipio, coordenada X: mediana de sus colegios de primaria o secundaria "
         "(si no tiene, centroide del término). Sirve para medir distancias entre municipios", "km (UTM 30N, ETRS89)", NUCLEO),
        ("nucleo_y", "Núcleo del municipio, coordenada Y (ver nucleo_x)", "km (UTM 30N, ETRS89)", NUCLEO),
        ("hospital_km", "Distancia en línea recta desde el núcleo del municipio (mediana de sus colegios; si no tiene, "
         "centroide del término) hasta el hospital general público más cercano de la Comunidad de Madrid", "km", SANITARIOS),
        ("hospital_municipio", "Municipio en el que está ese hospital", "texto", SANITARIOS),
        ("hospital_min", "Minutos en coche, sin tráfico, desde el núcleo del municipio hasta el hospital general público "
         "de la Comunidad de Madrid al que se llega antes (puede no ser el más cercano en línea recta)", "minutos", OSRM),
        ("hospital_min_municipio", "Municipio en el que está ese hospital", "texto", OSRM),
        ("vecinos_min", "Solo municipios del reto: minutos en coche, sin tráfico, desde su núcleo hasta el de cada otro "
         "municipio del reto al que se llega en 60 minutos o menos, como texto JSON {\"código INE\": minutos}. "
         "Sirve para reubicar en municipios cercanos midiendo en minutos", "minutos", OSRM),
    ],
    # Lo genera la web (web/src/descarga.ts), no el ETL: si cambian sus columnas, cámbialas también aquí.
    # Separador «;» y decimales con coma, para abrirlo en Excel en español.
    "cabida_escenario_AAAA.csv": [
        ("ine", "Código INE del municipio (5 cifras)", "código", PADRON),
        ("municipio", "Nombre del municipio", "texto", PADRON),
        ("zona", "Zona estadística de la Comunidad de Madrid (NUTS4)", "texto", MUNICIPIOS),
        ("poblacion_2025", "Población a 1/1/2025", "personas", PADRON),
        ("llegan_hasta_AAAA", "Presión: personas que le llegarían hasta el año del escenario (AAAA), si sigue la tendencia", "personas", ESCENARIO),
        ("caben", "Capacidad: personas que caben sin ampliar servicios (el menor de los cuatro límites). "
         "0 = ya está por encima del límite hoy", "personas", ESCENARIO),
        ("margen", "caben − llegan, con las dos cifras ya redondeadas (negativo = no caben)", "personas", ESCENARIO),
        ("crecimiento_pct", "llegan ÷ poblacion_2025 × 100", "%", ESCENARIO),
        ("caben_por_vivienda", "Personas que caben según la vivienda (vacía y prevista en el planeamiento)", "personas", ESCENARIO),
        ("caben_por_colegios", "Personas que caben según los colegios (el nivel con menos sitio). "
         "Vacío = no tiene colegio de ese nivel: sus alumnos van a otro municipio y el límite no aplica", "personas", ESCENARIO),
        ("caben_por_sanidad", "Personas que caben según su zona básica de salud, por la parte de la zona que son sus vecinos", "personas", ESCENARIO),
        ("caben_por_ritmo", "Personas que caben sin crecer más del ritmo máximo al año", "personas", ESCENARIO),
        ("limita", "El recurso que pone el límite (el de menos sitio)", "texto", ESCENARIO),
        ("tipo", "Tensión, polo de crecimiento, oportunidad o consolidación", "texto", ESCENARIO),
        ("medida", "Cómo se mide la distancia en este escenario: «minutos en coche» (sin tráfico) o «km en línea recta». "
         "Decide condicionada, el hospital cerca al reubicar y la cifra de recibe_de y envia_a", "texto", ESCENARIO),
        ("condicionada", "Oportunidad con el hospital general público más cercano lejos: a más de 30 minutos en coche, "
         "sin tráfico, o a más de 25 km en línea recta (según medida)", "sí/no", ESCENARIO),
        ("hospital_km", "Distancia en línea recta al hospital general público más cercano (ver tabla_maestra.csv)", "km", SANITARIOS),
        ("hospital_min", "Minutos en coche, sin tráfico, al hospital general público al que se llega antes (ver tabla_maestra.csv)",
         "minutos", OSRM),
        ("reubicados_recibe", "Con «Reubicar en municipios cercanos con sitio»: personas que no caben en otros municipios y vienen aquí", "personas", ESCENARIO),
        ("reubicados_envia", "Con «Reubicar en municipios cercanos con sitio»: personas que no caben aquí y van a municipios cercanos", "personas", ESCENARIO),
        ("recibe_de", "De qué municipios vienen: «Municipio (personas; min)» en coche o «Municipio (personas; km)» en línea recta, "
         "según medida, separados por «|»", "texto", ESCENARIO),
        ("envia_a", "A qué municipios van: «Municipio (personas; min)» o «Municipio (personas; km)», según medida, "
         "separados por «|»", "texto", ESCENARIO),
        ("plan_plazas_primaria", "Con el plan de la pestaña «Plan»: plazas de primaria nuevas en el municipio (ampliar un colegio "
         "o construir uno)", "plazas", ESCENARIO),
        ("plan_plazas_eso", "Con el plan: plazas de ESO nuevas en el municipio (institutos)", "plazas", ESCENARIO),
        ("plan_centros_salud", "Con el plan: centros de salud nuevos en su zona básica de salud (un centro sirve a toda la zona, "
         "esté en el municipio que esté)", "centros", ESCENARIO),
        ("plan_coste_eur", "Con el plan: coste de las obras que se hacen en este municipio (valores por defecto y su fuente "
         "en la pestaña «Plan»)", "euros", ESCENARIO),
        ("plan_obras", "Con el plan: las obras que se hacen en este municipio, separadas por «;» (p. ej. «1 ampliación; "
         "1 centro de salud»). Vacío = ninguna", "texto", ESCENARIO),
        ("plan_apertura", "Con el plan: año en que abre la última obra de este municipio. Vacío = ninguna", "año", ESCENARIO),
    ],
    # Obras reales que dan los costes por defecto del plan (etl/obras_referencia.py). CC BY 4.0
    "obras_referencia.csv": [
        ("tipo", "Ampliación de colegio, colegio nuevo, instituto nuevo, ampliación de instituto o centro de salud nuevo. "
         "Las terminaciones y fases de un colegio que ya funciona cuentan como ampliación", "texto", NOTICIAS_CM),
        ("obra_plan", "Tipo de obra del plan de la web cuyo valor por defecto sale de la mediana de estas obras: ampliar_primaria, "
         "colegio_primaria, instituto o centro_salud. Vacío = de referencia, no entra en ninguna mediana (ver nota)", "código", OBRAS_CABIDA),
        ("nombre", "Nombre del centro, como lo da la noticia", "texto", NOTICIAS_CM),
        ("municipio", "Municipio (en Madrid capital, con el barrio o distrito)", "texto", NOTICIAS_CM),
        ("fecha", "Fecha de la noticia de la que sale el coste", "AAAA-MM-DD", NOTICIAS_CM),
        ("plazas", "Plazas escolares nuevas o, en un centro de salud, vecinos que atenderá. Vacío = la noticia no lo dice",
         "plazas o personas", NOTICIAS_CM),
        ("coste_eur", "Inversión que da la noticia para esa obra (con «más de» o «cerca de», la cifra que da)", "euros", NOTICIAS_CM),
        ("eur_por_plaza", "coste_eur ÷ plazas (en un centro de salud, euros por vecino que atiende)", "euros", OBRAS_CABIDA),
        ("fuente", "Quién lo publica y cuándo", "texto", NOTICIAS_CM),
        ("url", "Página de la noticia en comunidad.madrid", "URL", NOTICIAS_CM),
        ("nota", "Aclaraciones: terminación o fase, otra fecha de la que sale una cifra, por qué no entra en la mediana", "texto", NOTICIAS_CM),
    ],
    "resultados_2035.csv": [
        ("ine", "Código INE del municipio (5 cifras)", "código", PADRON),
        ("municipio", "Nombre del municipio", "texto", PADRON),
        ("zona", "Zona estadística de la Comunidad de Madrid (NUTS4)", "texto", MUNICIPIOS),
        ("poblacion_2025", "Población a 1 de enero de 2025", "personas", PADRON),
        ("llegan_hasta_2035", "Personas que le llegarían hasta 2035 si sigue la tendencia (escenario por defecto: 134.426 en los 155)", "personas", RESULTADOS),
        ("caben", "Personas que caben sin ampliar servicios: el menor de los cuatro límites", "personas", RESULTADOS),
        ("sin_sitio", "Personas que llegan y no caben, sin reubicar: max(0, llegan − caben)", "personas", RESULTADOS),
        ("caben_por_vivienda", "Personas que caben según la vivienda (vacías que se ocupan y suelo previsto que se construye)", "personas", RESULTADOS),
        ("caben_por_colegios", "Personas que caben según las plazas libres de primaria y ESO; vacío si no tiene colegio", "personas", RESULTADOS),
        ("caben_por_sanidad", "Personas que caben según su zona básica de salud", "personas", RESULTADOS),
        ("caben_por_ritmo", "Personas que caben según lo máximo que crece un municipio al año (3 %)", "personas", RESULTADOS),
        ("limita", "El recurso que pone el límite", "texto", RESULTADOS),
        ("tipo", "En tensión, Polo de crecimiento, Oportunidad o Consolidación (sin reubicar)", "texto", RESULTADOS),
        ("condicionada", "sí si es una oportunidad con el hospital a más de 30 min en coche", "sí/no", RESULTADOS),
        ("hospital_min", "Minutos en coche, sin tráfico, al hospital general público más cercano (ODbL, de OpenStreetMap)", "minutos", OSRM),
        ("reubicando_envia", "Reubicando a 30 min: personas que no caben y van a municipios cercanos con sitio", "personas", RESULTADOS),
        ("reubicando_recibe", "Reubicando a 30 min: personas de municipios cercanos que vienen aquí", "personas", RESULTADOS),
        ("reubicando_sin_sitio", "Reubicando a 30 min: personas que siguen sin sitio (51.284 en los 155)", "personas", RESULTADOS),
        ("reubicando_tipo", "Tipo después de reubicar (como colorea el mapa con «Reubicar»)", "texto", RESULTADOS),
        ("envia_a", "Reubicando: municipios a los que envía gente, con las personas entre paréntesis", "texto", RESULTADOS),
        ("recibe_de", "Reubicando: municipios de los que recibe gente, con las personas entre paréntesis", "texto", RESULTADOS),
    ],
    "plan_recomendado.csv": [
        ("ine", "Código INE del municipio donde va la obra", "código", PADRON),
        ("municipio", "Municipio donde va la obra (un centro de salud, en el más poblado de su zona)", "texto", PADRON),
        ("obra", "Ampliar colegio, Colegio nuevo, Instituto o Centro de salud", "texto", RESULTADOS),
        ("zona_salud", "Zona básica de salud del municipio", "texto", ZONAS_SALUD),
        ("plazas_o_personas_que_atiende", "Plazas escolares que suma, o personas que atiende el centro de salud", "plazas / personas", OBRAS_CABIDA),
        ("eur_por_plaza", "Euros por plaza (mediana de obras reales de la Comunidad, en obras_referencia.csv); vacío en centros de salud", "€/plaza", OBRAS_CABIDA),
        ("coste_eur", "Coste estimado de la obra", "€", OBRAS_CABIDA),
        ("inicio", "Año en que empieza la obra (supuesto: 2027)", "año", RESULTADOS),
        ("abre", "Año en que abre", "año", RESULTADOS),
        ("pasan_a_caber", "Cuánta gente se quedaría sin sitio en los 155 si se quitara solo esta obra (las filas no suman el total)", "personas", RESULTADOS),
    ],
    "zonas_salud.csv": [
        ("codigo", "Código de la zona básica de salud", "código", ZONAS_SALUD),
        ("zona_salud", "Nombre de la zona básica de salud", "texto", ZONAS_SALUD),
        ("poblacion", "Personas que atiende la zona (Padrón 2019 actualizado con el crecimiento de su municipio principal)", "personas", ZONAS_SALUD),
        ("limite", "Hasta cuántas personas se da por llena una zona: más que 9 de cada 10 zonas de la Comunidad (igual para todas)", "personas", RESULTADOS),
        ("sitio_libre", "limite − poblacion (negativo = por encima del límite)", "personas", RESULTADOS),
        ("municipios_del_reto", "Municipios de los 155 asignados a la zona, separados por «;»", "texto", ZONAS_SALUD),
        ("centros_plan_recomendado", "Centros de salud nuevos del plan recomendado en la zona", "centros", RESULTADOS),
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
