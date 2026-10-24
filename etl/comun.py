"""Funciones compartidas por preparar.py y validacion.py."""
from pathlib import Path

import pandas as pd

RAIZ = Path(__file__).resolve().parent.parent
RAW = RAIZ / "data" / "raw"
OUT = RAIZ / "data" / "out"
WEB_DATOS = RAIZ / "web" / "public" / "datos"

LIMITE_HABITANTES = 50_000  # el reto: municipios de menos de 50.000 habitantes
ANIO_BASE = 2025


def leer_poblacion() -> pd.DataFrame:
    """Padrón del INE (tabla 2881), una fila por municipio y una columna por año.

    Junta los dos CSV (2005-2015 y 2015-2025), quita la fila del total de la
    Comunidad («28 Madrid») y separa el código INE de 5 cifras del nombre.
    """
    trozos = []
    for nombre in ("ine_2881_poblacion_2005_2015.csv", "ine_2881_poblacion_2015_2025.csv"):
        # latin-1, separador ; y punto de miles (1.404 = mil cuatrocientos cuatro)
        df = pd.read_csv(RAW / nombre, sep=";", encoding="latin-1", thousands=".")
        trozos.append(df)
    df = pd.concat(trozos).drop_duplicates(subset=["Municipios", "Periodo"])
    df = df[df["Municipios"].str.match(r"^\d{5} ")]  # fuera «28 Madrid» (total)
    df["ine"] = df["Municipios"].str[:5]
    df["nombre"] = df["Municipios"].str[6:].map(nombre_legible)
    ancho = df.pivot_table(index=["ine", "nombre"], columns="Periodo", values="Total").reset_index()
    ancho.columns = ["ine", "nombre"] + [int(c) for c in ancho.columns[2:]]
    return ancho


def miles(n: float) -> str:
    """12345 -> «12.345» (formato español)."""
    return f"{round(n):,}".replace(",", ".")


def nombre_legible(nombre: str) -> str:
    """El INE escribe «Acebeda, La»; para la app queda mejor «La Acebeda»."""
    if ", " in nombre:
        base, articulo = nombre.rsplit(", ", 1)
        if articulo in {"La", "El", "Los", "Las"}:
            return f"{articulo} {base}"
    return nombre
