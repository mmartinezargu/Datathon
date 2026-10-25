# web/ — aplicación CABIDA

React 19 + TypeScript + Vite + MapLibre GL 5. Web estática: sin backend, sin llamadas a APIs externas en tiempo de ejecución.

## Mapa del código

| Archivo | Rol |
|---|---|
| `src/motor.ts` | Motor de cálculo: presión, capacidad (ley del mínimo de 4 límites) y tipo. Se recalcula al mover palancas, debe ser instantáneo |
| `src/mudanza.ts` | Ranking de «¿Dónde me mudo?» (perfiles, filtros, sitio que queda por recurso). Funciones puras sobre los resultados del motor |
| `src/descarga.ts` | CSV del escenario actual para descargar (formato Excel en español) |
| `src/tipos.ts` | Tipos de los datos (`Municipio`, `ZonaSalud`, `Escenario`, `ResultadoMunicipio`...). Debe coincidir con lo que genera `etl/preparar.py` |
| `src/App.tsx` | Estado global y composición de la app |
| `src/componentes/Mapa.tsx` | Mapa MapLibre de los 155 municipios coloreados por tipo |
| `src/componentes/Palancas.tsx` | Controles del escenario (supuestos) |
| `src/componentes/Ficha.tsx` | Ficha de un municipio: vaso, frase y los 4 límites. La cuenta con números va tapada en «Ver la cuenta» |
| `src/componentes/Evolucion.tsx` | Gráfico de evolución de población |
| `src/componentes/Mudanza.tsx` | Pestaña «¿Dónde me mudo?»: perfil, filtros, ranking con frase y comparador |
| `src/componentes/Descarga.tsx` | Bloque «Llévate los datos»: CSV del escenario y tabla maestra (CC BY 4.0) |
| `src/componentes/Metodologia.tsx` | Pestaña «Cómo se calcula»: 4 pasos en lenguaje llano (sin fórmulas), fuentes con enlace y limitaciones. Las fórmulas van tapadas en «Ver la cuenta exacta». Lee las constantes de `motor.ts` y `mudanza.ts` |
| `src/componentes/Validacion.tsx` | Pestaña de validación 2015→2025 |
| `src/componentes/Inicio.tsx` | Portada: la pregunta del reto, el vaso de los 155 y tres puertas (gestor, vecino, ¿es fiable?) |
| `src/componentes/Vaso.tsx` | El dibujo del vaso: el vaso = lo que cabe, el agua = lo que llega; si no cabe, rebosa en rojo. Recibe cifras ya calculadas |
| `src/componentes/Iconos.tsx` | Iconos SVG propios (`<Icono nombre="colegios" />`). Sin librerías de iconos |
| `src/diseno.css` | Estilos del rediseño (3 columnas, vaso, portada, móvil). Va después de `estilo.css` |
| `src/colores.ts` | Paleta de los 4 tipos. Úsala siempre, no metas colores sueltos |
| `src/formato.ts` | Formato español de números y porcentajes |
| `public/datos/` | **Generado** por el ETL. No editar a mano |

## Reglas

- Comandos: `npm run dev`, `npm run lint`, `npm run build`. Antes de cerrar un cambio: lint y build sin errores.
- Lógica de cálculo solo en `motor.ts` (funciones puras); el ranking ciudadano, en `mudanza.ts`, se apoya en sus resultados. Los componentes no hacen cuentas del modelo.
- TypeScript estricto: nada de `any`; si falta un tipo, añádelo a `tipos.ts`.
- No añadas dependencias salvo que sea imprescindible para la demo; nada de librerías de UI pesadas.
- Debe verse bien en portátil y móvil (el jurado puede abrirla en el móvil).
- Textos de UI en español llano, cifras con `formato.ts`.
- No leas `public/datos/limites.geojson` entero (es grande): inspecciona su estructura con un script o las primeras líneas.
