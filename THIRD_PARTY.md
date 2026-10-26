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

## Preparación de datos (`etl/pyproject.toml`)

| Paquete | Versión instalada | Licencia | Web |
|---|---|---|---|
| pandas | 3.1.0 | BSD-3-Clause | https://pandas.pydata.org |
| geopandas | 1.2.0 | BSD-3-Clause | https://geopandas.org |
| pyogrio | 0.13.0 | MIT | https://pyogrio.readthedocs.io/ |
| shapely | 2.2.0 | BSD-3-Clause | https://shapely.readthedocs.io/ |
| requests | 2.34.2 | Apache-2.0 | https://requests.readthedocs.io |
| scipy | 1.18.1 | BSD-3-Clause (incluye componentes con otras licencias permisivas, ver su `LICENSE.txt`) | https://scipy.org/ |

Cómo volver a comprobarlo:

```bash
cd web && node -e 'const p=require("./package.json");for(const d of Object.keys({...p.dependencies,...p.devDependencies})){const j=require("./node_modules/"+d+"/package.json");console.log(d,j.version,j.license)}'
cd etl && uv run python -c "import importlib.metadata as md;[print(d, md.version(d), md.metadata(d).get('License-Expression') or md.metadata(d).get_all('Classifier')) for d in ['pandas','geopandas','pyogrio','shapely','requests','scipy']]"
```

## Datos

Los datos de partida son abiertos (INE, Portal de Datos Abiertos de la Comunidad de Madrid, IDEM). El detalle de las fuentes y su licencia está en [`data/out/README.md`](data/out/README.md).
