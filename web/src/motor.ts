// El motor de CABIDA: hace las cuentas cada vez que el usuario mueve una palanca.
// Va en el navegador para que el recálculo sea instantáneo y no haga falta servidor.

import type { Escenario, Municipio, ResultadoMunicipio } from './tipos'

export const ANIO_BASE = 2025
/** Personas que ganaron los 155 municipios en 2015-2025 (Padrón, INE). */
export const CRECIMIENTO_DECADA = 134_426
/** Escenario por defecto: seguir al ritmo de la última década. */
export const RITMO_ANUAL = CRECIMIENTO_DECADA / 10

export function escenarioPorDefecto(anio = 2035): Escenario {
  return { anio, personas: Math.round(RITMO_ANUAL * (anio - ANIO_BASE)) }
}

/**
 * Presión: cuánta gente llega a cada municipio.
 * 1. Crecimiento tendencial: lo que crecería siguiendo su tasa suavizada.
 * 2. Ese crecimiento se usa como "peso" para repartir las personas del escenario.
 */
export function calcularPresion(municipios: Municipio[], esc: Escenario): ResultadoMunicipio[] {
  const anios = esc.anio - ANIO_BASE
  const universo = municipios.filter((m) => m.universo)
  const pesos = universo.map((m) => {
    const p = m.poblacion[String(ANIO_BASE)]
    const g = m.g_suavizada ?? 0
    // Los que pierden población no "atraen" a nadie: peso 0
    return Math.max(0, p * ((1 + g) ** anios - 1))
  })
  const topes = universo.map(() => Infinity) // hoy sin tope; mañana, la capacidad
  const llegan = repartirConTope(esc.personas, pesos, topes)
  return universo.map((m, i) => {
    const p = m.poblacion[String(ANIO_BASE)]
    return { ine: m.ine, poblacion: p, llegan: llegan[i], crecimiento: llegan[i] / p }
  })
}

/**
 * Reparte `total` en proporción a `pesos` sin pasar de `topes`.
 * Lo que no cabe en un municipio lleno se reparte otra vez entre los que tienen sitio.
 * Es el mismo algoritmo que etl/validacion.py (allí se comprueba contra 2015-2025).
 */
export function repartirConTope(total: number, pesos: number[], topes: number[]): number[] {
  const asignado = pesos.map(() => 0)
  const libre = pesos.map((w) => w > 0)
  let resto = total
  for (let vuelta = 0; vuelta < pesos.length && resto > 1e-9; vuelta++) {
    const sumaPesos = pesos.reduce((s, w, i) => (libre[i] ? s + w : s), 0)
    if (sumaPesos === 0) break
    let alguienLleno = false
    const reparto = pesos.map((w, i) => (libre[i] ? (resto * w) / sumaPesos : 0))
    for (let i = 0; i < pesos.length; i++) {
      if (libre[i] && reparto[i] >= topes[i] - asignado[i]) {
        asignado[i] = topes[i] // se llena y sale del reparto
        libre[i] = false
        alguienLleno = true
      }
    }
    if (!alguienLleno) {
      reparto.forEach((r, i) => (asignado[i] += r))
      break
    }
    resto = total - asignado.reduce((s, a) => s + a, 0)
  }
  return asignado
}
