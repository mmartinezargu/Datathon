"""Obras reales de la Comunidad de Madrid (2023–2026) que dan los costes por defecto del plan de la web.

Cada obra sale de la noticia de la Comunidad en comunidad.madrid (la página, no el PDF de la nota).
El valor por defecto de cada tipo de obra del plan es la mediana de sus obras (web/src/motor.ts, PARAMETROS_PLAN):
  - ampliar_primaria: ampliaciones y terminaciones de colegios de primaria que ya existen
  - colegio_primaria: colegios nuevos (primera fase o fase única)
  - instituto: institutos nuevos
  - centro_salud: centros de salud nuevos (la mediana es del coste del centro; las personas que atiende salen de las zonas)
Las obras con obra_plan vacío se enseñan como referencia pero no entran en ninguna mediana.

Escribe data/out/obras_referencia.csv (CC BY 4.0) y web/public/datos/obras_referencia.json.
Se ejecuta desde preparar.py o solo: uv run obras_referencia.py
"""
import json
import statistics

import pandas as pd

import diccionario
from comun import OUT, WEB_DATOS

CM = "Comunidad de Madrid"
NOTICIA = "https://www.comunidad.madrid/noticias/"

# (tipo, obra_plan, nombre, municipio, fecha, plazas, coste_eur, url, nota)
# plazas: plazas escolares o, en un centro de salud, vecinos que atiende. None = la noticia no lo dice.
OBRAS: list[tuple[str, str, str, str, str, int | None, int, str, str]] = [
    # Ampliaciones y terminaciones de colegios de primaria
    ("ampliación de colegio", "ampliar_primaria", "CEIP María Blanchard", "Getafe", "2023-03-29", 475, 2_800_000,
     NOTICIA + "2023/03/29/comunidad-madrid-creara-1750-nuevas-plazas-educativas-publicas-infantil-primaria", ""),
    ("ampliación de colegio", "ampliar_primaria", "CEIP Isabel la Católica", "Alcorcón", "2023-03-29", 450, 5_800_000,
     NOTICIA + "2023/03/29/comunidad-madrid-creara-1750-nuevas-plazas-educativas-publicas-infantil-primaria", "Terminación"),
    ("ampliación de colegio", "ampliar_primaria", "CEIP Nuria Espert", "Madrid (Valdebebas)", "2023-03-29", 825, 9_000_000,
     NOTICIA + "2023/03/29/comunidad-madrid-creara-1750-nuevas-plazas-educativas-publicas-infantil-primaria", "«Cercano a los 9 millones»"),
    ("ampliación de colegio", "ampliar_primaria", "CEIP María de Villota", "Madrid (Ensanche de Vallecas)", "2023-12-29", 825, 8_700_000,
     NOTICIA + "2023/12/29/comunidad-madrid-crea-2100-plazas-educativas-publicas-construccion-colegio-ampliaciones-otros-tres-centros",
     "Última fase"),
    ("ampliación de colegio", "ampliar_primaria", "CEIP Margaret Thatcher", "Madrid (Barajas)", "2024-09-25", 275, 3_400_000,
     NOTICIA + "2024/09/25/comunidad-madrid-aprueba-obras-colegios-e-institutos-crear-1885-nuevas-plazas-publicas", "Terminación"),
    ("ampliación de colegio", "ampliar_primaria", "CEIP Gabriela Morreale", "Leganés", "2024-09-25", 350, 2_900_000,
     NOTICIA + "2024/09/25/comunidad-madrid-aprueba-obras-colegios-e-institutos-crear-1885-nuevas-plazas-publicas",
     "Terminación; «cerca de 2,9 millones»"),
    ("ampliación de colegio", "ampliar_primaria", "CEIP Maruja Mallo", "Móstoles", "2024-09-25", 450, 2_800_000,
     NOTICIA + "2024/09/25/comunidad-madrid-aprueba-obras-colegios-e-institutos-crear-1885-nuevas-plazas-publicas", "Terminación"),
    ("ampliación de colegio", "ampliar_primaria", "CEIP Hispanidad", "Rivas-Vaciamadrid", "2024-10-02", 675, 7_400_000,
     NOTICIA + "2024/10/02/comunidad-madrid-invierte-273-millones-crear-2375-plazas-educativas-publicas-rivas-getafe-fuenlabrada",
     "Terminación; «más de 7,4 millones»"),
    ("ampliación de colegio", "ampliar_primaria", "CEIP Yvonne Blake", "Fuenlabrada", "2024-10-02", 300, 4_300_000,
     NOTICIA + "2024/10/02/comunidad-madrid-invierte-273-millones-crear-2375-plazas-educativas-publicas-rivas-getafe-fuenlabrada", ""),
    ("ampliación de colegio", "ampliar_primaria", "CEIP Virgen de la Oliva", "Anchuelo", "2025-02-04", 50, 2_300_000,
     NOTICIA + "2025/02/04/comunidad-madrid-incrementa-50-nuevas-plazas-colegio-publico-anchuelo-inversion-23-millones", ""),
    # Colegios nuevos
    ("colegio nuevo", "colegio_primaria", "CEIP de El Cañaveral (hoy CEIPSO Rudyard Kipling), primera fase", "Madrid (Vicálvaro)",
     "2023-12-29", 300, 6_400_000,
     NOTICIA + "2023/12/29/comunidad-madrid-crea-2100-plazas-educativas-publicas-construccion-colegio-ampliaciones-otros-tres-centros", ""),
    ("colegio nuevo", "colegio_primaria", "CEIPSO de Adelfillas", "Colmenar Viejo", "2026-03-25", 840, 13_300_000,
     NOTICIA + "2026/03/25/comunidad-madrid-crea-2200-nuevas-plazas-educativas-publicas-infantil-primaria-secundaria-inversion-369-millones",
     "Al autorizar la obra; al presentarlo (21/11/2025), 12,2 M€ y 840 plazas"),
    # Institutos nuevos
    ("instituto nuevo", "instituto", "IES Los Molinos", "Getafe", "2026-05-20", 880, 14_581_424,
     "https://www.comunidad.madrid/node/114439", "Plazas: noticia del 12/02/2025"),
    ("instituto nuevo", "instituto", "Instituto del Ensanche de Vallecas", "Madrid (Villa de Vallecas)", "2025-07-02", 1_000, 12_561_693,
     NOTICIA + "2025/07/02/comunidad-madrid-adjudica-obras-construir-institutos-vallecas-canaveral-valdebebas-3000-nuevas-plazas-publicas", ""),
    ("instituto nuevo", "instituto", "IES Torcuato Fernández Miranda", "Arroyomolinos", "2025-08-28", 810, 10_500_000,
     NOTICIA + "2025/08/28/comunidad-madrid-invierte-105-millones-euros-sumar-810-nuevas-plazas-escolares-publicas-arroyomolinos", ""),
    ("instituto nuevo", "instituto", "Instituto de El Cañaveral", "Madrid (Vicálvaro)", "2026-07-17", 1_000, 12_000_000,
     NOTICIA + "2026/07/17/comunidad-madrid-creara-1000-plazas-escolares-publicas-barrio-canaveral-distrito-madrileno-vicalvaro",
     "«Más de 12 millones»"),
    ("instituto nuevo", "instituto", "IES Margarita Salas", "Rivas-Vaciamadrid", "2026-08-21", 1_000, 10_300_000,
     NOTICIA + "2026/08/21/comunidad-madrid-crea-1000-nuevas-plazas-educativas-publicas-nuevo-instituto-rivas-vaciamadrid", ""),
    # Ampliaciones de institutos: de referencia (en el plan no hay «ampliar instituto»)
    ("ampliación de instituto", "", "IES José Pedro Pérez Llorca", "Parla", "2023-12-29", 720, 7_400_000,
     NOTICIA + "2023/12/29/comunidad-madrid-crea-2100-plazas-educativas-publicas-construccion-colegio-ampliaciones-otros-tres-centros",
     "Terminación. No entra en la mediana: en el plan no hay «ampliar instituto»"),
    ("ampliación de instituto", "", "IES Elisa Soriano Fischer", "Getafe", "2024-10-02", 400, 5_300_000,
     NOTICIA + "2024/10/02/comunidad-madrid-invierte-273-millones-crear-2375-plazas-educativas-publicas-rivas-getafe-fuenlabrada",
     "No entra en la mediana: en el plan no hay «ampliar instituto»"),
    ("ampliación de instituto", "", "IES Eduardo Capa, segunda fase", "Arganda del Rey", "2026-09-30", 800, 10_000_000,
     "https://www.comunidad.madrid/node/120029",
     "«Más de 10 millones»; plazas: noticia del 12/02/2025. No entra en la mediana: en el plan no hay «ampliar instituto»"),
    # Centros de salud nuevos (plazas = vecinos que atenderá)
    ("centro de salud nuevo", "", "16 centros de salud (en conjunto)", "Varios (9 municipios)", "2024-07-24", None, 113_826_177,
     NOTICIA + "2024/07/24/comunidad-madrid-aprueba-114-millones-iniciar-este-ano-construccion-16-nuevos-centros-salud-nueve-municipios",
     "7,1 M€ de media por centro. No entra en la mediana: es un conjunto y ya incluye varios de esta lista"),
    ("centro de salud nuevo", "centro_salud", "Centro de Salud Montecarmelo", "Madrid (Fuencarral-El Pardo)", "2025-02-17", 21_000, 8_000_000,
     "https://www.comunidad.madrid/node/71415", "«Más de 8 millones»; «cerca de 21.000» vecinos"),
    ("centro de salud nuevo", "centro_salud", "Centro de Salud Soto del Henares", "Torrejón de Ardoz", "2025-08-01", 17_500, 5_700_000,
     NOTICIA + "2025/08/01/comunidad-madrid-avanza-obras-nuevo-centro-salud-torrejon-ardoz-terminaran-proximo-verano", ""),
    ("centro de salud nuevo", "centro_salud", "Centro de Salud Valdemoro 3", "Valdemoro", "2025-09-08", 10_000, 2_600_000,
     NOTICIA + "2025/09/08/comunidad-madrid-refuerza-atencion-sanitaria-valdemoro-tercer-centro-salud-abrira-puertas-2026",
     "«Cerca de 10.000» vecinos"),
    ("centro de salud nuevo", "centro_salud", "Centro de Salud Quinta de los Molinos", "Madrid (San Blas-Canillejas)", "2025-10-27", 21_000,
     4_800_000, NOTICIA + "2025/10/27/comunidad-madrid-mejorara-asistencia-sanitaria-21000-vecinos-san-blas-canillejas-nuevo-centro-salud",
     "«Más de 21.000» vecinos"),
    ("centro de salud nuevo", "centro_salud", "Centro de Salud La Tenería", "Pinto", "2025-11-21", 15_000, 6_670_000,
     NOTICIA + "2025/11/21/comunidad-madrid-avanza-construccion-tercer-centro-salud-publico-pinto-dara-asistencia-casi-15000-vecinos",
     "«Casi 15.000» vecinos"),
    ("centro de salud nuevo", "centro_salud", "Centro de Salud Fuencarral", "Madrid (Fuencarral-El Pardo)", "2026-06-19", 25_000, 12_300_000,
     NOTICIA + "2026/06/19/comunidad-madrid-ultima-nuevo-centro-salud-distrito-fuencarral-pardo-atender-25000-vecinos",
     "«Más de 25.000» vecinos"),
    ("centro de salud nuevo", "centro_salud", "Centro de Salud Guadarrama", "Guadarrama", "2026-09-09", 17_000, 9_900_000,
     NOTICIA + "2026/09/09/comunidad-madrid-invierte-casi-10-millones-euros-nuevo-centro-salud-guadarrama", "«Más de 17.000» vecinos"),
]

COLUMNAS = ["tipo", "obra_plan", "nombre", "municipio", "fecha", "plazas", "coste_eur", "eur_por_plaza", "fuente", "url", "nota"]


def tabla() -> pd.DataFrame:
    df = pd.DataFrame(OBRAS, columns=["tipo", "obra_plan", "nombre", "municipio", "fecha", "plazas", "coste_eur", "url", "nota"])
    df["plazas"] = df["plazas"].astype("Int64")
    df["eur_por_plaza"] = (df["coste_eur"] / df["plazas"]).round().astype("Int64")
    df["fuente"] = CM + ", " + pd.to_datetime(df["fecha"]).dt.strftime("%d/%m/%Y")
    return df[COLUMNAS]


def medianas(df: pd.DataFrame) -> dict[str, dict]:
    """Por tipo de obra del plan: mediana de €/plaza (de un centro de salud, de lo que cuesta el centro), mínimo y máximo."""
    resultado = {}
    for obra, g in df[df["obra_plan"] != ""].groupby("obra_plan"):
        valores = g["coste_eur"] if obra == "centro_salud" else g["eur_por_plaza"]
        valores = [float(v) for v in valores]
        resultado[obra] = {"n": len(valores), "mediana": round(statistics.median(valores)), "min": min(valores), "max": max(valores)}
    return resultado


def escribir() -> None:
    df = tabla()
    diccionario.comprobar("obras_referencia.csv", COLUMNAS)
    OUT.mkdir(parents=True, exist_ok=True)
    WEB_DATOS.mkdir(parents=True, exist_ok=True)
    df.to_csv(OUT / "obras_referencia.csv", index=False, encoding="utf-8")
    obras = [{k: (None if pd.isna(v) else int(v) if k in ("plazas", "coste_eur", "eur_por_plaza") else v) for k, v in f.items()}
             for f in df.to_dict(orient="records")]
    (WEB_DATOS / "obras_referencia.json").write_text(
        json.dumps({"obras": obras, "medianas": medianas(df)}, ensure_ascii=False, indent=1), encoding="utf-8")
    for obra, m in medianas(df).items():
        print(f"  {obra}: mediana de {m['n']} obras = {m['mediana']:,} (de {m['min']:,.0f} a {m['max']:,.0f})")


if __name__ == "__main__":
    escribir()
    diccionario.escribir()
