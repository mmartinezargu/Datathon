# web/ — aplicación CABIDA

React 19 + TypeScript + Vite + MapLibre GL 5. Web estática: sin backend, sin llamadas a APIs externas en tiempo de ejecución.

## Mapa del código

| Archivo | Rol |
|---|---|
| `src/motor.ts` | Motor de cálculo: presión, capacidad (ley del mínimo de 4 límites) y tipo. Se recalcula al mover palancas, debe ser instantáneo |
| `src/tipos.ts` | Tipos de los datos (`Municipio`, `ZonaSalud`, `Escenario`, `ResultadoMunicipio`...). Debe coincidir con lo que genera `etl/preparar.py` |
| `src/App.tsx` | Estado global y composición de la app |
| `src/componentes/Mapa.tsx` | Mapa MapLibre de los 155 municipios coloreados por tipo |
| `src/componentes/Palancas.tsx` | Controles del escenario (supuestos) |
| `src/componentes/Ficha.tsx` | Ficha de un municipio con la cuenta detallada |
| `src/componentes/Evolucion.tsx` | Gráfico de evolución de población |
| `src/componentes/Validacion.tsx` | Pestaña de validación 2015→2025 |
| `src/colores.ts` | Paleta de los 4 tipos. Úsala siempre, no metas colores sueltos |
| `src/formato.ts` | Formato español de números y porcentajes |
| `public/datos/` | **Generado** por el ETL. No editar a mano |

## Reglas

- Comandos: `npm run dev`, `npm run lint`, `npm run build`. Antes de cerrar un cambio: lint y build sin errores.
- Lógica de cálculo solo en `motor.ts` (funciones puras). Los componentes no hacen cuentas del modelo.
- TypeScript estricto: nada de `any`; si falta un tipo, añádelo a `tipos.ts`.
- No añadas dependencias salvo que sea imprescindible para la demo; nada de librerías de UI pesadas.
- Debe verse bien en portátil y móvil (el jurado puede abrirla en el móvil).
- Textos de UI en español llano, cifras con `formato.ts`.
- No leas `public/datos/limites.geojson` entero (es grande): inspecciona su estructura con un script o las primeras líneas.
