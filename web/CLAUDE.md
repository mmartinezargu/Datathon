# web/ — aplicación CABIDA

React 19 + TypeScript + Vite + MapLibre GL 5. Web estática: sin backend, sin llamadas a APIs externas en tiempo de ejecución. **Única excepción**: `api/asistente.ts` (asistente con IA, Groq), que es opcional — si falla, la web sigue igual con el asistente de palabras clave.

## Mapa del código

| Archivo | Rol |
|---|---|
| `src/motor.ts` | Motor de cálculo: presión, capacidad (ley del mínimo de 4 límites) y tipo. Se recalcula al mover palancas, debe ser instantáneo. También el plan de obras (`planOptimo`, `evaluarPlan`, `inversionesDe`): es la única fuente de sus cifras. «Hospital lejos» y las parejas al reubicar siguen la medida del escenario (`hospitalLejos`, `parejasCercanas`) |
| `src/medida.ts` | Textos de las dos medidas del interruptor «Medir en»: minutos en coche, sin tráfico (`'min'`, por defecto en la web) o km en línea recta (`'km'`, por defecto en el motor y los tests). La regla está en `hospitalLejos` (`motor.ts`) |
| `src/mudanza.ts` | Ranking de «¿Dónde me mudo?» (perfiles, filtros —también «hospital cerca» con `hospitalLejos` y la medida del escenario—, sitio que queda por recurso) y `interpretarFrase` (asistente sin IA: frase → filtros por palabras clave y nombres de municipio). Funciones puras sobre los resultados del motor |
| `src/asistente.ts` | Lee la frase del vecino: pregunta a `/api/asistente` (IA) y, si no hay red o tarda más de 8 s, usa `interpretarFrase` |
| `api/asistente.ts` | Función de Vercel: pasa la frase a la IA (Groq; Oracle como alternativa) y devuelve JSON con perfil, instituto, hospital, mezcla (% de familias, mayores y teletrabajo que dice la frase), tamaño, municipio y zona. La web valida cada campo con `lecturaDeIA` (`mudanza.ts`) |
| `src/descarga.ts` | CSV del escenario actual para descargar (formato Excel en español) |
| `src/tipos.ts` | Tipos de los datos (`Municipio`, `ZonaSalud`, `Escenario`, `ResultadoMunicipio`...). Debe coincidir con lo que genera `etl/preparar.py` |
| `src/App.tsx` | Estado global y composición de la app |
| `src/componentes/Mapa.tsx` | Mapa MapLibre de los 155 municipios coloreados por tipo |
| `src/componentes/Palancas.tsx` | Controles del escenario (supuestos) |
| `src/componentes/Ficha.tsx` | Ficha de un municipio: vaso, frase y los 4 límites. La cuenta con números va tapada en «Ver la cuenta». Al final, la línea «En el plan: … → Planificar aquí» |
| `src/componentes/Plan.tsx` | Pestaña «Plan» (`#plan`): lista de obras editable (botones «Plan óptimo» y «A tu medida»: con un presupuesto o a mano), resultado con la comparación sin reubicar, calendario (Recharts), parámetros con su fuente, «Ver en el mapa» y CSV. Las cuentas, en `motor.ts` (`planOptimo`, `evaluarPlan`) |
| `src/fuentesPlan.ts` | Nombres de las obras y fuente de cada valor por defecto del plan (`PARAMETROS_PLAN` en `motor.ts`) |
| `src/componentes/Evolucion.tsx` | Gráfico de evolución de población |
| `src/componentes/Mudanza.tsx` | Pestaña «Dónde vivir» (`#vivir`), para el vecino: caja «Cuéntanoslo con tus palabras», perfil, filtros, ranking con frase y comparador |
| `src/componentes/Asistente.tsx` | Caja «Cuéntanoslo con tus palabras» (IA o palabras clave). Quien la usa decide qué hacer con la lectura |
| `src/reparto.ts` | Lógica de «Atraer»: divide a los que llegan según el modelo (`escenario.personas`) por perfiles (mezcla supuesta, editable) y los reparte entre los pueblos hasta llenar su `caben`, recorriendo el ranking de cada perfil con los filtros de dónde (zona, tamaño, hospital, instituto). Por turnos y a la par: cada grupo coloca en cada vuelta una tanda proporcional a su tamaño. Función pura |
| `src/componentes/Atraer.tsx` | Pestaña «Atraer» (`#atraer`; `#repartir` también lleva aquí), para la institución: la palanca de la demanda (a qué pueblos atraer a cada tipo de vecino; construir es «Plan»). Asistente con IA (entiende «30 % familias»: pone ese % y reparte el resto como estaba, `aplicarMezcla`), ajustes plegados (¿quiénes llegan?, ¿dónde?), resumen (caben atrayendo vs. según la tendencia), «Dónde promocionar a cada grupo», descarga CSV (`csvAtraer` en `descarga.ts`) y tabla pueblo a pueblo con «Lo llena». Cuenta las obras del plan pero no las cambia |
| `src/componentes/Descarga.tsx` | Bloque «Llévate los datos»: CSV del escenario y tabla maestra (CC BY 4.0) |
| `src/componentes/Metodologia.tsx` | Pestaña «Cómo funciona» (`#como`): 4 pasos en lenguaje llano (sin fórmulas), fuentes con enlace y limitaciones. Las fórmulas van tapadas en «Ver la cuenta exacta». Al final, la sección «¿Acierta?». Lee las constantes de `motor.ts` y `mudanza.ts` |
| `src/componentes/Validacion.tsx` | Sección «¿Acierta?» (validación 2015→2025), al final de «Cómo funciona». El enlace `#fiable` baja hasta ella |
| `src/validacion.ts` | Cifras de la validación que se enseñan («77 de cada 100») |
| `src/componentes/Inicio.tsx` | Portada: la pregunta del reto, el vaso de los 155 y tres puertas (gestor, vecino, ¿es fiable? → `#fiable`) |
| `src/componentes/Reubicacion.tsx` | Bloque de la columna de resultado con la reubicación activa: resumen y los 5 traslados más grandes |
| `src/componentes/Vaso.tsx` | El dibujo del vaso: el vaso = lo que cabe, el agua = lo que llega; si no cabe, rebosa en rojo. Recibe cifras ya calculadas |
| `src/componentes/Iconos.tsx` | Iconos SVG propios (`<Icono nombre="colegios" />`). Sin librerías de iconos |
| `src/diseno.css` | Estilos del rediseño (3 columnas, vaso, portada, móvil). Va después de `estilo.css` |
| `src/colores.ts` | Paleta de los 4 tipos. Úsala siempre, no metas colores sueltos |
| `src/formato.ts` | Formato español de números y porcentajes |
| `public/datos/` | **Generado** por el ETL. No editar a mano |

## Asistente con IA

- Proveedor: **Groq** (capa gratuita, modelo `openai/gpt-oss-120b`, responde en menos de 1 s y con esquema JSON garantizado). Oracle (OCI Generative AI) queda como alternativa, pero en la región de la cuenta (Madrid) no hay modelos que funcionen.
- Variables de entorno en Vercel (Settings → Environment Variables), nunca en el código ni en git: `GROQ_API_KEY` (`gsk_…`) y, opcional, `GROQ_MODELO`. Si no hay `GROQ_API_KEY` se usa `OCI_GENAI_API_KEY` + `OCI_REGION` + `OCI_MODELO`.
- Límites de la capa gratuita de Groq: 1.000 peticiones al día y 8.000 tokens por minuto (unas 9 preguntas por minuto con el modelo grande). Si el grande está saturado (429), la función prueba con `openai/gpt-oss-20b`; si también, la web usa las palabras clave.
- Con `npm run dev` la función también se sirve en local (`vite.config.ts`), con la clave de `.env.local`.
- La IA solo elige filtros: las explicaciones y todas las cifras las pone la web. Si nombra un municipio, su zona manda sobre la zona que diga la IA.

## Reglas

- Comandos: `npm run dev`, `npm run lint`, `npm test`, `npm run build`. Antes de cerrar un cambio: lint, tests y build sin errores.
- Tests del motor en `tests/` (Vitest, con los datos reales de `public/datos`): si cambias las cifras por defecto a propósito, actualízalas también ahí.
- Lógica de cálculo solo en `motor.ts` (funciones puras); el ranking ciudadano, en `mudanza.ts`, se apoya en sus resultados. Los componentes no hacen cuentas del modelo.
- TypeScript estricto: nada de `any`; si falta un tipo, añádelo a `tipos.ts`.
- No añadas dependencias salvo que sea imprescindible para la demo; nada de librerías de UI pesadas.
- Debe verse bien en portátil y móvil (el jurado puede abrirla en el móvil).
- Textos de UI en español llano, cifras con `formato.ts`.
- No leas `public/datos/limites.geojson` entero (es grande): inspecciona su estructura con un script o las primeras líneas.
