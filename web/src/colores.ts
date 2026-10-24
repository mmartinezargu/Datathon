// Escala de color del mapa: cuánto crece cada municipio respecto a su población actual.
// Va del amarillo trigo al morado: cálida y con mucho contraste entre tramos,
// para que se lea de un vistazo y no parezca un mapa "de alarma" en rojo.

export interface Tramo {
  hasta: number // límite superior (0.05 = 5 %)
  color: string
  texto: string
}

export const ESCALA_CRECIMIENTO: Tramo[] = [
  { hasta: 0.05, color: '#FFF1B8', texto: '< 5 %' },
  { hasta: 0.10, color: '#FBD050', texto: '5–10 %' },
  { hasta: 0.15, color: '#F6A229', texto: '10–15 %' },
  { hasta: 0.20, color: '#EC6A2C', texto: '15–20 %' },
  { hasta: 0.30, color: '#C9305E', texto: '20–30 %' },
  { hasta: Infinity, color: '#6E2A8C', texto: '> 30 %' },
]

export const COLOR_FUERA = '#DCE5EE' // municipios fuera del reto (más de 50.000 hab.)

export function colorCrecimiento(c: number): string {
  return ESCALA_CRECIMIENTO.find((t) => c < t.hasta)!.color
}

/** Texto oscuro o claro según el fondo, para que siempre se lea. */
export function textoSobre(color: string): string {
  const oscuros = new Set(['#C9305E', '#6E2A8C', '#EC6A2C'])
  return oscuros.has(color) ? '#FFFFFF' : '#15233B'
}
