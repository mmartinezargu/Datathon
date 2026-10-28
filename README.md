# CABIDA

¿Dónde cabe la nueva población de la Comunidad de Madrid? Para cada uno de los 155 municipios de menos de 50.000 habitantes, CABIDA calcula cuánta gente llegará y cuánta cabe sin desbordar vivienda, colegios y centros de salud. II Datathon LoDCOREMadrid 2026.

## Entrega para el jurado

| Qué | Dónde |
|---|---|
| **La web (MVP)** | https://cabida.vercel.app: funciona en el navegador, también en el móvil |
| **Los datasets elaborados** | **https://cabida.vercel.app/datos-abiertos/**: los 7 CSV para descargar (resultados 2035 de los 155 municipios, plan recomendado, zonas de salud, tabla maestra, validación, obras de referencia y diccionario), con sus fuentes y su licencia (CC BY 4.0; las columnas de minutos en coche, ODbL por venir de OpenStreetMap). Los mismos archivos están en [`data/out/`](data/out/), con cómo regenerarlos en su [README](data/out/README.md) |
| **Los datos de cada escenario** | Se descargan en CSV desde la web: «Llévate los datos» (mapa; con el plan, en las columnas `plan_…`) y «Atraer». Los costes de referencia del plan, en `data/out/obras_referencia.csv` |
| **La presentación** | [`entrega/CABIDA_presentacion_final.pdf`](entrega/CABIDA_presentacion_final.pdf). Con sus animaciones: carpeta [`presentacion/`](presentacion/) (se abre `diapositivas.html` en el navegador) |
| **Sin internet** | [`entrega/offline/`](entrega/offline/), doble clic: `CABIDA.html` (la web entera, con los datos dentro) y `CABIDA_diapositivas.html` (la presentación, con tipografías e imágenes dentro). Se copia la carpeta entera, con `datos/` para las descargas y `datos-abiertos/` (la página de datos abiertos). Todo junto en un zip para el grupo: `node entrega/hacer-zip.mjs` → `CABIDA_final.zip` (no se sube) |
| **La propuesta inicial** | Los 3 PDF de [`entrega/`](entrega/): aproximación técnica, fuentes de datos e interfaz |
| **El código** | Este repositorio: `etl/` (Python) y `web/` (React + TypeScript). Licencias de terceros en [`THIRD_PARTY.md`](THIRD_PARTY.md) |

## Cómo está organizado

| Carpeta | Qué hay |
|---|---|
| `etl/` | Python: descarga los datos abiertos, los prepara y valida el modelo contra 2015-2025 |
| `web/` | La aplicación (React + TypeScript + MapLibre). El cálculo de las palancas va en el navegador |
| `data/raw/` | Datos originales (los pesados no se suben: se bajan con `descargar.py`) |
| `data/out/` | Datos generados, en CSV con licencia CC BY 4.0 (las columnas de minutos en coche, ODbL) |
| `entrega/` | Los 3 PDF de la propuesta y la presentación final |
| `presentacion/` | Las diapositivas de la final en HTML (con animaciones) y cómo verlas |
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

Padrón continuo y Censo 2021 (INE); Instituto de Estadística de la Comunidad de Madrid (alumnos matriculados, ALMUDENA); Portal de Datos Abiertos de la Comunidad de Madrid (municipios, centros educativos, centros sanitarios, zonas básicas de salud, población por edad); IDEM (límites municipales y planeamiento refundido); OpenStreetMap (minutos en coche, calculados con OSRM). La lista completa, con enlaces y licencias, está en [`data/out/README.md`](data/out/README.md).
