// Textos de las dos formas de medir lo lejos que queda algo (interruptor «Medir en» de las palancas):
//   'min' = minutos en coche, sin tráfico (OSRM sobre OpenStreetMap)
//   'km'  = km en línea recta (los textos de siempre)
// Solo textos: la regla (qué queda lejos) está en hospitalLejos de motor.ts.

import { HOSPITAL_LEJOS_KM, HOSPITAL_LEJOS_MIN } from './motor'
import type { Medida, Municipio, Traslado } from './tipos'
import { decimal, miles } from './formato'

export const MEDIDAS: Record<Medida, { nombre: string; como: string; unidad: string; lejos: number }> = {
  min: { nombre: 'Minutos en coche', como: 'en coche, sin tráfico', unidad: 'min', lejos: HOSPITAL_LEJOS_MIN },
  km: { nombre: 'Km en línea recta', como: 'en línea recta', unidad: 'km', lejos: HOSPITAL_LEJOS_KM },
}

/** «30 min» o «25 km»: el umbral de «hospital lejos». */
export function umbralHospital(medida: Medida): string {
  return `${miles(MEDIDAS[medida].lejos)} ${MEDIDAS[medida].unidad}`
}

/** El hospital más cercano según la medida: con minutos, el que queda antes en coche (puede no ser el de la línea recta). */
export function hospitalCercano(m: Municipio, medida: Medida): { municipio: string; distancia: string } {
  return medida === 'min'
    ? { municipio: m.hospital_min_municipio, distancia: `${miles(m.hospital_min)} min` }
    : { municipio: m.hospital_municipio, distancia: `${decimal(m.hospital_km)} km` }
}

/** «Hospital más cercano: Arganda del Rey, a 23 min en coche, sin tráfico» (o «a 12,3 km en línea recta»). */
export function textoHospital(m: Municipio, medida: Medida): string {
  const h = hospitalCercano(m, medida)
  return `Hospital más cercano: ${h.municipio}, a ${h.distancia} ${MEDIDAS[medida].como}`
}

/** Distancia de un traslado: «12 min» en coche o «9 km» en línea recta. */
export function distanciaTraslado(t: Traslado, medida: Medida): string {
  return medida === 'min' && t.min !== null ? `${miles(t.min)} min` : `${miles(t.km)} km`
}

/** Radio de la reubicación: «30 min en coche» o «25 km». */
export function radioReubicacion(esc: { medida: Medida; radioKm: number; radioMin: number }): string {
  return esc.medida === 'min' ? `${esc.radioMin} min en coche` : `${esc.radioKm} km`
}
