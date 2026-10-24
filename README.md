# CABIDA

¿Dónde cabe la nueva población de la Comunidad de Madrid? Para cada uno de los 155 municipios de menos de 50.000 habitantes, CABIDA calcula cuánta gente llegará y cuánta cabe sin desbordar vivienda, colegios y centros de salud. II Datathon LoDCOREMadrid 2026.

## Cómo está organizado

| Carpeta | Qué hay |
|---|---|
| `etl/` | Python: descarga los datos abiertos, los prepara y valida el modelo contra 2015-2025 |
| `web/` | La aplicación (React + TypeScript + MapLibre). El cálculo de las palancas va en el navegador |
| `data/raw/` | Datos originales (los pesados no se suben: se bajan con `descargar.py`) |
| `data/out/` | Datos generados, en CSV con licencia CC BY 4.0 |
| `entrega/` | Los 3 PDF de la propuesta |
| `plans/` | Planes de trabajo |

## Cómo arrancarlo

Hace falta [uv](https://docs.astral.sh/uv/) (Python) y Node 20 o superior.

```bash
cd etl
uv run descargar.py      # baja los datos abiertos a data/raw (unos 170 MB)
uv run preparar.py       # genera web/public/datos y data/out
uv run validacion.py     # prueba el modelo contra 2015-2025
cd ../web
npm install
npm run dev                        # abre http://localhost:5173 y se recarga al guardar
```

Para la versión final: `npm run build && npm run preview` (http://localhost:4173).

## Fuentes

Padrón continuo y Censo 2021 (INE); Portal de Datos Abiertos de la Comunidad de Madrid (municipios, centros educativos, centros sanitarios, zonas básicas de salud, población por edad); IDEM (límites municipales y planeamiento refundido); Cátedra LoDCOREMadrid (endpoint SPARQL).
