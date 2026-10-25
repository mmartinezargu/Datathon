# etl/ — preparación de datos y validación

Python >= 3.12 gestionado con **uv**. Dependencias en `pyproject.toml` (pandas, geopandas, pyogrio, shapely, requests, scipy). Añade dependencias con `uv add <paquete>`, nunca con pip.

## Scripts

| Script | Hace |
|---|---|
| `comun.py` | Compartido por `preparar.py` y `validacion.py`: rutas (`RAIZ`, `RAW`, `OUT`, `WEB_DATOS`), `LIMITE_HABITANTES = 50_000`, `ANIO_BASE = 2025`, lectura de población. Usa estas constantes, no rutas a mano |
| `descargar.py` | Baja los datos abiertos a `../data/raw` (~170 MB) |
| `capacidad.py` | Ingredientes fijos de la capacidad (viviendas, planeamiento, colegios y zona básica de salud de cada municipio). Los umbrales y la cuenta final con palancas los calcula `web/src/motor.ts` |
| `preparar.py` | Genera `../web/public/datos/*.json` y `../data/out/*.csv` |
| `validacion.py` | Valida el modelo 2015→2025 y escribe `validacion_municipios.csv` / `validacion.json` |

## Reglas

- Ejecuta siempre con `uv run <script>.py` desde `etl/`.
- No leas `data/raw/` entero: son archivos grandes. Inspecciona con `head`, `pandas.read_csv(..., nrows=...)` o `gpd.read_file(..., rows=...)`.
- Tras cambiar `preparar.py` o `capacidad.py`: vuelve a correr `preparar.py` y `validacion.py`, y comprueba que el error de validación no empeora (referencia: 44,4 %).
- Si cambia el esquema de un JSON de salida, actualiza `../web/src/tipos.ts` en el mismo cambio.
- `ANIO_BASE` vive en `comun.py` y en `web/src/motor.ts`: si cambia, cámbialo en ambos.
- Salidas en `data/out/` con licencia CC BY 4.0: columnas con nombres claros en español.
