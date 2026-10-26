"""Descarga los datos abiertos de CABIDA en data/raw/.

Uso (desde etl/):
    uv run descargar.py            # todo lo que falte
    uv run descargar.py municipios limites   # solo esos

Si un archivo ya existe, no se vuelve a bajar. Así el proceso es reproducible
sin subir al repo los archivos pesados.
"""
import sys
from pathlib import Path

import requests

RAW = Path(__file__).resolve().parent.parent / "data" / "raw"

# nombre corto -> (archivo de destino, URL oficial)
FUENTES = {
    "municipios": (
        "cm_municipios.csv",
        "https://datos.comunidad.madrid/dataset/0781c37e-bc64-4143-8029-18865bedbc3d/resource/"
        "48010e29-caa0-46c5-ab6e-f498b2dc042f/download/municipio_comunidad_madrid.csv",
    ),
    "limites": (
        "idem_limites_municipales.geojson",
        "https://idem.comunidad.madrid/geoidem/UnidadesAdministrativas/ows?service=WFS&version=2.0.0"
        "&request=GetFeature&typeNames=UnidadesAdministrativas:IDEM_CM_UNID_ADMIN"
        "&outputFormat=application/json&srsName=EPSG:4326",
    ),
    "colegios": (
        "cm_centros_educativos.csv",
        "https://datos.comunidad.madrid/dataset/c750856d-3166-4dac-8e80-d1b824c968b5/resource/"
        "28d60557-1d73-4281-ab08-6cfd3b2f5f83/download/centros_educativos.csv",
    ),
    "sanidad": (
        "cm_centros_sanitarios.csv",
        "https://datos.comunidad.madrid/dataset/d8a0a444-adf5-4c04-8999-0eac3de52cb7/resource/"
        "2948b4da-8b39-42b7-b667-779a5284f39d/download/centros_servicios_establecimientos_sanitarios.csv",
    ),
    "zonas_salud": (
        "cm_zonas_basicas_salud.zip",
        "https://datos.comunidad.madrid/dataset/924044d0-b75e-402c-8c13-96ace11da0ff/resource/"
        "79a88736-b7c9-44e9-aca4-3b1d145ec5f0/download/zonas_basicas_salud.zip",
    ),
    "viviendas": (
        "ine_59525_viviendas_censo2021.csv",
        "https://www.ine.es/jaxi/files/tpx/es/csv_bdsc/59525.csv",
    ),
    "vacias": (
        "ine_59531_viviendas_vacias_censo2021.csv",
        "https://www.ine.es/jaxi/files/tpx/es/csv_bdsc/59531.csv",
    ),
    "hogares": (
        "ine_59543_hogares_censo2021.csv",
        "https://www.ine.es/jaxi/files/tpx/es/csv_bdsc/59543.csv",
    ),
    "zonas_salud_censo": (
        "iecm_censo2021_zonas_basicas_salud.zip",
        "https://web.comunidad.madrid/iestadis/fijas/estructu/demograficas/censos/descarga/cpvp21_salud_zbasicas.zip",
    ),
    "edades": (
        "cm_poblacion_por_edad_censo_anual.csv",
        "https://datos.comunidad.madrid/dataset/0a14fbfe-783e-4de3-81b1-ff3792bfd402/resource/"
        "bab16922-8df1-49b5-9791-aed4edf8ced1/download/"
        "poblacion-censada-por-edad-nacionalidad-y-sexo.-censo-anual.-municipios.csv",
    ),
    # ALMUDENA (banco de datos municipal del IECM): alumnos matriculados por municipio, 1994-2024
    "alumnos_primaria": (
        "iecm_almudena_501032_alumnos_primaria.csv",
        "https://gestiona.comunidad.madrid/desvan/almudena/GenerarCsvUnTema.icm?codTema=501032",
    ),
    "alumnos_eso": (
        "iecm_almudena_501033_alumnos_eso.csv",
        "https://gestiona.comunidad.madrid/desvan/almudena/GenerarCsvUnTema.icm?codTema=501033",
    ),
    "planeamiento": (
        "idem_planeamiento_refundido_2025.zip",
        "https://idem.comunidad.madrid/recursos_cat_geo/Catalogo/recursos/Planeamiento/Refundido/"
        "vpla_ref_25_gpkg.zip",
    ),
}


def bajar(nombre: str) -> None:
    archivo, url = FUENTES[nombre]
    destino = RAW / archivo
    if destino.exists() and destino.stat().st_size > 0:
        print(f"  ya está  {archivo} ({destino.stat().st_size / 1e6:.1f} MB)")
        return
    print(f"  bajando  {archivo} ...", flush=True)
    # Se descarga a un archivo temporal y se renombra al final:
    # si se corta a medias, no queda un archivo roto que parezca bueno
    temporal = destino.with_suffix(destino.suffix + ".parcial")
    with requests.get(url, stream=True, timeout=120) as r:
        r.raise_for_status()
        with open(temporal, "wb") as f:
            for trozo in r.iter_content(chunk_size=1 << 20):
                f.write(trozo)
    temporal.replace(destino)
    print(f"  hecho    {archivo} ({destino.stat().st_size / 1e6:.1f} MB)")


def main() -> None:
    RAW.mkdir(parents=True, exist_ok=True)
    pedidos = sys.argv[1:] or list(FUENTES)
    desconocidos = [p for p in pedidos if p not in FUENTES]
    if desconocidos:
        sys.exit(f"Fuentes desconocidas: {desconocidos}. Opciones: {list(FUENTES)}")
    for nombre in pedidos:
        bajar(nombre)


if __name__ == "__main__":
    main()
