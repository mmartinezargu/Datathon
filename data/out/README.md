# Datos de CABIDA

Datos generados por CABIDA para los 179 municipios de la Comunidad de Madrid, con el foco puesto en los 155 que tienen menos de 50.000 habitantes (Padrón a 1/1/2025). Todos los archivos se generan con los scripts de `etl/`: no se editan a mano.

## Archivos

| Archivo | Qué es | Filas | Lo genera |
|---|---|---|---|
| `tabla_maestra.csv` | Los datos de partida de cada municipio: población 2005–2025, tendencia, vivienda, planeamiento, colegios, zona básica de salud y hospital más cercano | 179 (una por municipio; `universo = True` en los 155 del reto) | `etl/preparar.py` |
| `validacion_municipios.csv` | Prueba contra el pasado: lo que el modelo, con datos hasta 2015, preveía que crecería cada municipio en 2015–2025, frente a lo que creció de verdad | 155 | `etl/validacion.py` |
| `diccionario.csv` | Qué significa cada columna de los dos archivos anteriores y del CSV del escenario que se descarga desde la web, en qué unidad va y de qué fuente sale | una por columna | `etl/preparar.py` (las descripciones están en `etl/diccionario.py`) |

Formato: CSV en UTF-8, separador `,` y punto decimal. La clave para cruzar los archivos es `ine`, el código INE de 5 cifras del municipio (`28001` = La Acebeda).

Las cifras del escenario (cuánta gente llega y cuánta cabe con las palancas elegidas) no están aquí, porque dependen de lo que elija cada usuario. Se calculan en el navegador y se descargan desde la web, en «Llévate los datos».

## Fuentes

| Dato | Quién lo publica | URL |
|---|---|---|
| Padrón continuo: población por municipio y año (tabla 2881) | INE | https://www.ine.es/jaxiT3/Tabla.htm?t=2881 |
| Censo 2021: viviendas principales y no principales (tabla 59525) | INE | https://www.ine.es/jaxi/Tabla.htm?tpx=59525&L=0 |
| Censo 2021: hogares por tamaño (tabla 59543) | INE | https://www.ine.es/jaxi/Tabla.htm?tpx=59543&L=0 |
| Municipios de la Comunidad de Madrid (zona estadística, superficie) | Portal de Datos Abiertos de la Comunidad de Madrid | https://datos.comunidad.madrid/dataset/0781c37e-bc64-4143-8029-18865bedbc3d |
| Centros educativos | Portal de Datos Abiertos de la Comunidad de Madrid | https://datos.comunidad.madrid/dataset/c750856d-3166-4dac-8e80-d1b824c968b5 |
| Población censada por edad (Censo anual), para estimar los niños de edad escolar | Portal de Datos Abiertos de la Comunidad de Madrid | https://datos.comunidad.madrid/dataset/0a14fbfe-783e-4de3-81b1-ff3792bfd402 |
| Centros, servicios y establecimientos sanitarios | Portal de Datos Abiertos de la Comunidad de Madrid | https://datos.comunidad.madrid/dataset/d8a0a444-adf5-4c04-8999-0eac3de52cb7 |
| Zonas básicas de salud | Portal de Datos Abiertos de la Comunidad de Madrid | https://datos.comunidad.madrid/dataset/924044d0-b75e-402c-8c13-96ace11da0ff |
| Límites municipales | IDEM, Comunidad de Madrid | https://idem.comunidad.madrid/ |
| Planeamiento urbanístico refundido 2025 | IDEM, Comunidad de Madrid | https://idem.comunidad.madrid/recursos_cat_geo/Catalogo/recursos/Planeamiento/Refundido/vpla_ref_25_gpkg.zip |

Los enlaces exactos de descarga están en `etl/descargar.py`.

## Licencia

Estos datos se publican con licencia **Creative Commons Atribución 4.0 Internacional (CC BY 4.0)**: https://creativecommons.org/licenses/by/4.0/deed.es

Se pueden copiar, redistribuir, transformar y usar con cualquier fin, también comercial, siempre que se cite la fuente. Cita propuesta:

> CABIDA, II Datathon LoDCOREMadrid 2026. Elaborado a partir de datos del INE, del Portal de Datos Abiertos de la Comunidad de Madrid y del IDEM. Licencia CC BY 4.0.

Los datos de partida son de sus autores (INE, Comunidad de Madrid), que los publican como datos abiertos con reutilización libre citando la fuente.

## Cómo regenerarlos

Hace falta [uv](https://docs.astral.sh/uv/) y Python 3.12 o superior.

```bash
cd etl
uv run descargar.py    # baja los datos abiertos a data/raw (unos 170 MB)
uv run preparar.py     # tabla_maestra.csv, diccionario.csv y los datos de la web
uv run validacion.py   # validacion_municipios.csv
```

Los datos de partida de menos de 25 MB ya están en `data/raw/` (ver su `README.md`), así que `descargar.py` solo baja lo que falta: el planeamiento refundido, en zip (`idem_planeamiento_refundido_2025.zip`). Hay que descomprimir `vpla_ref_25_gpkg.gpkg` en `data/raw/` antes de ejecutar `preparar.py`.
