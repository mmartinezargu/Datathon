// De dónde salen los valores por defecto del plan (PARAMETROS_PLAN en motor.ts) y cómo se cuentan las obras en los textos.
// Los usan la pestaña «Plan» (panel «Parámetros») y «Cómo funciona».

import { OBRAS_REFERENCIA } from './motor'
import { miles, millones } from './formato'
import type { ObraReferencia, TipoObra } from './tipos'

export const NOMBRE_OBRA: Record<TipoObra, string> = {
  ampliar_primaria: 'Ampliar colegio',
  colegio_primaria: 'Colegio nuevo',
  instituto: 'Instituto',
  centro_salud: 'Centro de salud',
}

/** En singular y plural, para contar obras: «1 ampliación», «3 institutos». */
export const OBRA_CONTADA: Record<TipoObra, [string, string]> = {
  ampliar_primaria: ['ampliación', 'ampliaciones'],
  colegio_primaria: ['colegio nuevo', 'colegios nuevos'],
  instituto: ['instituto', 'institutos'],
  centro_salud: ['centro de salud', 'centros de salud'],
}

/** Solo lo que hay: ['7 ampliaciones', '3 institutos', '7 centros de salud'] (sin los tipos que no tiene). */
export function partesObras(cuantas: Record<TipoObra, number>): string[] {
  return (Object.keys(OBRA_CONTADA) as TipoObra[])
    .filter((t) => cuantas[t] > 0)
    .map((t) => `${cuantas[t]} ${OBRA_CONTADA[t][cuantas[t] === 1 ? 0 : 1]}`)
}

/** «7 ampliaciones, 3 institutos y 7 centros de salud»; «1 centro de salud». Vacío si no hay ninguna. */
export function textoObras(cuantas: Record<TipoObra, number>): string {
  const p = partesObras(cuantas)
  return p.length > 1 ? `${p.slice(0, -1).join(', ')} y ${p[p.length - 1]}` : p[0] ?? ''
}

/** Cuántas obras de cada tipo hay en una lista. */
export function contarObras(obras: { tipo: TipoObra }[]): Record<TipoObra, number> {
  const n: Record<TipoObra, number> = { ampliar_primaria: 0, colegio_primaria: 0, instituto: 0, centro_salud: 0 }
  obras.forEach((o) => n[o.tipo]++)
  return n
}

/** Qué hace cada obra en el modelo, en una frase. */
export const QUE_HACE_OBRA: Record<TipoObra, string> = {
  ampliar_primaria: 'Suma plazas de primaria a un colegio que ya existe (una línea por colegio).',
  colegio_primaria: 'Suma plazas de primaria con un colegio nuevo.',
  instituto: 'Suma plazas de ESO con un instituto nuevo.',
  centro_salud: 'Suma a su zona de salud las personas que atiende, después de cubrir el exceso que ya tenga.',
}

export interface Enlace { texto: string; url: string }

const NOTICIA = 'https://www.comunidad.madrid/noticias/'

/**
 * Tamaño y plazo de cada obra, con su fuente. El coste por defecto no va aquí: es la mediana de las obras de referencia
 * (OBRAS_REFERENCIA en motor.ts; la lista, en componentes/ObrasReferencia.tsx).
 */
export const FUENTES_PLAN: Record<TipoObra, { texto: string; enlaces: Enlace[] }> = {
  ampliar_primaria: {
    texto: 'Una línea: 9 aulas de 25 plazas (225). Plazo: estimación.',
    enlaces: [],
  },
  colegio_primaria: {
    texto: 'Una línea doble de primaria (450 plazas). Plazo: el colegio de Adelfillas (Colmenar Viejo, 840 plazas) se presentó ' +
      'en noviembre de 2025 y la obra se autorizó en marzo de 2026, para hacerla en 15 meses.',
    enlaces: [
      { texto: 'Comunidad de Madrid, 21/11/2025', url: NOTICIA + '2025/11/21/comunidad-madrid-ampliara-oferta-educativa-colmenar-viejo-tres-nuevos-centros-sostenidos-fondos-publicos' },
      { texto: 'Comunidad de Madrid, 25/03/2026', url: NOTICIA + '2026/03/25/comunidad-madrid-crea-2200-nuevas-plazas-educativas-publicas-infantil-primaria-secundaria-inversion-369-millones' },
    ],
  },
  instituto: {
    texto: '880 plazas, como el IES Los Molinos (Getafe): 20 aulas de ESO y 8 de Bachillerato, con 15 meses de obra.',
    enlaces: [
      { texto: 'Comunidad de Madrid, 12/02/2025', url: NOTICIA + '2025/02/12/comunidad-madrid-creara-5080-nuevas-plazas-publicas-construccion-seis-colegios-e-institutos' },
      { texto: 'Comunidad de Madrid, 20/05/2026', url: 'https://www.comunidad.madrid/node/114439' },
    ],
  },
  centro_salud: {
    texto: 'Atiende a 23.078 personas: la mediana de las 286 zonas básicas de salud de la Comunidad. Plazo: unos 18 meses de obra ' +
      '(El Molar) y, al acabar, cerca de un año para equiparlo y completar la plantilla (Montecarmelo).',
    enlaces: [
      { texto: 'Comunidad de Madrid, 24/07/2024', url: NOTICIA + '2024/07/24/comunidad-madrid-aprueba-114-millones-iniciar-este-ano-construccion-16-nuevos-centros-salud-nueve-municipios' },
      { texto: 'Comunidad de Madrid, 17/02/2025', url: 'https://www.comunidad.madrid/node/71415' },
    ],
  },
}

export const FUENTE_ANIO_INICIO = 'Supuesto: el primer año en que podrían empezar las obras de un plan aprobado ahora.'

/** Obras de referencia que no entran en la mediana pero se enseñan junto a un tipo (ampliar un instituto, el conjunto de 16 centros). */
const REFERENCIA_DE: Record<string, TipoObra> = { 'ampliación de instituto': 'instituto', 'centro de salud nuevo': 'centro_salud' }

/** Las obras de un tipo: primero las de la mediana y después las de referencia, cada grupo por fecha. */
export function obrasDe(tipo: TipoObra): ObraReferencia[] {
  const porFecha = (a: ObraReferencia, b: ObraReferencia) => a.fecha.localeCompare(b.fecha)
  return [
    ...OBRAS_REFERENCIA.obras.filter((o) => o.obra_plan === tipo).sort(porFecha),
    ...OBRAS_REFERENCIA.obras.filter((o) => o.obra_plan === '' && REFERENCIA_DE[o.tipo] === tipo).sort(porFecha),
  ]
}

/** «7.100.000» en un centro de salud se lee «7,1 M€ por centro»; en colegios, «10.936 €/plaza». */
export function valorObra(tipo: TipoObra, v: number): string {
  return tipo === 'centro_salud' ? `${millones(v)} por centro` : `${miles(v)} €/plaza`
}

/** «Mediana de 10 obras de la Comunidad (2023–2025): 10.936 €/plaza (de 5.895 a 46.000)». */
export function resumenMediana(tipo: TipoObra): string {
  const m = OBRAS_REFERENCIA.medianas[tipo]
  const anios = OBRAS_REFERENCIA.obras.filter((o) => o.obra_plan === tipo).map((o) => Number(o.fecha.slice(0, 4)))
  const desde = Math.min(...anios)
  const hasta = Math.max(...anios)
  const rango = tipo === 'centro_salud' ? `de ${millones(m.min)} a ${millones(m.max)}` : `de ${miles(m.min)} a ${miles(m.max)}`
  return `Mediana de ${m.n} obras de la Comunidad (${desde === hasta ? desde : `${desde}–${hasta}`}): ${valorObra(tipo, m.mediana)} (${rango})`
}
