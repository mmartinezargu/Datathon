# Datos en bruto

Archivos tal cual se descargan de la fuente. No se editan a mano.

## ine_2881_poblacion_*.csv

- **Fuente:** INE, tabla 2881 «Madrid: Población por municipios y sexo» (cifras oficiales del Padrón a 1 de enero): https://www.ine.es/jaxiT3/Tabla.htm?t=2881
- **Descargado:** 14/10/2026. Sexo = Total.
- **Archivos:** 2005–2015 y 2015–2025. El año 2015 está en los dos y coincide.
- **Filas:** 180 × 11 años = 1.980 por archivo (179 municipios + 1 fila `28 Madrid` con el total de la Comunidad).

Cómo leerlos:

- Codificación **latin-1** (ISO-8859-1), no UTF-8.
- Separador `;`. Los números llevan punto de miles (`1.404`). En pandas: `pd.read_csv(ruta, sep=';', encoding='latin-1', thousands='.')`.
- La columna `Municipios` empieza por el código INE de 5 cifras (`28001 Acebeda, La`). Es la clave para cruzar con el resto de datos.
- Quitar la fila `28 Madrid` (es el total, no un municipio).

Primeras cifras (1/1/2025): 155 municipios con menos de 50.000 hab., que suman 997.059 personas. Tres Cantos, Pinto y Colmenar Viejo ya superan los 50.000.

## Resto de archivos

Los archivos de menos de 25 MB también están en el repo, para no depender de que los servidores de las fuentes estén en pie. El planeamiento (`idem_planeamiento_refundido_2025.zip`, 131 MB) no se sube: se baja con `uv run descargar.py planeamiento` y hay que descomprimir `vpla_ref_25_gpkg.gpkg` en esta carpeta. Las URL exactas de descarga están en `etl/descargar.py`.

| Archivo | Fuente | URL | Descargado |
|---|---|---|---|
| `cm_municipios.csv` | Portal de Datos Abiertos de la CM, Municipios de la Comunidad de Madrid | https://datos.comunidad.madrid/dataset/0781c37e-bc64-4143-8029-18865bedbc3d | 25/10/2026 (comprobado: idéntico al de la fuente) |
| `cm_centros_educativos.csv` | Portal de Datos Abiertos de la CM, Centros educativos | https://datos.comunidad.madrid/dataset/c750856d-3166-4dac-8e80-d1b824c968b5 | 25/10/2026 |
| `cm_centros_sanitarios.csv` | Portal de Datos Abiertos de la CM, Centros, servicios y establecimientos sanitarios (una fila por centro y servicio) | https://datos.comunidad.madrid/dataset/d8a0a444-adf5-4c04-8999-0eac3de52cb7 | 25/10/2026 |
| `cm_zonas_basicas_salud.zip` | Portal de Datos Abiertos de la CM, Zonas básicas de salud (shapefile) | https://datos.comunidad.madrid/dataset/924044d0-b75e-402c-8c13-96ace11da0ff | 25/10/2026 |
| `cm_poblacion_por_edad_censo_anual.csv` | Portal de Datos Abiertos de la CM, Población censada por edad, nacionalidad y sexo (Censo anual) | https://datos.comunidad.madrid/dataset/0a14fbfe-783e-4de3-81b1-ff3792bfd402 | 25/10/2026 |
| `ine_59525_viviendas_censo2021.csv` | INE, Censo 2021, viviendas principales y no principales (tabla 59525) | https://www.ine.es/jaxi/Tabla.htm?tpx=59525&L=0 | 25/10/2026 |
| `ine_59543_hogares_censo2021.csv` | INE, Censo 2021, hogares por tamaño (tabla 59543) | https://www.ine.es/jaxi/Tabla.htm?tpx=59543&L=0 | 25/10/2026 |
| `ine_59531_viviendas_vacias_censo2021.csv` | INE, Censo 2021, viviendas por intensidad de uso según el consumo eléctrico (tabla 59531): viviendas vacías por municipio. Solo trae los municipios más grandes: faltan 44 de los 155 del reto, todos con unos 1.000 habitantes o menos | https://www.ine.es/jaxi/Tabla.htm?tpx=59531 (descarga: https://www.ine.es/jaxi/files/tpx/es/csv_bdsc/59531.csv) | 26/10/2026 |
| `iecm_censo2021_zonas_basicas_salud.zip` | Instituto de Estadística de la Comunidad de Madrid, Censo 2021 por zona básica de salud (tablas T21SALUD01 a 04, en xlsx). Se usa T21SALUD01 (población por zona) para validar | https://web.comunidad.madrid/iestadis/fijas/estructu/demograficas/censos/icensos21_zbsal.htm | 26/10/2026 |
| `iecm_almudena_501032_alumnos_primaria.csv` | IECM, ALMUDENA (banco de datos municipal), tema 501032: alumnos matriculados en educación primaria por municipio, 1994–2024 (2024 provisional). Fuente original: Subdirección General de Evaluación y Análisis, Consejería de Educación | https://gestiona.comunidad.madrid/desvan/Inicio.icm?enlace=almudena (CSV: https://gestiona.comunidad.madrid/desvan/almudena/GenerarCsvUnTema.icm?codTema=501032) | 26/10/2026 |
| `iecm_almudena_501033_alumnos_eso.csv` | IECM, ALMUDENA, tema 501033: alumnos matriculados en ESO por municipio, 1994–2024 (2024 provisional) | https://gestiona.comunidad.madrid/desvan/almudena/GenerarCsvUnTema.icm?codTema=501033 | 26/10/2026 |
| `tiempos_osrm.json` | Generado por `etl/tiempos.py`: minutos en coche, sin tráfico, de cada núcleo al hospital general público de la CM al que se llega antes, y entre los pueblos del reto (solo ≤ 60 min, de origen a destino). OSRM (servidor público, perfil de coche) sobre datos © colaboradores de OpenStreetMap (ODbL 1.0). Se sube para que `preparar.py` funcione sin red; la caché de peticiones (`osrm_cache/`) no | https://project-osrm.org · https://www.openstreetmap.org/copyright | 26/10/2026 |
| `idem_limites_municipales.geojson` | IDEM, Unidades administrativas: límites municipales (WFS, EPSG:4326) | https://idem.comunidad.madrid/geoidem/UnidadesAdministrativas/ows | 26/10/2026 (copia del equipo; mismo servicio WFS del IDEM) |
