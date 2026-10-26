// «¿Dónde me mudo?»: ordena los municipios según lo que necesita cada tipo de vecino.
// Solo usa lo que ya calcula el motor: cuánto sitio les queda a los colegios, al centro de salud
// y a la vivienda después de que llegue la gente prevista. No hay precios ni tiempos de viaje.

import type { Candidato, FiltrosMudanza, LecturaFrase, Medida, Municipio, Perfil, Recurso, ResultadoMunicipio, Tamano } from './tipos'
import { miles } from './formato'
import { hospitalLejos } from './motor'
import { MEDIDAS, umbralHospital } from './medida'

export const PERFILES: Record<Perfil, { nombre: string; que: string; pesos: Record<Recurso, number> }> = {
  familia: { nombre: 'Familia con hijos', que: 'Colegios con sitio, centro de salud y casa.', pesos: { colegios: 0.45, sanidad: 0.25, vivienda: 0.3 } },
  teletrabajo: { nombre: 'Teletrabajo', que: 'Sobre todo, que haya casa disponible.', pesos: { colegios: 0, sanidad: 0.3, vivienda: 0.7 } },
  mayor: { nombre: 'Persona mayor', que: 'Sobre todo, un centro de salud sin saturar.', pesos: { colegios: 0, sanidad: 0.75, vivienda: 0.25 } },
}

export const TAMANOS: Record<Tamano, { nombre: string; desde: number; hasta: number }> = {
  todos: { nombre: 'Da igual', desde: 0, hasta: Infinity },
  pueblo: { nombre: 'Pueblo', desde: 0, hasta: 5_000 },
  mediano: { nombre: 'Mediano', desde: 5_000, hasta: 20_000 },
  grande: { nombre: 'Grande', desde: 20_000, hasta: Infinity },
}

export const FILTROS_INICIALES: FiltrosMudanza = { perfil: 'familia', colegio: true, instituto: false, sitioLibre: true, hospitalCerca: false, zona: null, tamano: 'todos' }

/** Al cambiar de perfil: una familia quiere colegio y una persona mayor, el hospital cerca; los demás, por defecto, no lo piden. */
export function cambiarPerfil(f: FiltrosMudanza, perfil: Perfil): FiltrosMudanza {
  return { ...f, perfil, colegio: perfil === 'familia', instituto: perfil === 'familia' && f.instituto, hospitalCerca: perfil === 'mayor' }
}

const RECURSOS: Recurso[] = ['colegios', 'sanidad', 'vivienda']

/** Personas que aún caben en cada recurso cuando ya ha llegado la gente prevista. */
export function sitioQueda(r: ResultadoMunicipio): Record<Recurso, number | null> {
  return Object.fromEntries(RECURSOS.map((k) => [k, r.limites[k] === null ? null : r.limites[k]! - r.llegan])) as Record<Recurso, number | null>
}

/** «Hospital cerca» usa la medida del escenario (minutos en coche o km en línea recta). */
export function cumpleFiltros(r: ResultadoMunicipio, m: Municipio, f: FiltrosMudanza, medida: Medida): boolean {
  const c = m.capacidad!
  const t = TAMANOS[f.tamano]
  return (!f.colegio || c.colegios_primaria > 0)
    && (!f.instituto || c.colegios_secundaria > 0)
    && (!f.sitioLibre || r.margen >= 0)
    && (!f.hospitalCerca || !hospitalLejos(m, medida))
    && (!f.zona || m.zona === f.zona)
    && r.poblacion >= t.desde && r.poblacion < t.hasta
}

/**
 * Ranking: para cada recurso se ordenan los municipios por el sitio que les queda en proporción
 * a sus vecinos (así un pueblo y una ciudad se comparan igual) y se suman las posiciones con los
 * pesos del perfil. 100 = el mejor de los que pasan los filtros en todo lo que le importa al perfil.
 */
export function rankingMudanza(resultados: ResultadoMunicipio[], porIne: Map<string, Municipio>, f: FiltrosMudanza, medida: Medida): Candidato[] {
  const filas = resultados.filter((r) => cumpleFiltros(r, porIne.get(r.ine)!, f, medida))
  const pesos = PERFILES[f.perfil].pesos
  const sitios = filas.map(sitioQueda)
  const posicion = Object.fromEntries(RECURSOS.map((k) =>
    [k, posiciones(filas.map((r, i) => (sitios[i][k] === null ? -Infinity : sitios[i][k]! / r.poblacion)))],
  )) as Record<Recurso, number[]>

  return filas
    .map((r, i) => {
      const aporte = RECURSOS.map((k) => ({ k, v: pesos[k] * posicion[k][i] })).filter((a) => pesos[a.k] > 0)
      return {
        ine: r.ine,
        puntos: Math.round(100 * aporte.reduce((s, a) => s + a.v, 0)),
        sitio: sitios[i],
        razones: aporte.sort((a, b) => b.v - a.v).map((a) => a.k),
      }
    })
    .sort((a, b) => b.puntos - a.puntos)
}

/** Posición de cada valor de 0 (el peor) a 1 (el mejor); los empates comparten posición. */
function posiciones(v: number[]): number[] {
  if (v.length < 2) return v.map(() => 1)
  const ordenados = [...v].sort((a, b) => a - b)
  return v.map((x) => {
    const primero = ordenados.indexOf(x)
    const ultimo = ordenados.lastIndexOf(x)
    return (primero + ultimo) / 2 / (v.length - 1)
  })
}

// ---------- Asistente: de una frase a los filtros ----------
// Sin IA ni internet: busca palabras clave y nombres de municipios en lo que escribe el vecino.

/** Frases de ejemplo para la caja de texto. */
export const EJEMPLOS_FRASE = [
  'Somos 4 y trabajo en Getafe',
  'Estoy jubilado y quiero un pueblo tranquilo',
  'Teletrabajo y busco algo en la Sierra Norte',
]

const NUMEROS: Record<string, number> = { dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8 }
const ARTICULOS = /^(el|la|los|las) /

// Formas de llamar a una zona que no son su nombre oficial
const ALIAS_ZONA: Record<string, string> = {
  'corredor del henares': 'Este Metropolitano',
  'zona sur': 'Sur Metropolitano',
  'zona norte': 'Norte Metropolitano',
  'zona este': 'Este Metropolitano',
  'zona oeste': 'Oeste Metropolitano',
}

/** Minúsculas y sin tildes, para comparar sin fallar por cómo se escriba. */
export function normalizar(t: string): string {
  return t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ')
}

function escaparRegex(t: string): string {
  return t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Posiciones donde aparece `palabra` como palabra entera (no dentro de otra). */
function buscar(texto: string, palabra: string): number[] {
  const re = new RegExp(`(^|[^a-z0-9])${escaparRegex(palabra)}(?=[^a-z0-9]|$)`, 'g')
  return [...texto.matchAll(re)].map((m) => m.index! + m[1].length)
}

/**
 * Formas de nombrar cada municipio: el nombre entero, sin artículo («Escorial») y la primera parte
 * («Alcalá», «Las Rozas»). Las formas cortas que valen para varios municipios se descartan.
 */
function formasDeNombre(municipios: Municipio[]): { forma: string; ine: string }[] {
  const enteras = municipios.map((m) => ({ forma: normalizar(m.nombre), ine: m.ine }))
  const cortas = municipios.flatMap((m) => {
    const n = normalizar(m.nombre)
    const sinArticulo = n.replace(ARTICULOS, '')
    const primeraParte = [n, sinArticulo].map((x) => x.split(/ del? |-/)[0])
    return [...new Set([sinArticulo, ...primeraParte])]
      .filter((f) => f !== n && f.length >= 5)
      .map((forma) => ({ forma, ine: m.ine }))
  })
  const veces = new Map<string, Set<string>>()
  for (const c of cortas) veces.set(c.forma, (veces.get(c.forma) ?? new Set()).add(c.ine))
  const nombres = new Set(enteras.map((e) => e.forma))
  return [...enteras, ...cortas.filter((c) => veces.get(c.forma)!.size === 1 && !nombres.has(c.forma))]
}

/**
 * El municipio que nombra la frase. Si hay varios, gana el que va detrás de «trabajo en» o
 * «cerca de»; si no, el primero. Devuelve también el texto sin los nombres, para que «Campo Real»
 * no se lea como «campo».
 */
function municipioNombrado(texto: string, municipios: Municipio[]): { ine: string | null; resto: string } {
  const encontrados = formasDeNombre(municipios)
    .flatMap(({ forma, ine }) => buscar(texto, forma).map((desde) => ({ desde, hasta: desde + forma.length, ine })))
    .sort((a, b) => (b.hasta - b.desde) - (a.hasta - a.desde))
  const elegidos: typeof encontrados = []
  for (const e of encontrados) {
    if (!elegidos.some((x) => e.desde < x.hasta && x.desde < e.hasta)) elegidos.push(e)
  }
  if (!elegidos.length) return { ine: null, resto: texto }
  elegidos.sort((a, b) => a.desde - b.desde)
  const cerca = elegidos.find((e) => /(trabaj|curro|oficina|cerca|al lado)/.test(texto.slice(Math.max(0, e.desde - 25), e.desde)))
  let resto = texto
  for (const e of elegidos) resto = resto.slice(0, e.desde) + ' '.repeat(e.hasta - e.desde) + resto.slice(e.hasta)
  return { ine: (cerca ?? elegidos[0]).ine, resto }
}

/**
 * Lee una frase como «somos 4 y trabajo en Getafe» y devuelve los filtros que le encajan,
 * con lo que hemos entendido en palabras sencillas para que el vecino lo pueda corregir.
 * La frase describe la situación entera: los filtros parten de cero, salvo el perfil si no se dice.
 */
export function interpretarFrase(frase: string, municipios: Municipio[], actual: FiltrosMudanza, medida: Medida): LecturaFrase {
  const entendido: string[] = []
  const { ine, resto: t } = municipioNombrado(normalizar(frase), municipios)

  // Perfil
  const sinHijos = /\b(sin|no tengo|no tenemos) (hijos|ninos|crios)/.test(t)
  const hijos = !sinHijos && /\b(hij[oa]s?|nin[oa]s?|crio|crios|bebe|bebes|peques|familia)\b/.test(t)
  const instituto = /\b(institut\w*|secundaria|la eso|bachiller\w*|adolescentes?)\b/.test(t)
  const somos = t.match(/\bsomos (\d+|dos|tres|cuatro|cinco|seis|siete|ocho)\b/)
  const cuantos = somos ? (NUMEROS[somos[1]] ?? Number(somos[1])) : 0
  let perfil: Perfil | null = null
  if (hijos || instituto) {
    perfil = 'familia'
    entendido.push(instituto ? 'Con hijos en edad de instituto: buscamos colegio e instituto.' : 'Con niños: buscamos que haya colegio.')
  } else if (!sinHijos && cuantos >= 3) {
    perfil = 'familia'
    entendido.push(`Sois ${miles(cuantos)}: os tratamos como una familia con hijos.`)
  } else if (/\b(jubilad[oa]s?|pension\w*|abuel[oa]s?|tercera edad|mayor|mayores|([6-9]\d|1[01]\d) anos)\b/.test(t)) {
    perfil = 'mayor'
    entendido.push(`${PERFILES.mayor.nombre}: ${PERFILES.mayor.que.toLowerCase()}`)
  } else if (/(teletrabaj|\bremoto\b|desde casa|freelance)/.test(t)) {
    perfil = 'teletrabajo'
    entendido.push(`${PERFILES.teletrabajo.nombre}: ${PERFILES.teletrabajo.que.toLowerCase()}`)
  }
  const filtros = cambiarPerfil(FILTROS_INICIALES, perfil ?? actual.perfil)
  if (instituto) filtros.instituto = true
  if (/\b(hospital\w*|medic[oa]s?|urgencias)\b/.test(t)) filtros.hospitalCerca = true

  // Tamaño y zona: la del municipio que nombra o una zona dicha por su nombre
  const tamano: Tamano | null = /\b(pueblos?|tranquil[oa]|campo)\b/.test(t) ? 'pueblo'
    : /\bmediano\b/.test(t) ? 'mediano'
      : /\b(ciudad|municipio grande|sitio grande)\b/.test(t) ? 'grande' : null
  const zona = zonasConCandidatos(municipios).find((z) => buscar(t, normalizar(z)).length)
    ?? Object.entries(ALIAS_ZONA).find(([alias]) => buscar(t, alias).length)?.[1] ?? null
  completar(filtros, entendido, tamano, municipios.find((x) => x.ine === ine) ?? null, zona, municipios, medida)

  return { filtros, entendido, origen: 'palabras' }
}

/** Zonas donde hay algún municipio del estudio (las que tiene sentido filtrar). */
export function zonasConCandidatos(municipios: Municipio[]): string[] {
  return [...new Set(municipios.filter((m) => m.universo).map((m) => m.zona))].sort((a, b) => a.localeCompare(b, 'es'))
}

/** Pone el tamaño y la zona en los filtros y lo explica. El municipio nombrado manda sobre la zona. */
function completar(filtros: FiltrosMudanza, entendido: string[], tamano: Tamano | null, m: Municipio | null,
  zona: string | null, municipios: Municipio[], medida: Medida) {
  if (filtros.hospitalCerca) entendido.push(`Con el hospital a menos de ${umbralHospital(medida)} ${MEDIDAS[medida].como}.`)
  if (tamano) {
    filtros.tamano = tamano
    const { desde, hasta } = TAMANOS[tamano]
    entendido.push(hasta === Infinity ? `Un sitio grande: más de ${miles(desde)} vecinos.`
      : desde === 0 ? `Un pueblo: menos de ${miles(hasta)} vecinos.`
        : `Un sitio mediano: entre ${miles(desde)} y ${miles(hasta)} vecinos.`)
  }
  const zonas = zonasConCandidatos(municipios)
  if (m) {
    if (!zonas.includes(m.zona)) {
      entendido.push(`${m.nombre} tiene más de 50.000 habitantes y queda fuera del estudio: buscamos en todas las zonas.`)
    } else {
      filtros.zona = m.zona
      entendido.push(m.universo ? `${m.nombre}: buscamos en su zona, ${m.zona}.`
        : `${m.nombre} tiene más de 50.000 habitantes y queda fuera del estudio: buscamos cerca, en su zona (${m.zona}).`)
    }
  } else if (zona && zonas.includes(zona)) {
    filtros.zona = zona
    entendido.push(`Zona ${zona}.`)
  }
}

/**
 * Convierte lo que devuelve la IA (api/asistente.ts) en filtros. No nos fiamos de nada:
 * cada campo se comprueba contra los valores posibles y lo que no encaja se ignora.
 * Las explicaciones las escribimos nosotros, no la IA. Devuelve null si no ha entendido nada.
 */
export function lecturaDeIA(datos: unknown, municipios: Municipio[], actual: FiltrosMudanza, medida: Medida): LecturaFrase | null {
  if (typeof datos !== 'object' || datos === null) return null
  const d = datos as Record<string, unknown>
  const entendido: string[] = []
  const perfil = typeof d.perfil === 'string' && d.perfil in PERFILES ? d.perfil as Perfil : null
  const instituto = d.instituto === true
  if (perfil === 'familia' || instituto) {
    entendido.push(instituto ? 'Con hijos en edad de instituto: buscamos colegio e instituto.' : 'Familia con hijos: buscamos que haya colegio.')
  } else if (perfil) {
    entendido.push(`${PERFILES[perfil].nombre}: ${PERFILES[perfil].que.toLowerCase()}`)
  }
  const filtros = cambiarPerfil(FILTROS_INICIALES, instituto ? 'familia' : perfil ?? actual.perfil)
  if (instituto) filtros.instituto = true
  if (d.hospital === true) filtros.hospitalCerca = true

  const tamano = typeof d.tamano === 'string' && d.tamano in TAMANOS && d.tamano !== 'todos' ? d.tamano as Tamano : null
  const ine = typeof d.municipio === 'string' ? municipioNombrado(normalizar(d.municipio), municipios).ine : null
  completar(filtros, entendido, tamano, municipios.find((x) => x.ine === ine) ?? null,
    typeof d.zona === 'string' ? d.zona : null, municipios, medida)

  return entendido.length ? { filtros, entendido, origen: 'ia' } : null
}
