// Cifras de la validación 2015-2025 (datos/validacion.json, de etl/validacion.py) que se enseñan en la web.

import type { DatosValidacion } from './tipos'

/** El modelo de CABIDA (el último) y el de seguir la tendencia sin más. */
export function modelosClave(datos: DatosValidacion) {
  const nuestro = datos.modelos.at(-1)!
  const tendencia = datos.modelos.find((m) => m.modelo.startsWith('Extrapolar')) ?? datos.modelos[1]
  return { nuestro, tendencia }
}

/** «si se mira por comarcas: las 10 zonas estadísticas de la Comunidad, como Sierra Norte o Sur Metropolitano». Va entre paréntesis. */
export const porComarcas = (comarcas: number) =>
  `si se mira por comarcas: las ${comarcas} zonas estadísticas de la Comunidad, como Sierra Norte o Sur Metropolitano`

/** De cada 100 personas, en cuántas acierta el municipio (o la zona) donde van. */
export const deCada100 = (fuera: number) => Math.round((1 - fuera) * 100)
