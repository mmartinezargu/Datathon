// El motor de CABIDA: hace las cuentas cada vez que el usuario mueve una palanca.
// Va en el navegador para que el recálculo sea instantáneo y no haga falta servidor.
//
//   presión   = cuánta gente llega (tendencia de cada municipio, escalada al escenario)
//   capacidad = cuánta gente cabe = el menor de 4 límites (ley del mínimo)
//   tipo      = el cruce de las dos: tensión, polo, oportunidad o consolidación

import type { CurvaColegio, Escenario, Inversion, Inversiones, Limite, Municipio, ResultadoMunicipio, Tipo, Traslado, Umbrales, ZonaSalud } from './tipos'

export const ANIO_BASE = 2025
/** Personas que ganaron los 155 municipios en 2015-2025 (Padrón, INE). */
export const CRECIMIENTO_DECADA = 134_426
/** Escenario por defecto: seguir al ritmo de la última década. */
export const RITMO_ANUAL = CRECIMIENTO_DECADA / 10
/** Lo que ganó toda la Comunidad en 2015-2025 y su población a 1/1/2025 (Padrón, INE). */
export const CRECIMIENTO_DECADA_CM = 700_035
export const POBLACION_CM = 7_137_031
/** Previsión de la Comunidad (nota de prensa del 17/02/2025): de 7.001.715 habitantes en 2024 a 8 millones en 2039. */
export const PREVISION_CM = { anio: 2039, poblacion: 8_000_000, desdeAnio: 2024, desdePoblacion: 7_001_715 }

/**
 * Lo que les tocaría a los 155 hasta `anio` con la previsión de la Comunidad, si se llevan la misma parte
 * que en la última década (19 %). Dos cuentas: desde la cifra de 2024 de la nota y desde el Padrón de 2025.
 */
export function segunPrevision(anio: number) {
  const parte = CRECIMIENTO_DECADA / CRECIMIENTO_DECADA_CM
  const p = PREVISION_CM
  const alAnioDesdeNota = (p.poblacion - p.desdePoblacion) / (p.anio - p.desdeAnio)
  const alAnioDesdePadron = (p.poblacion - POBLACION_CM) / (p.anio - ANIO_BASE)
  const anios = anio - ANIO_BASE
  return { parte, alAnioDesdeNota, alAnioDesdePadron, minimo: parte * alAnioDesdePadron * anios, maximo: parte * alAnioDesdeNota * anios }
}
/** Para no marcar "en tensión" por un puñado de personas. */
export const MARGEN_MINIMO = 25
/** Coste aproximado de construir un colegio y un centro de salud (PENDIENTE.md, tarea 1). */
export const COSTE_COLEGIO = 9_500_000
export const COSTE_CENTRO_SALUD = 8_000_000
/** Plazo orientativo hasta que abre, en años [est.]. */
export const PLAZO_COLEGIO_ANIOS = 2
export const PLAZO_CENTRO_SALUD_ANIOS = 3
/** Más lejos que esto, una oportunidad queda «condicionada»: unos 30 min en coche [est.]. */
export const HOSPITAL_LEJOS_KM = 25
/** Reubicación: hasta qué distancia (en línea recta entre núcleos) se busca un pueblo con sitio. */
export const RADIO_REUBICACION_KM = 25
export const SIN_INVERSION: Inversion = { colegios: 0, centros: 0 }

export function escenarioPorDefecto(anio = 2035): Escenario {
  return {
    anio,
    personas: Math.round(RITMO_ANUAL * (anio - ANIO_BASE)),
    pctSuelo: 0.5,
    pctVivienda: 0.15,
    ritmoMax: 0.03,
    exigencia: 0.9,
    reequilibrio: false,
    radioKm: RADIO_REUBICACION_KM,
  }
}

export function calcular(municipios: Municipio[], zonas: ZonaSalud[], esc: Escenario, inversiones: Inversiones = {}): ResultadoMunicipio[] {
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
    const limites = calcularLimites(m, esc, anios, umbrales, inversiones[m.ine])
    const [limitante, caben] = minimo(limites)
    return { ine: m.ine, poblacion: p, llegan: llegan[i], crecimiento: llegan[i] / p, limites, caben, limitante, margen: caben - llegan[i] }
  })
  // Lo que cabría en cada uno sin invertir: las fronteras de los tipos salen de aquí (paso 3)
  const cabenSinInvertir = universo.map((m, i) =>
    inversiones[m.ine] ? minimo(calcularLimites(m, esc, anios, umbrales, SIN_INVERSION))[1] : parciales[i].caben)

  // 3. Tipo: las fronteras son las medianas de los 155 (presión y capacidad relativas a su tamaño).
  // Se calcula siempre con lo que llega por tendencia, también con la reubicación activa:
  // si no, los municipios llenos quedarían con margen 0 y el mapa escondería dónde falta sitio.
  const medPresion = mediana(parciales.map((r) => r.crecimiento))
  // Con el escenario sin inversiones: así, invertir en un municipio no cambia el tipo de otro
  const medCapacidad = mediana(parciales.map((r, i) => cabenSinInvertir[i] / r.poblacion))
  const conTipo = parciales.map((r, i) => {
    const tipo = clasificar(r, medPresion, medCapacidad)
    return { ...r, tipo, condicionada: tipo === 'oportunidad' && universo[i].hospital_km > HOSPITAL_LEJOS_KM,
      recibe: 0, envia: 0, envios: [], llegadas: [] }
  })

  // 4. Reubicación (si se activa): lo que no cabe va a los pueblos cercanos con sitio
  return esc.reequilibrio ? reubicar(conTipo, universo, esc.radioKm) : conTipo
}

/**
 * Reubicación en pueblos cercanos: quien no cabe en su municipio va al pueblo con sitio más cercano.
 *   1. Se toman todas las parejas (municipio con exceso, municipio con sitio) a ≤ radioKm, en línea recta entre núcleos.
 *   2. Se ordenan de la más cercana a la más lejana y, en ese orden, se traslada lo que se pueda:
 *      mín(exceso que le queda al origen, sitio que le queda al destino).
 * Ningún pueblo con el hospital a más de HOSPITAL_LEJOS_KM recibe a nadie, sea del tipo que sea (no solo las oportunidades
 * condicionadas). Lo que no encuentra sitio cerca se queda sin sitio.
 * No cambia ni lo que llega por tendencia, ni el margen, ni el tipo: solo añade los traslados.
 */
export function reubicar(resultados: ResultadoMunicipio[], municipios: Municipio[], radioKm: number): ResultadoMunicipio[] {
  const nucleo = new Map(municipios.map((m) => [m.ine, m]))
  const exceso = new Map(resultados.filter((r) => r.margen < 0).map((r) => [r.ine, -r.margen]))
  const sitio = new Map(resultados.filter((r) => r.margen > 0 && nucleo.get(r.ine)!.hospital_km <= HOSPITAL_LEJOS_KM).map((r) => [r.ine, r.margen]))

  const parejas: Traslado[] = []
  for (const origen of exceso.keys()) {
    const a = nucleo.get(origen)!
    for (const destino of sitio.keys()) {
      const b = nucleo.get(destino)!
      const km = Math.hypot(a.nucleo_x - b.nucleo_x, a.nucleo_y - b.nucleo_y)
      if (km <= radioKm) parejas.push({ origen, destino, personas: 0, km })
    }
  }
  // De la más cercana a la más lejana (a igual distancia, por código INE, para que salga siempre igual)
  parejas.sort((p, q) => p.km - q.km || p.origen.localeCompare(q.origen) || p.destino.localeCompare(q.destino))

  const traslados: Traslado[] = []
  for (const p of parejas) {
    const personas = Math.min(exceso.get(p.origen)!, sitio.get(p.destino)!)
    if (personas <= 0) continue
    exceso.set(p.origen, exceso.get(p.origen)! - personas)
    sitio.set(p.destino, sitio.get(p.destino)! - personas)
    traslados.push({ ...p, personas })
  }

  return resultados.map((r) => {
    const envios = traslados.filter((t) => t.origen === r.ine).sort((p, q) => q.personas - p.personas)
    const llegadas = traslados.filter((t) => t.destino === r.ine).sort((p, q) => q.personas - p.personas)
    const suma = (lista: Traslado[]) => lista.reduce((s, t) => s + t.personas, 0)
    return { ...r, envios, llegadas, envia: suma(envios), recibe: suma(llegadas) }
  })
}

/** Personas que llegan y siguen sin sitio en el municipio, después de reubicar las que se puedan. */
export function quedanSinSitio(r: ResultadoMunicipio): number {
  return Math.max(0, -r.margen) - r.envia
}

/** Resumen de la reubicación para los 155: cuántos se mueven, a cuántos pueblos y a qué distancia media. */
export function resumenReubicacion(resultados: ResultadoMunicipio[]) {
  const traslados = resultados.flatMap((r) => r.envios).sort((p, q) => q.personas - p.personas)
  const personas = traslados.reduce((s, t) => s + t.personas, 0)
  return {
    personas,
    destinos: new Set(traslados.map((t) => t.destino)).size,
    kmMedio: personas > 0 ? traslados.reduce((s, t) => s + t.personas * t.km, 0) / personas : 0, // media por persona
    traslados,
  }
}

/** Personas que caben según cada recurso. null = ese límite no aplica a este municipio. */
export function calcularLimites(m: Municipio, esc: Escenario, anios: number, u: Umbrales, inv = SIN_INVERSION): Record<Limite, number | null> {
  const c = m.capacidad!
  const p = m.poblacion[String(ANIO_BASE)]

  // Vivienda: parte de las vacías (consumo eléctrico; sin ese dato, estimadas con su zona) + parte de las previstas, por personas por hogar
  const vivienda = (c.viv_vacias * esc.pctVivienda + c.viv_previstas * esc.pctSuelo) * c.personas_hogar

  // Colegios: plazas libres (límite de alumnos por colegio de los de su tamaño − alumnos matriculados), pasadas a personas
  // con los niños de esa edad que viven en el municipio por vecino: quien llega trae los hijos que trae, estudien donde estudien.
  // Si no tiene colegio de ese nivel, sus alumnos van a otro municipio: ese límite no aplica.
  const porNivel = nivelesColegio(m, u, inv.colegios).map((x) => x.caben)
  const colegios = porNivel.length ? Math.min(...porNivel) : null

  // Sanidad: sitio libre en su zona básica de salud, repartido según el peso del municipio en la zona.
  // Si la zona ya está por encima del límite, la parte del municipio en ese exceso es negativa:
  // cada centro de salud nuevo suma lo que aguanta una zona, pero primero tiene que cubrir ese exceso.
  const libreZona = (u.zonaSalud - c.zbs_poblacion) * Math.min(1, p / c.zbs_poblacion)
  const sanidad = Math.max(0, libreZona + inv.centros * u.zonaSalud)

  // Ritmo: un municipio no absorbe más de un X % al año sin colapsar, aunque tenga suelo
  const ritmo = p * ((1 + esc.ritmoMax) ** anios - 1)

  return { vivienda, colegios, sanidad, ritmo }
}

/**
 * Límites de saturación: hasta dónde se puede cargar un colegio o un centro de salud.
 * - Colegios: alumnos matriculados por colegio frente al tamaño del municipio, con una curva continua (sin tramos):
 *   recta de log(alumnos por colegio) sobre log(población) en los 155 que tienen colegio de ese nivel,
 *   subida hasta el percentil «exigencia» de lo que se aparta cada uno de la recta.
 * - Sanidad: un único límite para todas las zonas, el percentil «exigencia» de la población de las 286.
 * Con 0,9: un colegio está lleno cuando tiene tantos alumnos como el 10 % más cargado de los de su tamaño.
 */
export function calcularUmbrales(universo: Municipio[], zonas: ZonaSalud[], exigencia: number): Umbrales {
  const curva = (nivel: 'primaria' | 'secundaria'): CurvaColegio => {
    const puntos = universo
      .filter((m) => m.capacidad![`colegios_${nivel}`] > 0 && m.capacidad![`alumnos_${nivel}`] > 0)
      .map((m) => ({ x: Math.log(m.poblacion[String(ANIO_BASE)]), y: Math.log(m.capacidad![`alumnos_${nivel}`] / m.capacidad![`colegios_${nivel}`]) }))
    const mx = puntos.reduce((s, q) => s + q.x, 0) / puntos.length
    const my = puntos.reduce((s, q) => s + q.y, 0) / puntos.length
    const b = puntos.reduce((s, q) => s + (q.x - mx) * (q.y - my), 0) / puntos.reduce((s, q) => s + (q.x - mx) ** 2, 0)
    const a = my - b * mx
    return { a, b, ajuste: percentil(puntos.map((q) => q.y - (a + b * q.x)), exigencia) }
  }
  return { primaria: curva('primaria'), secundaria: curva('secundaria'), zonaSalud: percentil(zonas.map((z) => z.poblacion), exigencia) }
}

/** Alumnos por colegio que aguantan los colegios de un municipio de este tamaño. */
export function limiteColegio(curva: CurvaColegio, poblacion: number): number {
  return Math.exp(curva.a + curva.b * Math.log(poblacion) + curva.ajuste)
}

/**
 * Colegios de cada nivel (primaria, secundaria) con su límite y el sitio que dejan, contando los que se construyan.
 * Solo los niveles que ya tiene el municipio. Cada colegio nuevo suma «límite» plazas y va al nivel con menos sitio.
 * - Plazas libres: con los alumnos matriculados (ALMUDENA), que es lo que llena los colegios.
 * - De plazas a personas: con los niños residentes de esa edad por vecino (Censo anual), no con los alumnos por vecino.
 *   Si no, un instituto con pocos alumnos porque la mayoría estudia fuera daría cientos de personas por plaza.
 */
export function nivelesColegio(m: Municipio, u: Umbrales, nuevos = 0) {
  const c = m.capacidad!
  const p = m.poblacion[String(ANIO_BASE)]
  const niveles = (['primaria', 'secundaria'] as const)
    .filter((nombre) => c[`colegios_${nombre}`] > 0 && c[`alumnos_${nombre}`] > 0)
    .map((nombre) => ({ nombre, n: c[`colegios_${nombre}`], limite: limiteColegio(u[nombre], p), alumnos: c[`alumnos_${nombre}`], ninosPorVecino: c[`ninos_${nombre}`] / p }))
  const caben = (x: (typeof niveles)[number]) => Math.max(0, x.n * x.limite - x.alumnos) / x.ninosPorVecino
  for (let k = 0; k < nuevos && niveles.length; k++) {
    niveles.reduce((a, b) => (caben(a) <= caben(b) ? a : b)).n++
  }
  return niveles.map((x) => ({ ...x, libres: x.n * x.limite - x.alumnos, caben: caben(x) }))
}

/**
 * Si no cabe nadie por colegios o por sanidad: cuánta carga tiene hoy ese recurso, su límite y cuánto se pasa.
 * En colegios, el nivel que más se pasa (hasta que no baje de su límite no hay sitio). null = tiene sitio.
 */
export function alLimite(r: ResultadoMunicipio, m: Municipio, u: Umbrales, inv = SIN_INVERSION) {
  if (r.caben >= 1) return null
  if (r.limitante === 'colegios') {
    const x = nivelesColegio(m, u, inv.colegios)
      .map((n) => ({ ...n, hoy: n.alumnos / n.n }))
      .reduce((a, b) => (a.hoy / a.limite >= b.hoy / b.limite ? a : b))
    return { recurso: 'colegios' as const, nivel: x.nombre, centros: x.n, hoy: x.hoy, limite: x.limite, exceso: x.hoy / x.limite - 1 }
  }
  if (r.limitante === 'sanidad') {
    const hoy = m.capacidad!.zbs_poblacion
    return { recurso: 'sanidad' as const, nivel: null, centros: 1, hoy, limite: u.zonaSalud, exceso: hoy / u.zonaSalud - 1 }
  }
  return null
}

/** Coste de lo que se decide construir en un municipio, en euros. */
export function costeInversion(inv: Inversion): number {
  return inv.colegios * COSTE_COLEGIO + inv.centros * COSTE_CENTRO_SALUD
}

/** Plazo orientativo hasta que esté todo abierto: el de la obra más larga (se construyen a la vez). */
export function plazoInversion(inv: Inversion): number {
  return Math.max(inv.colegios ? PLAZO_COLEGIO_ANIOS : 0, inv.centros ? PLAZO_CENTRO_SALUD_ANIOS : 0)
}

/** Los límites que le tocan a un municipio concreto (para explicar la cuenta en su ficha). */
export function umbralesDe(m: Municipio, u: Umbrales) {
  const p = m.poblacion[String(ANIO_BASE)]
  return { primaria: limiteColegio(u.primaria, p), secundaria: limiteColegio(u.secundaria, p), zona: u.zonaSalud }
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
