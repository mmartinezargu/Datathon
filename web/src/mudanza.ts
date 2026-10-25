// «¿Dónde me mudo?»: ordena los municipios según lo que necesita cada tipo de vecino.
// Solo usa lo que ya calcula el motor: cuánto sitio les queda a los colegios, al centro de salud
// y a la vivienda después de que llegue la gente prevista. No hay precios ni tiempos de viaje.

import type { Candidato, FiltrosMudanza, Municipio, Perfil, Recurso, ResultadoMunicipio, Tamano } from './tipos'

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

export const FILTROS_INICIALES: FiltrosMudanza = { perfil: 'familia', colegio: true, instituto: false, sitioLibre: true, zona: null, tamano: 'todos' }

/** Al cambiar de perfil: una familia quiere colegio; los demás, por defecto, no lo piden. */
export function cambiarPerfil(f: FiltrosMudanza, perfil: Perfil): FiltrosMudanza {
  return { ...f, perfil, colegio: perfil === 'familia', instituto: perfil === 'familia' && f.instituto }
}

const RECURSOS: Recurso[] = ['colegios', 'sanidad', 'vivienda']

/** Personas que aún caben en cada recurso cuando ya ha llegado la gente prevista. */
export function sitioQueda(r: ResultadoMunicipio): Record<Recurso, number | null> {
  return Object.fromEntries(RECURSOS.map((k) => [k, r.limites[k] === null ? null : r.limites[k]! - r.llegan])) as Record<Recurso, number | null>
}

export function cumpleFiltros(r: ResultadoMunicipio, m: Municipio, f: FiltrosMudanza): boolean {
  const c = m.capacidad!
  const t = TAMANOS[f.tamano]
  return (!f.colegio || c.colegios_primaria > 0)
    && (!f.instituto || c.colegios_secundaria > 0)
    && (!f.sitioLibre || r.margen >= 0)
    && (!f.zona || m.zona === f.zona)
    && r.poblacion >= t.desde && r.poblacion < t.hasta
}

/**
 * Ranking: para cada recurso se ordenan los municipios por el sitio que les queda en proporción
 * a sus vecinos (así un pueblo y una ciudad se comparan igual) y se suman las posiciones con los
 * pesos del perfil. 100 = el mejor de los que pasan los filtros en todo lo que le importa al perfil.
 */
export function rankingMudanza(resultados: ResultadoMunicipio[], porIne: Map<string, Municipio>, f: FiltrosMudanza): Candidato[] {
  const filas = resultados.filter((r) => cumpleFiltros(r, porIne.get(r.ine)!, f))
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
