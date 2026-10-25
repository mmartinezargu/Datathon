import type { Limite, Tipo } from './tipos'

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
export const COLOR_APAGADO = '#E8EDF2' // municipios que no son del tipo que se ha pulsado en la leyenda

export function colorCrecimiento(c: number): string {
  return ESCALA_CRECIMIENTO.find((t) => c < t.hasta)!.color
}

/** Texto oscuro o claro según el fondo, para que siempre se lea. */
export function textoSobre(color: string): string {
  const oscuros = new Set(['#C9305E', '#6E2A8C', '#EC6A2C'])
  return oscuros.has(color) ? '#FFFFFF' : '#15233B'
}

// Los 4 tipos de municipio: los mismos colores que la propuesta (PDF)

export const TIPOS: Record<Tipo, { color: string; nombre: string; plural: string; que: string }> = {
  tension: { color: '#D7263D', nombre: 'En tensión', plural: 'en tensión', que: 'Llegará más gente de la que cabe: hay que invertir antes.' },
  polo: { color: '#1B998B', nombre: 'Polo de crecimiento', plural: 'polos de crecimiento', que: 'Crece y aguanta: acompañar el crecimiento.' },
  oportunidad: { color: '#2F6FEB', nombre: 'Oportunidad', plural: 'oportunidades', que: 'Hay sitio, pero no llega gente: hacia aquí debe apuntar el reequilibrio.' },
  consolidacion: { color: '#A3B1C2', nombre: 'Consolidación', plural: 'en consolidación', que: 'Crece poco y tiene poco margen: mantener los servicios.' },
}

export const ORDEN_TIPOS: Tipo[] = ['tension', 'polo', 'oportunidad', 'consolidacion']

export const LIMITES: Record<Limite, { nombre: string; frase: string }> = {
  vivienda: { nombre: 'Vivienda y suelo', frase: 'lo que le limita es la vivienda' },
  colegios: { nombre: 'Colegios', frase: 'lo que le limita son los colegios' },
  sanidad: { nombre: 'Sanidad', frase: 'lo que le limita es el centro de salud' },
  ritmo: { nombre: 'Ritmo de crecimiento', frase: 'lo que le limita es el ritmo de crecimiento' },
}
