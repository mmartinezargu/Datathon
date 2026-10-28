# Software de terceros

CABIDA usa estas dependencias directas. La licencia se ha comprobado en lo que hay instalado: el `package.json` de cada paquete en `web/node_modules` y los metadatos de los paquetes de Python instalados con `uv` en `etl/.venv` (`importlib.metadata`). Todas son licencias libres y permisivas, compatibles con publicar el código y con los datos en CC BY 4.0.

## Web (`web/package.json`)

### Van en la web publicada

| Paquete | Versión instalada | Licencia | Web |
|---|---|---|---|
| maplibre-gl | 5.6.0 | BSD-3-Clause | https://maplibre.org/ |
| react | 19.3.1 | MIT | https://react.dev/ |
| react-dom | 19.3.1 | MIT | https://react.dev/ |

### Solo para desarrollar y compilar (no van en la web publicada)

| Paquete | Versión instalada | Licencia | Web |
|---|---|---|---|
| @eslint/js | 9.39.5 | MIT | https://eslint.org |
| @types/node | 22.20.5 | MIT | https://github.com/DefinitelyTyped/DefinitelyTyped |
| @types/react | 19.3.0 | MIT | https://github.com/DefinitelyTyped/DefinitelyTyped |
| @types/react-dom | 19.3.0 | MIT | https://github.com/DefinitelyTyped/DefinitelyTyped |
| @vitejs/plugin-react | 4.7.0 | MIT | https://github.com/vitejs/vite-plugin-react |
| eslint | 9.39.5 | MIT | https://eslint.org |
| eslint-plugin-react-hooks | 5.2.0 | MIT | https://react.dev/ |
| eslint-plugin-react-refresh | 0.4.26 | MIT | https://github.com/ArnaudBarre/eslint-plugin-react-refresh |
| globals | 16.5.0 | MIT | https://github.com/sindresorhus/globals |
| typescript | 5.8.3 | Apache-2.0 | https://www.typescriptlang.org/ |
| typescript-eslint | 8.72.0 | MIT | https://typescript-eslint.io/ |
| vite | 6.4.5 | MIT | https://vite.dev |
| vitest | 3.2.7 | MIT | https://vitest.dev |

## Preparación de datos (`etl/pyproject.toml`)

| Paquete | Versión instalada | Licencia | Web |
|---|---|---|---|
| pandas | 3.1.0 | BSD-3-Clause | https://pandas.pydata.org |
| geopandas | 1.2.0 | BSD-3-Clause | https://geopandas.org |
| pyogrio | 0.13.0 | MIT | https://pyogrio.readthedocs.io/ |
| shapely | 2.2.0 | BSD-3-Clause | https://shapely.readthedocs.io/ |
| requests | 2.34.2 | Apache-2.0 | https://requests.readthedocs.io |
| openpyxl | 3.1.5 | MIT | https://openpyxl.readthedocs.io |
| scipy | 1.18.1 | BSD-3-Clause (incluye componentes con otras licencias permisivas, ver su `LICENSE.txt`) | https://scipy.org/ |

Cómo volver a comprobarlo:

```bash
cd web && node -e 'const p=require("./package.json");for(const d of Object.keys({...p.dependencies,...p.devDependencies})){const j=require("./node_modules/"+d+"/package.json");console.log(d,j.version,j.license)}'
cd etl && uv run python -c "import importlib.metadata as md;[print(d, md.version(d), md.metadata(d).get('License-Expression') or md.metadata(d).get_all('Classifier')) for d in ['pandas','geopandas','pyogrio','shapely','requests','scipy','openpyxl']]"
```

## Presentación

| Herramienta | Versión | Licencia | Para qué |
|---|---|---|---|
| qrcode (npm) | 1.5.4 | MIT | Generó una vez el código QR de `https://cabida.vercel.app` de la diapositiva 11 (`presentacion/diapositivas.html`). El de `https://cabida.vercel.app/datos-abiertos/` se hizo con el mismo formato (corrección M, SVG sin margen), con un generador propio que reproduce el primero bit a bit. Los dos van dentro del HTML como SVG; la librería no es dependencia del proyecto. https://github.com/soldair/node-qrcode |

Las tipografías de las diapositivas (Bricolage Grotesque y Public Sans, de Google Fonts) tienen licencia SIL Open Font License 1.1; en `entrega/offline/CABIDA_diapositivas.html` van dentro del archivo.

## Datos

Los datos de partida son abiertos (INE, Portal de Datos Abiertos de la Comunidad de Madrid, IDEM). El detalle de las fuentes y su licencia está en [`data/out/README.md`](data/out/README.md).

### OpenStreetMap y OSRM

Los minutos en coche (al hospital y entre municipios) se calculan una vez, al preparar los datos (`etl/tiempos.py`), con el servidor público de [OSRM](https://project-osrm.org) (Open Source Routing Machine, licencia BSD-2-Clause). La web no llama a OSRM: usa los minutos ya guardados. Se usó el servidor público con una pausa entre peticiones y guardando cada respuesta, para no repetir consultas (es un servicio de uso moderado: no se debe volver a lanzar sin necesidad).

OSRM calcula las rutas con los mapas de **OpenStreetMap**: © colaboradores de OpenStreetMap. Los datos de OpenStreetMap están disponibles bajo la licencia **Open Database License (ODbL) 1.0**: https://www.openstreetmap.org/copyright. Las columnas `hospital_min`, `hospital_min_municipio` y `vecinos_min` (y `data/raw/tiempos_osrm.json`) salen de esos datos, así que van con licencia ODbL 1.0 y no con CC BY 4.0, que cubre el resto. Quien las reutilice debe citar a OpenStreetMap y, si publica una base de datos derivada de ellas, mantener la ODbL. Detalle en [`data/out/README.md`](data/out/README.md).
