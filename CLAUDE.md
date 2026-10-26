# CABIDA — II Datathon LoDCOREMadrid 2026

Para cada uno de los 155 municipios de la Comunidad de Madrid con menos de 50.000 habitantes, CABIDA calcula cuánta gente llegará (presión) y cuánta cabe sin desbordar vivienda, colegios y centros de salud (capacidad). Final: **jueves 29/10/2026**. El miércoles 28 no se programa (solo ensayo): todo cerrado el martes 27 por la noche.

## Estructura

| Carpeta | Contenido |
|---|---|
| `etl/` | Python (uv): descarga datos abiertos, los prepara y valida el modelo 2015→2025 |
| `web/` | React 19 + TypeScript + Vite + MapLibre. Web estática, sin servidor. El cálculo de palancas va en el navegador (`web/src/motor.ts`) |
| `data/raw/` | Datos originales. Los pesados NO se suben (se bajan con `descargar.py`) |
| `data/out/` | CSV generados (CC BY 4.0): `tabla_maestra.csv`, `validacion_municipios.csv` |
| `web/public/datos/` | JSON/GeoJSON generados por `preparar.py` que consume la web |
| `entrega/` | Los 3 PDF de la propuesta (aproximación técnica, fuentes, interfaz) |
| `plans/` | Planes de trabajo. `PENDIENTE.md` (raíz) = lista de tareas para la final |

## Comandos

```bash
# ETL (requiere uv, Python >= 3.12)
cd etl
uv run descargar.py    # ~170 MB a data/raw
uv run preparar.py     # genera web/public/datos y data/out
uv run validacion.py   # valida el modelo contra 2015-2025

# Web (Node >= 20)
cd web
npm install
npm run dev            # http://localhost:5173
npm run lint
npm test               # tests del motor (Vitest, web/tests)
npm run build && npm run preview   # versión final, http://localhost:4173
```

## Flujo de datos (no romperlo)

`data/raw` → `etl/preparar.py` → `web/public/datos/*.json` + `data/out/*.csv` → `web/src/motor.ts` (navegador).

- Los archivos de `web/public/datos/` y `data/out/` son **generados**: no se editan a mano, se regeneran con `uv run preparar.py`.
- Si cambias la forma de un JSON en `preparar.py`, actualiza `web/src/tipos.ts` en el mismo cambio.
- `motor.ts` tiene constantes ligadas a los datos (`ANIO_BASE = 2025`, `CRECIMIENTO_DECADA = 134_426`). Si el ETL cambia esas cifras, cámbialas aquí y en `PENDIENTE.md` (sección de cifras para las diapositivas).

## Modelo (resumen)

- **Presión**: cuánta gente llega (tendencia de cada municipio, escalada al escenario; por defecto 2035, ritmo de la última década).
- **Capacidad**: el menor de 4 límites (ley del mínimo): vivienda, colegios, sanidad y ritmo.
- **Tipo**: cruce presión × capacidad → `tensión`, `polo`, `oportunidad`, `consolidación`.
- Validación 2015→2025: error 44,4 % vs 64 % de la tendencia simple. Es la baza de la propuesta: cualquier cambio en el modelo se vuelve a validar con `uv run validacion.py` y se reporta el nuevo error.

## Reglas de trabajo

- Prioridad absoluta: lo que se ve en la demo de la final (ver `PENDIENTE.md`). Nada de extras (IA con Oracle, Monte Carlo, transporte, SPARQL) hasta que lo pendiente esté hecho.
- Sin servidor ni APIs en tiempo de ejecución: la web debe funcionar estática y también sin internet (copia offline para la final). Única excepción: el asistente con IA (`web/api/asistente.ts`, Groq), que es opcional y cae al de palabras clave si no hay red.
- Idioma: todo en español — código (nombres de variables/funciones), comentarios, textos de UI y commits. Mantén el estilo existente (`calcular`, `escenarioPorDefecto`, `componentes/Ficha.tsx`...).
- Textos de la UI en lenguaje llano para ciudadanos y jurado, sin jerga técnica.
- Cifras en formato español (`997.059`, `44,4 %`). Usa `web/src/formato.ts`, no formatees a mano.
- No subas nada a `data/raw/` salvo lo que permite `.gitignore`.
- Antes de dar por terminado un cambio en `web/`: `npm run lint` y `npm run build` sin errores.
- No inventes cifras: cualquier número en UI o diapositivas sale de los datos generados.

## Fuentes

Padrón continuo y Censo 2021 (INE); Portal de Datos Abiertos de la Comunidad de Madrid (municipios, centros educativos y sanitarios, zonas básicas de salud, población por edad); IDEM (límites municipales y planeamiento refundido); Cátedra LoDCOREMadrid (endpoint SPARQL).
