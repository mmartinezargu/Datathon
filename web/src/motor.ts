// El motor de CABIDA: hace las cuentas cada vez que el usuario mueve una palanca.
// Va en el navegador para que el recálculo sea instantáneo y no haga falta servidor.
//
//   presión   = cuánta gente llega (tendencia de cada municipio, escalada al escenario)
//   capacidad = cuánta gente cabe = el menor de 4 límites (ley del mínimo)
//   tipo      = el cruce de las dos: tensión, polo, oportunidad o consolidación

import type { Escenario, Limite, Municipio, ResultadoMunicipio, Tipo, Umbrales, ZonaSalud } from './tipos'

export const ANIO_BASE = 2025
/** Personas que ganaron los 155 municipios en 2015-2025 (Padrón, INE). */
export const CRECIMIENTO_DECADA = 134_426
/** Escenario por defecto: seguir al ritmo de la última década. */
export const RITMO_ANUAL = CRECIMIENTO_DECADA / 10
/** Para no marcar "en tensión" por un puñado de personas. */
const MARGEN_MINIMO = 25
/** Tramos de tamaño: un pueblo de 800 vecinos no se compara con uno de 40.000. */
const TRAMOS_MUNICIPIO = [1_000, 5_000, 10_000, 20_000, Infinity]
const TRAMOS_ZONA = [10_000, 25_000, Infinity] // zonas de salud rurales, medias y urbanas

export function escenarioPorDefecto(anio = 2035): Escenario {
  return {
    anio,
    personas: Math.round(RITMO_ANUAL * (anio - ANIO_BASE)),
    pctSuelo: 0.5,
    pctVivienda: 0.15,
    ritmoMax: 0.03,
    exigencia: 0.9,
  }
}

export function calcular(municipios: Municipio[], zonas: ZonaSalud[], esc: Escenario): ResultadoMunicipio[] {
  const anios = esc.anio - ANIO_BASE
  const universo = municipios.filter((m) => m.universo && m.capacidad)
  const hoy = (m: Municipio) => m.poblacion[String(ANIO_BASE)]
  const umbrales = calcularUmbrales(universo, zonas, esc.exigencia)

  // 1. Presión: el crecimiento tendencial de cada uno sirve de "peso" para repartir el escenario
  const pesos = universo.map((m) => Math.max(0, hoy(m) * ((1 + (m.g_suavizada ?? 0)) ** anios - 1)))
  const llegan = repartirConTope(esc.personas, pesos, pesos.map(() => Infinity))

  // 2. Capacidad de cada uno
  const parciales = universo.map((m, i) => {
    const p = hoy(m)
    const limites = calcularLimites(m, esc, anios, umbrales)
    const [limitante, caben] = minimo(limites)
    return { ine: m.ine, poblacion: p, llegan: llegan[i], crecimiento: llegan[i] / p, limites, caben, limitante, margen: caben - llegan[i] }
  })

  // 3. Tipo: las fronteras son las medianas de los 155 (presión y capacidad relativas a su tamaño)
  const medPresion = mediana(parciales.map((r) => r.crecimiento))
  const medCapacidad = mediana(parciales.map((r) => r.caben / r.poblacion))
  return parciales.map((r) => ({ ...r, tipo: clasificar(r, medPresion, medCapacidad) }))
}

/** Personas que caben según cada recurso. null = ese límite no aplica a este municipio. */
export function calcularLimites(m: Municipio, esc: Escenario, anios: number, u: Umbrales): Record<Limite, number | null> {
  const c = m.capacidad!
  const p = m.poblacion[String(ANIO_BASE)]
  const t = tramo(p, TRAMOS_MUNICIPIO)

  // Vivienda: parte de las vacías o secundarias + parte de las previstas, por personas por hogar
  const vivienda = (c.viv_no_principales * esc.pctVivienda + c.viv_previstas * esc.pctSuelo) * c.personas_hogar

  // Colegios: hasta llegar al umbral de habitantes por colegio de los de su tamaño.
  // Si no tiene colegio de ese nivel, sus alumnos van a otro municipio: ese límite no aplica.
  const porNivel = [
    [c.colegios_primaria, u.primaria[t]],
    [c.colegios_secundaria, u.secundaria[t]],
  ].filter(([n]) => n > 0).map(([n, umbral]) => Math.max(0, n * umbral - p))
  const colegios = porNivel.length ? Math.min(...porNivel) : null

  // Sanidad: sitio libre en su zona básica de salud, repartido según el peso del municipio en la zona
  const libreZona = Math.max(0, u.zonaSalud[tramo(c.zbs_poblacion, TRAMOS_ZONA)] - c.zbs_poblacion)
  const sanidad = libreZona * Math.min(1, p / c.zbs_poblacion)

  // Ritmo: un municipio no absorbe más de un X % al año sin colapsar, aunque tenga suelo
  const ritmo = p * ((1 + esc.ritmoMax) ** anios - 1)

  return { vivienda, colegios, sanidad, ritmo }
}

/**
 * Umbral de saturación: hasta dónde se puede cargar un colegio o un centro de salud.
 * Se mira a los de su mismo tamaño y se toma el percentil que diga la palanca "exigencia".
 * Con 0,75: un colegio está lleno cuando atiende a tantos vecinos como el 25 % más cargado.
 */
export function calcularUmbrales(universo: Municipio[], zonas: ZonaSalud[], exigencia: number): Umbrales {
  const porTramo = (filas: { valor: number; tramo: number }[], nTramos: number) =>
    Array.from({ length: nTramos }, (_, t) => percentil(filas.filter((f) => f.tramo === t).map((f) => f.valor), exigencia))
  const ratios = (nivel: 'colegios_primaria' | 'colegios_secundaria') =>
    universo
      .filter((m) => m.capacidad![nivel] > 0)
      .map((m) => {
        const p = m.poblacion[String(ANIO_BASE)]
        return { valor: p / m.capacidad![nivel], tramo: tramo(p, TRAMOS_MUNICIPIO) }
      })
  return {
    primaria: porTramo(ratios('colegios_primaria'), TRAMOS_MUNICIPIO.length),
    secundaria: porTramo(ratios('colegios_secundaria'), TRAMOS_MUNICIPIO.length),
    zonaSalud: porTramo(zonas.map((z) => ({ valor: z.poblacion, tramo: tramo(z.poblacion, TRAMOS_ZONA) })), TRAMOS_ZONA.length),
  }
}

/** Los umbrales que le tocan a un municipio concreto (para explicar la cuenta en su ficha). */
export function umbralesDe(m: Municipio, u: Umbrales) {
  const t = tramo(m.poblacion[String(ANIO_BASE)], TRAMOS_MUNICIPIO)
  return { primaria: u.primaria[t], secundaria: u.secundaria[t], zona: u.zonaSalud[tramo(m.capacidad!.zbs_poblacion, TRAMOS_ZONA)] }
}

function tramo(poblacion: number, cortes: number[]): number {
  return cortes.findIndex((c) => poblacion < c)
}

/** Percentil con interpolación lineal (igual que pandas.quantile). */
function percentil(v: number[], q: number): number {
  if (!v.length) return 0
  const s = [...v].sort((a, b) => a - b)
  const pos = (s.length - 1) * q
  const i = Math.floor(pos)
  return i + 1 < s.length ? s[i] + (s[i + 1] - s[i]) * (pos - i) : s[i]
}

function minimo(limites: Record<Limite, number | null>): [Limite, number] {
  let mejor: [Limite, number] = ['ritmo', Infinity]
  for (const [k, v] of Object.entries(limites) as [Limite, number | null][]) {
    if (v !== null && v < mejor[1]) mejor = [k, v]
  }
  return mejor
}

function clasificar(r: { llegan: number; caben: number; crecimiento: number; poblacion: number }, medP: number, medC: number): Tipo {
  if (r.llegan - r.caben >= MARGEN_MINIMO) return 'tension'
  if (r.crecimiento >= medP) return 'polo'
  if (r.caben / r.poblacion >= medC) return 'oportunidad'
  return 'consolidacion'
}

function mediana(v: number[]): number {
  const s = [...v].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
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
