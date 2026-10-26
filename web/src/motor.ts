// El motor de CABIDA: hace las cuentas cada vez que el usuario mueve una palanca.
// Va en el navegador para que el recálculo sea instantáneo y no haga falta servidor.
//
//   presión   = cuánta gente llega (tendencia de cada municipio, escalada al escenario)
//   capacidad = cuánta gente cabe = el menor de 4 límites (ley del mínimo)
//   tipo      = el cruce de las dos: tensión, polo, oportunidad o consolidación

import type { CurvaColegio, Escenario, Inversion, Inversiones, Limite, Municipio, Obra, OpcionesPlan, ParametrosPlan, ResultadoMunicipio, ResultadoPlan, Tipo, TipoObra, Traslado, Umbrales, ZonaSalud } from './tipos'

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
/** Más lejos que esto, una oportunidad queda «condicionada»: unos 30 min en coche [est.]. */
export const HOSPITAL_LEJOS_KM = 25
/** Reubicación: hasta qué distancia (en línea recta entre núcleos) se busca un pueblo con sitio. */
export const RADIO_REUBICACION_KM = 25
export const SIN_INVERSION: Inversion = { plazasPrimaria: 0, plazasSecundaria: 0, centros: 0, personasSanidad: 0 }

/**
 * Valores por defecto del plan, sacados de obras reales de la Comunidad (fuentes en fuentesPlan.ts).
 * - Ampliar un colegio: una línea (9 aulas de 25), a 6.000 €/plaza (CEIP María Blanchard: 2,8 M€ por 475 plazas).
 * - Colegio nuevo: 450 plazas a 12.900 €/plaza (CEIP Isabel la Católica: 5,8 M€ por 450 plazas).
 * - Instituto: 880 plazas a 16.600 €/plaza (IES Los Molinos: 14,6 M€ por 880 plazas).
 * - Centro de salud: 7,1 M€ (16 centros por 113,8 M€) y atiende a 23.078 personas, la mediana de las 286 zonas.
 */
export const PARAMETROS_PLAN: ParametrosPlan = {
  obras: {
    ampliar_primaria: { plazas: 225, eurosPorPlaza: 6_000, anios: 2 },
    colegio_primaria: { plazas: 450, eurosPorPlaza: 12_900, anios: 3 },
    instituto: { plazas: 880, eurosPorPlaza: 16_600, anios: 3 },
    centro_salud: { plazas: 23_078, eurosPorPlaza: 7_100_000, anios: 3 },
  },
  anioInicio: 2027,
}

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

/**
 * Con tiposConPlan (un plan cargado en el mapa), el tipo se calcula con lo que falta DESPUÉS de reubicar y con las obras
 * (tiposDespues). Sin plan, con lo que llega por tendencia, como siempre.
 */
export function calcular(municipios: Municipio[], zonas: ZonaSalud[], esc: Escenario, inversiones: Inversiones = {},
  opciones: { tiposConPlan?: boolean } = {}): ResultadoMunicipio[] {
  const anios = esc.anio - ANIO_BASE
  const universo = municipios.filter((m) => m.universo && m.capacidad)
  const hoy = (m: Municipio) => m.poblacion[String(ANIO_BASE)]
  const umbrales = calcularUmbrales(universo, zonas, esc.exigencia)
  // Un centro de salud nuevo sirve a toda su zona: cada municipio cuenta los de su zona
  const deZona = inversionesPorZona(inversiones, universo)

  // 1. Presión: el crecimiento tendencial de cada uno sirve de "peso" para repartir el escenario
  const pesos = universo.map((m) => Math.max(0, hoy(m) * ((1 + (m.g_suavizada ?? 0)) ** anios - 1)))
  const llegan = repartirConTope(esc.personas, pesos, pesos.map(() => Infinity))

  // 2. Capacidad de cada uno
  const parciales = universo.map((m, i) => {
    const p = hoy(m)
    const limites = calcularLimites(m, esc, anios, umbrales, deZona[m.ine])
    const [limitante, caben] = minimo(limites)
    return { ine: m.ine, poblacion: p, llegan: llegan[i], crecimiento: llegan[i] / p, limites, caben, limitante, margen: caben - llegan[i] }
  })
  // Lo que cabría en cada uno sin invertir: las fronteras de los tipos salen de aquí (paso 3)
  const cabenSinInvertir = universo.map((m, i) =>
    deZona[m.ine] ? minimo(calcularLimites(m, esc, anios, umbrales, SIN_INVERSION))[1] : parciales[i].caben)

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
  const resultados = esc.reequilibrio ? reubicar(conTipo, universo, esc.radioKm) : conTipo
  return opciones.tiposConPlan ? tiposDespues(resultados, universo, medPresion, medCapacidad) : resultados
}

/**
 * Tipos con un plan cargado: con lo que falta después de reubicar y con las obras.
 * En tensión, si siguen sin sitio MARGEN_MINIMO personas o más; si no, polo si crece mucho, y oportunidad si le queda
 * mucho sitio después de recibir a la gente reubicada. Las fronteras son las mismas medianas que sin plan.
 */
function tiposDespues(resultados: ResultadoMunicipio[], universo: Municipio[], medP: number, medC: number): ResultadoMunicipio[] {
  return resultados.map((r, i) => {
    const tipo: Tipo = quedanSinSitio(r) >= MARGEN_MINIMO ? 'tension'
      : r.crecimiento >= medP ? 'polo'
      : (r.caben - r.recibe) / r.poblacion >= medC ? 'oportunidad'
      : 'consolidacion'
    return { ...r, tipo, condicionada: tipo === 'oportunidad' && universo[i].hospital_km > HOSPITAL_LEJOS_KM }
  })
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
  const traslados = trasladar(parejasCercanas(municipios, radioKm), exceso, sitio)

  return resultados.map((r) => {
    const envios = traslados.filter((t) => t.origen === r.ine).sort((p, q) => q.personas - p.personas)
    const llegadas = traslados.filter((t) => t.destino === r.ine).sort((p, q) => q.personas - p.personas)
    const suma = (lista: Traslado[]) => lista.reduce((s, t) => s + t.personas, 0)
    return { ...r, envios, llegadas, envia: suma(envios), recibe: suma(llegadas) }
  })
}

/** Todas las parejas (origen, destino) a ≤ radioKm, de la más cercana a la más lejana (a igual distancia, por código INE, para que salga siempre igual). */
function parejasCercanas(municipios: Municipio[], radioKm: number): Traslado[] {
  const parejas: Traslado[] = []
  for (const a of municipios) {
    for (const b of municipios) {
      if (a === b) continue
      const km = Math.hypot(a.nucleo_x - b.nucleo_x, a.nucleo_y - b.nucleo_y)
      if (km <= radioKm) parejas.push({ origen: a.ine, destino: b.ine, personas: 0, km })
    }
  }
  return parejas.sort((p, q) => p.km - q.km || p.origen.localeCompare(q.origen) || p.destino.localeCompare(q.destino))
}

/** Recorre las parejas en orden y traslada lo que se pueda; descuenta lo trasladado de exceso y de sitio. */
function trasladar(parejas: Traslado[], exceso: Map<string, number>, sitio: Map<string, number>): Traslado[] {
  const traslados: Traslado[] = []
  for (const p of parejas) {
    const personas = Math.min(exceso.get(p.origen) ?? 0, sitio.get(p.destino) ?? 0)
    if (personas <= 0) continue
    exceso.set(p.origen, exceso.get(p.origen)! - personas)
    sitio.set(p.destino, sitio.get(p.destino)! - personas)
    traslados.push({ ...p, personas })
  }
  return traslados
}

/** Personas que llegan y siguen sin sitio en el municipio, después de reubicar las que se puedan. */
export function quedanSinSitio(r: ResultadoMunicipio): number {
  return Math.max(0, -r.margen) - r.envia
}

/** Las cifras de cabecera del mapa: con la reubicación, lo que va a pueblos cercanos pasa de «sin sitio» a «caben». */
export function cifrasCabecera(resultados: ResultadoMunicipio[]) {
  const reubicadas = resultados.reduce((s, r) => s + r.envia, 0)
  return {
    dentro: resultados.reduce((s, r) => s + Math.min(r.caben, r.llegan), 0) + reubicadas,
    sinSitio: resultados.reduce((s, r) => s + Math.max(0, -r.margen), 0) - reubicadas,
    reubicadas,
  }
}

/** El plan se calcula reubicando en pueblos cercanos: «Ver en el mapa» pone el simulador así. */
export function escenarioDelPlan(esc: Escenario): Escenario {
  return { ...esc, reequilibrio: true }
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
  const porNivel = nivelesColegio(m, u, inv).map((x) => x.caben)
  const colegios = porNivel.length ? Math.min(...porNivel) : null

  // Sanidad: sitio libre en su zona básica de salud, repartido según el peso del municipio en la zona.
  // Los centros de salud nuevos suman a la zona entera (inv trae los de su zona: inversionesPorZona):
  // capacidad de la zona = límite + lo que atienden los centros nuevos; si la zona ya se pasa, primero cubren ese exceso.
  const libreZona = (u.zonaSalud + inv.personasSanidad - c.zbs_poblacion) * Math.min(1, p / c.zbs_poblacion)
  const sanidad = Math.max(0, libreZona)

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
 * Colegios de cada nivel (primaria, secundaria) con su límite y el sitio que dejan, contando las plazas que añada el plan.
 * Solo los niveles que ya tiene el municipio (si no tiene, sus alumnos estudian fuera y ese límite no aplica).
 * - Plazas libres: con los alumnos matriculados (ALMUDENA), que es lo que llena los colegios.
 * - De plazas a personas: con los niños residentes de esa edad por vecino (Censo anual), no con los alumnos por vecino.
 *   Si no, un instituto con pocos alumnos porque la mayoría estudia fuera daría cientos de personas por plaza.
 */
export function nivelesColegio(m: Municipio, u: Umbrales, inv = SIN_INVERSION) {
  const c = m.capacidad!
  const p = m.poblacion[String(ANIO_BASE)]
  const niveles = (['primaria', 'secundaria'] as const)
    .filter((nombre) => c[`colegios_${nombre}`] > 0 && c[`alumnos_${nombre}`] > 0)
    .map((nombre) => ({ nombre, n: c[`colegios_${nombre}`], limite: limiteColegio(u[nombre], p), alumnos: c[`alumnos_${nombre}`], ninosPorVecino: c[`ninos_${nombre}`] / p,
      nuevas: nombre === 'primaria' ? inv.plazasPrimaria : inv.plazasSecundaria }))
  return niveles.map((x) => {
    const libres = x.n * x.limite - x.alumnos + x.nuevas
    return { ...x, libres, caben: Math.max(0, libres) / x.ninosPorVecino }
  })
}

/**
 * Si no cabe nadie por colegios o por sanidad: cuánta carga tiene hoy ese recurso, su límite y cuánto se pasa.
 * En colegios, el nivel que más se pasa (hasta que no baje de su límite no hay sitio). null = tiene sitio.
 */
export function alLimite(r: ResultadoMunicipio, m: Municipio, u: Umbrales, inv = SIN_INVERSION) {
  if (r.caben >= 1) return null
  if (r.limitante === 'colegios') {
    const x = nivelesColegio(m, u, inv)
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


/** Los límites que le tocan a un municipio concreto (para explicar la cuenta en su ficha). */
export function umbralesDe(m: Municipio, u: Umbrales) {
  const p = m.poblacion[String(ANIO_BASE)]
  return { primaria: limiteColegio(u.primaria, p), secundaria: limiteColegio(u.secundaria, p), zona: u.zonaSalud }
}

// ---------------------------------------------------------------------------------------------
// Plan: qué hay que construir para que quepa la gente (pestaña «Plan»)
// ---------------------------------------------------------------------------------------------

/** Lo que cuesta una obra: plazas × €/plaza; un centro de salud, lo que cuesta el centro. */
export function costeObra(o: Obra): number {
  return o.tipo === 'centro_salud' ? o.eurosPorPlaza : o.plazas * o.eurosPorPlaza
}

export function aperturaObra(o: Obra): number {
  return o.inicio + o.anios
}

/** Una obra con los valores por defecto de su tipo. */
export function nuevaObra(ine: string, tipo: TipoObra, params: ParametrosPlan, inicio = params.anioInicio): Obra {
  return { ine, tipo, ...params.obras[tipo], inicio }
}

/** Suma las obras de cada municipio donde se ponen: plazas de primaria, de ESO, y centros de salud con las personas que atienden. */
export function inversionesDe(obras: Obra[]): Inversiones {
  const inv: Inversiones = {}
  for (const o of obras) inv[o.ine] = sumarObra(inv[o.ine] ?? SIN_INVERSION, o)
  return inv
}

/**
 * Un centro de salud sirve a toda su zona básica: a cada municipio le pone los centros (y las personas que atienden) de su zona,
 * estén en el municipio que estén. Las plazas escolares se quedan en su municipio.
 */
export function inversionesPorZona(inversiones: Inversiones, municipios: Municipio[]): Inversiones {
  const zona = (ine: string) => municipios.find((m) => m.ine === ine)?.capacidad?.zbs_codigo
  const centros = new Map<string, { centros: number; personas: number }>()
  for (const [ine, inv] of Object.entries(inversiones)) {
    const z = zona(ine)
    if (!z || !inv.centros) continue
    const antes = centros.get(z) ?? { centros: 0, personas: 0 }
    centros.set(z, { centros: antes.centros + inv.centros, personas: antes.personas + inv.personasSanidad })
  }
  const resultado: Inversiones = {}
  for (const m of municipios) {
    const propia = inversiones[m.ine]
    const deZona = m.capacidad ? centros.get(m.capacidad.zbs_codigo) : undefined
    if (!propia && !deZona) continue
    resultado[m.ine] = { ...(propia ?? SIN_INVERSION), centros: deZona?.centros ?? 0, personasSanidad: deZona?.personas ?? 0 }
  }
  return resultado
}

function sumarObra(inv: Inversion, o: Obra): Inversion {
  return {
    plazasPrimaria: inv.plazasPrimaria + (o.tipo === 'ampliar_primaria' || o.tipo === 'colegio_primaria' ? o.plazas : 0),
    plazasSecundaria: inv.plazasSecundaria + (o.tipo === 'instituto' ? o.plazas : 0),
    centros: inv.centros + (o.tipo === 'centro_salud' ? 1 : 0),
    personasSanidad: inv.personasSanidad + (o.tipo === 'centro_salud' ? o.plazas : 0),
  }
}

/**
 * La obra más barata que suelta el límite de colegios o de sanidad de un municipio (null si no limita ninguno de los dos).
 * - Sanidad: un centro de salud (para toda su zona).
 * - Colegios: en el nivel con menos sitio. Primaria: ampliar un colegio (una línea por colegio que ya tiene) o construir uno,
 *   lo que salga más barato por plaza; con los valores por defecto, ampliar antes que construir. ESO: un instituto.
 */
export function obraQueDesbloquea(m: Municipio, limite: Limite, u: Umbrales, obras: Obra[], params: ParametrosPlan): TipoObra | null {
  if (limite === 'sanidad') return 'centro_salud'
  if (limite !== 'colegios') return null
  const delMunicipio = obras.filter((o) => o.ine === m.ine)
  const niveles = nivelesColegio(m, u, inversionesDe(delMunicipio)[m.ine])
  if (!niveles.length) return null
  const nivel = niveles.reduce((a, b) => (a.caben <= b.caben ? a : b))
  if (nivel.nombre === 'secundaria') return 'instituto'
  const ampliaciones = delMunicipio.filter((o) => o.tipo === 'ampliar_primaria').length
  const p = params.obras
  return ampliaciones < m.capacidad!.colegios_primaria && p.ampliar_primaria.eurosPorPlaza <= p.colegio_primaria.eurosPorPlaza
    ? 'ampliar_primaria' : 'colegio_primaria'
}

/** Para «Planificar aquí» en la ficha: la obra que suelta su límite o, si limita la vivienda o el ritmo, la del servicio más justo. */
export function obraSugerida(m: Municipio, r: ResultadoMunicipio, u: Umbrales, obras: Obra[], params: ParametrosPlan): TipoObra {
  const { colegios, sanidad } = r.limites
  const servicio: Limite = r.limitante === 'colegios' || r.limitante === 'sanidad' ? r.limitante
    : colegios !== null && (sanidad === null || colegios <= sanidad) ? 'colegios' : 'sanidad'
  return obraQueDesbloquea(m, servicio, u, obras, params) ?? 'centro_salud'
}

/**
 * Para medir muchas variantes de un plan deprisa: lo que no depende de las obras (lo que llega, los umbrales, las parejas
 * de pueblos cercanos) se calcula una vez. Da las mismas cifras que calcular (hay test).
 */
function prepararPlan(municipios: Municipio[], zonas: ZonaSalud[], esc: Escenario) {
  const anios = esc.anio - ANIO_BASE
  const universo = municipios.filter((m) => m.universo && m.capacidad)
  const u = calcularUmbrales(universo, zonas, esc.exigencia)
  const llegan = new Map(calcular(municipios, zonas, esc).map((r) => [r.ine, r.llegan]))
  const parejas = esc.reequilibrio ? parejasCercanas(universo, esc.radioKm) : []
  const puedeRecibir = new Set(universo.filter((m) => m.hospital_km <= HOSPITAL_LEJOS_KM).map((m) => m.ine))

  const zonaSalud = new Map<string, Municipio[]>()
  for (const m of universo) zonaSalud.set(m.capacidad!.zbs_codigo, [...(zonaSalud.get(m.capacidad!.zbs_codigo) ?? []), m])
  /** Lo que cabe en cada municipio y qué lo limita, con estas obras (inv: dónde se ponen). Con «solo», solo esos; el resto, de «antes». */
  const capacidad = (inv: Inversiones, solo?: Municipio[], antes?: Map<string, [Limite, number]>) => {
    const deZona = inversionesPorZona(inv, universo)
    const cap = new Map(antes)
    for (const m of solo ?? universo) cap.set(m.ine, minimo(calcularLimites(m, esc, anios, u, deZona[m.ine])))
    return cap
  }
  /** Personas sin sitio en los 155 (después de reubicar, si toca) y lo que le falta a cada municipio. */
  const medir = (cap: Map<string, [Limite, number]>) => {
    const exceso = new Map<string, number>()
    const sitio = new Map<string, number>()
    for (const m of universo) {
      const margen = cap.get(m.ine)![1] - llegan.get(m.ine)!
      if (margen < 0) exceso.set(m.ine, -margen)
      else if (margen > 0 && puedeRecibir.has(m.ine)) sitio.set(m.ine, margen)
    }
    trasladar(parejas, exceso, sitio)
    let sinSitio = 0
    for (const v of exceso.values()) sinSitio += v
    return { sinSitio, falta: exceso }
  }
  return { universo, u, anios, zonaSalud, capacidad, medir, sinSitio: (obras: Obra[]) => medir(capacidad(inversionesDe(obras))).sinSitio }
}

/**
 * Plan óptimo, voraz: en cada paso añade la obra (o el paquete de obras) que más personas hace caber por cada euro.
 * - Candidatas: en cada municipio donde faltan MARGEN_MINIMO personas o más y limitan los colegios o la sanidad, la obra más
 *   barata que suelta su límite (obraQueDesbloquea). Si con ella no cabe nadie más porque otro servicio también está lleno
 *   (colegio y centro de salud, o primaria e instituto), el paquete: esa obra y las siguientes (paqueteQueDesbloquea).
 * - Un centro de salud sirve a toda su zona: se propone uno por zona, en el municipio más poblado de los que tienen falta.
 * - Lo que gana cada candidata es lo que baja la gente sin sitio en los 155 (con la reubicación, si toca), no solo en el suyo:
 *   así un centro cuenta lo que da a toda la zona y, reubicando, lo que libera a los pueblos vecinos.
 * Para cuando ninguna candidata hace caber a MARGEN_MINIMO personas más o no queda presupuesto.
 * Las obras empiezan en params.anioInicio; con presupuesto anual, se escalonan (programarObras).
 */
export function planOptimo(municipios: Municipio[], zonas: ZonaSalud[], esc: Escenario, params: ParametrosPlan,
  opciones: OpcionesPlan = {}): Obra[] {
  const plan = prepararPlan(municipios, zonas, esc)
  const porPoblacion = [...plan.universo].sort((a, b) => b.poblacion[String(ANIO_BASE)] - a.poblacion[String(ANIO_BASE)])
  const solo = opciones.soloMunicipios?.length ? new Set(opciones.soloMunicipios) : null
  const tope = opciones.presupuestoTotal ?? Infinity
  const obras: Obra[] = []
  let gastado = 0

  for (let paso = 0; paso < 500; paso++) {
    const inv = inversionesDe(obras)
    const cap = plan.capacidad(inv)
    const ahora = plan.medir(cap)
    const deZona = inversionesPorZona(inv, plan.universo)
    const centroPropuesto = new Set<string>() // zonas que ya tienen un centro de salud candidato en este paso
    let mejor: { obras: Obra[]; porEuro: number } | null = null

    for (const m of porPoblacion) {
      if ((ahora.falta.get(m.ine) ?? 0) < MARGEN_MINIMO || (solo && !solo.has(m.ine))) continue
      const [limitante, caben] = cap.get(m.ine)!
      const paquete = paqueteQueDesbloquea(m, limitante, caben, deZona[m.ine] ?? SIN_INVERSION, plan, esc, obras, params)
      if (!paquete) continue
      const soloCentro = paquete.length === 1 && paquete[0].tipo === 'centro_salud'
      const zona = m.capacidad!.zbs_codigo
      if (soloCentro && centroPropuesto.has(zona)) continue
      if (soloCentro) centroPropuesto.add(zona)
      const coste = paquete.reduce((s, o) => s + costeObra(o), 0)
      if (coste <= 0 || gastado + coste > tope + 0.5) continue
      // Solo cambia lo que cabe en este municipio y, si hay centro de salud, en los de su zona
      const afectados = paquete.some((o) => o.tipo === 'centro_salud') ? plan.zonaSalud.get(zona)! : [m]
      const gana = ahora.sinSitio - plan.medir(plan.capacidad(inversionesDe([...obras, ...paquete]), afectados, cap)).sinSitio
      if (gana < MARGEN_MINIMO) continue
      if (!mejor || gana / coste > mejor.porEuro) mejor = { obras: paquete, porEuro: gana / coste }
    }
    if (!mejor) break
    obras.push(...mejor.obras)
    gastado += mejor.obras.reduce((s, o) => s + costeObra(o), 0)
  }
  // Las obras de un mismo municipio, juntas (donde salió la primera): se leen mejor y se escalonan igual
  const orden = [...new Set(obras.map((o) => o.ine))]
  const programadas = programarObras(obras, params.anioInicio, opciones.presupuestoAnual)
  return orden.flatMap((ine) => programadas.filter((o) => o.ine === ine))
}

/**
 * La obra que suelta el límite del municipio y, si con ella caben menos de MARGEN_MINIMO personas más en él (otro servicio
 * también está casi lleno), las siguientes, hasta que manda la vivienda o el ritmo (como mucho 4 obras).
 */
function paqueteQueDesbloquea(m: Municipio, limitante: Limite, caben: number, inv: Inversion, plan: ReturnType<typeof prepararPlan>,
  esc: Escenario, obras: Obra[], params: ParametrosPlan): Obra[] | null {
  const paquete: Obra[] = []
  let ahora: [Limite, number] = [limitante, caben]
  while (paquete.length < 4) {
    const tipo = obraQueDesbloquea(m, ahora[0], plan.u, [...obras, ...paquete], params)
    if (!tipo) return null
    const obra = nuevaObra(m.ine, tipo, params)
    paquete.push(obra)
    inv = sumarObra(inv, obra) // inv ya trae los centros de su zona: el nuevo se suma a ellos
    ahora = minimo(calcularLimites(m, esc, plan.anios, plan.u, inv))
    if (ahora[1] >= caben + MARGEN_MINIMO || (ahora[0] !== 'colegios' && ahora[0] !== 'sanidad')) return paquete
  }
  return null
}

/**
 * Año de inicio de cada obra, en el orden de la lista. Sin presupuesto anual, todas en anioInicio.
 * Con presupuesto anual, el coste de cada obra se reparte a partes iguales entre sus años de obra, y cada una empieza
 * el primer año en que cabe sin pasarse en ninguno de ellos (si una sola ya se pasa, empieza cuando esos años están libres).
 */
export function programarObras(obras: Obra[], anioInicio: number, presupuestoAnual?: number): Obra[] {
  if (!presupuestoAnual) return obras.map((o) => ({ ...o, inicio: anioInicio }))
  const gasto = new Map<number, number>()
  return obras.map((o) => {
    const n = Math.max(1, o.anios)
    const alAnio = costeObra(o) / n
    const cabe = (inicio: number) => Array.from({ length: n }, (_, k) => gasto.get(inicio + k) ?? 0)
      .every((g) => g + alAnio <= presupuestoAnual + 0.5 || (g === 0 && alAnio > presupuestoAnual))
    let inicio = anioInicio
    while (!cabe(inicio)) inicio++
    for (let k = 0; k < n; k++) gasto.set(inicio + k, (gasto.get(inicio + k) ?? 0) + alAnio)
    return { ...o, inicio }
  })
}

/** Lo que consigue un plan con este escenario (con o sin reubicar, según esc.reequilibrio). */
export function evaluarPlan(municipios: Municipio[], zonas: ZonaSalud[], esc: Escenario, obras: Obra[]): ResultadoPlan {
  const sinSitioDe = (r: ResultadoMunicipio[]) => r.reduce((s, x) => s + quedanSinSitio(x), 0)
  const base = calcular(municipios, zonas, esc)
  const resultados = obras.length ? calcular(municipios, zonas, esc, inversionesDe(obras)) : base
  const sinSitioAntes = sinSitioDe(base)
  const sinSitio = sinSitioDe(resultados)
  const plan = prepararPlan(municipios, zonas, esc)

  const sinSitioPor: Record<Limite, number> = { vivienda: 0, colegios: 0, sanidad: 0, ritmo: 0 }
  for (const r of resultados) sinSitioPor[r.limitante] += quedanSinSitio(r)

  // Calendario: lo que pasa a caber con las obras abiertas hasta cada año, menos lo del año anterior
  const anios = [...new Set(obras.map(aperturaObra))].sort((a, b) => a - b)
  let previo = sinSitioAntes
  const calendario = anios.map((anio) => {
    const ahora = plan.sinSitio(obras.filter((o) => aperturaObra(o) <= anio))
    const personas = previo - ahora
    previo = ahora
    return { anio, personas }
  })

  // Lo que gana cada obra: lo que baja la gente sin sitio en los 155 al sumarla a las de antes en la lista
  let antes = sinSitioAntes
  const ganaPorObra = obras.map((_, i) => {
    const despues = plan.sinSitio(obras.slice(0, i + 1))
    const gana = antes - despues
    antes = despues
    return gana
  })

  const porTipo: Record<TipoObra, number> = { ampliar_primaria: 0, colegio_primaria: 0, instituto: 0, centro_salud: 0 }
  obras.forEach((o) => porTipo[o.tipo]++)
  return {
    resultados,
    coste: obras.reduce((s, o) => s + costeObra(o), 0),
    obras: porTipo,
    municipios: new Set(obras.map((o) => o.ine)).size,
    sinSitioAntes,
    sinSitio,
    sinSitioPor,
    pasanACaber: sinSitioAntes - sinSitio,
    reubicadas: resultados.reduce((s, r) => s + r.envia, 0),
    ultimaApertura: anios.length ? anios[anios.length - 1] : null,
    calendario,
    ganaPorObra,
  }
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
