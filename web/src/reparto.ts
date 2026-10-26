// Pestaña «Atraer»: coge la gente que el modelo prevé que llega y la reparte entre los pueblos según
// quién es, como si se pudiera dirigir a dónde va cada uno.
// Cada pueblo tiene un hueco: todo lo que le cabe (`caben`, el menor de sus límites). Como en el modelo,
// cada persona ocupa sitio en todos los recursos a la vez, así que el hueco es uno solo para todos.
// Cada perfil recorre su propio ranking de «Dónde vivir» (con las casillas que trae marcadas: colegio
// para las familias, hospital cerca para las personas mayores) más los filtros de dónde se reparte.
// Eligen por turnos y a la par: en cada vuelta, cada grupo coloca una tanda proporcional a cuántos son, así que
// los tres avanzan al mismo ritmo y, si no hay sitio para todos, falta para todos.

import { FILTROS_INICIALES, cambiarPerfil, rankingMudanza } from './mudanza'
import type { FiltrosMudanza, FiltrosReparto, Medida, Municipio, Perfil, Reparto, ResultadoMunicipio } from './tipos'

export const ORDEN_REPARTO: Perfil[] = ['familia', 'mayor', 'teletrabajo']

/** Personas que se colocan en cada vuelta, entre los tres grupos (cada uno, su parte). */
const VUELTA = 300

/** Qué parte de los que llegan es de cada perfil, en %. Supuesto: no hay un dato público de quién llega. */
export const MEZCLA_SUPUESTA: Record<Perfil, number> = { familia: 50, mayor: 20, teletrabajo: 30 }

export const FILTROS_REPARTO: FiltrosReparto = { zona: null, tamano: 'todos', hospitalCerca: false, instituto: false }

/** Cuántas personas de cada perfil, repartiendo `total` según la mezcla (en %, se normaliza si no suma 100). */
export function llegadasPorPerfil(total: number, mezcla: Record<Perfil, number>): Record<Perfil, number> {
  const suma = ORDEN_REPARTO.reduce((s, p) => s + Math.max(0, mezcla[p]), 0)
  const r: Record<Perfil, number> = { familia: 0, mayor: 0, teletrabajo: 0 }
  if (suma === 0) return r
  let quedan = Math.round(total)
  ORDEN_REPARTO.forEach((p, i) => {
    r[p] = i === ORDEN_REPARTO.length - 1 ? quedan : Math.round(total * Math.max(0, mezcla[p]) / suma)
    quedan -= r[p]
  })
  return r
}

/** Hueco de un pueblo: todas las personas que le caben (nunca negativo). */
export function hueco(r: ResultadoMunicipio): number {
  return Math.max(0, Math.floor(r.caben))
}

/** Para comparar: cuántos de los que llegan caben si cada uno va donde le lleva la tendencia (el modelo). */
export function cabenSinDirigir(resultados: ResultadoMunicipio[]): number {
  return Math.round(resultados.reduce((s, r) => s + Math.max(0, Math.min(r.caben, r.llegan)), 0))
}

/** Los filtros de «Dónde vivir» con los que cada perfil ordena los pueblos, más los de dónde se reparte. */
export function filtrosDePerfil(perfil: Perfil, f: FiltrosReparto): FiltrosMudanza {
  const base = cambiarPerfil(FILTROS_INICIALES, perfil)
  return {
    ...base,
    sitioLibre: false, // aquí se reparte desde cero: cuenta todo lo que le cabe a cada pueblo
    instituto: perfil === 'familia' && f.instituto,
    hospitalCerca: base.hospitalCerca || f.hospitalCerca,
    zona: f.zona,
    tamano: f.tamano,
  }
}

/**
 * «Hospital cerca» usa la medida del escenario (minutos en coche o km en línea recta), como en «Dónde vivir».
 * Por defecto 'km', como el motor; la web pasa la del escenario.
 */
export function repartir(resultados: ResultadoMunicipio[], porIne: Map<string, Municipio>, llegan: Record<Perfil, number>,
  filtros: FiltrosReparto = FILTROS_REPARTO, medida: Medida = 'km'): Reparto {
  const libre = new Map(resultados.map((r) => [r.ine, hueco(r)]))
  const recibe = new Map<string, Record<Perfil, number>>()
  const cuantos = ORDEN_REPARTO.map((p) => Math.max(0, Math.round(llegan[p])))
  const todos = cuantos.reduce((s, n) => s + n, 0)
  const turnos = ORDEN_REPARTO.map((perfil, k) => ({
    perfil,
    lista: rankingMudanza(resultados, porIne, filtrosDePerfil(perfil, filtros), medida).map((c) => c.ine),
    i: 0, // el pueblo de su lista por el que va
    quedan: cuantos[k],
    tanda: todos ? Math.max(1, Math.round(VUELTA * cuantos[k] / todos)) : 0, // su parte de cada vuelta
  }))

  // Por turnos: en cada vuelta, cada perfil coloca su tanda en los mejores pueblos de su lista que aún tengan hueco
  let alguno = true
  while (alguno) {
    alguno = false
    for (const t of turnos) {
      let tanda = Math.min(t.tanda, t.quedan)
      while (tanda > 0 && t.i < t.lista.length) {
        const ine = t.lista[t.i]
        const entran = Math.min(tanda, libre.get(ine)!)
        if (entran === 0) { t.i++; continue }
        libre.set(ine, libre.get(ine)! - entran)
        const fila = recibe.get(ine) ?? { familia: 0, mayor: 0, teletrabajo: 0 }
        fila[t.perfil] += entran
        recibe.set(ine, fila)
        tanda -= entran
        t.quedan -= entran
        alguno = true
      }
    }
  }

  const sinSitio = Object.fromEntries(turnos.map((t) => [t.perfil, t.quedan])) as Record<Perfil, number>
  const pueblos = [...recibe].map(([ine, porPerfil]) => {
    const total = porPerfil.familia + porPerfil.mayor + porPerfil.teletrabajo
    return { ine, porPerfil, total, lleno: libre.get(ine) === 0 }
  }).sort((a, b) => b.total - a.total)
  const colocados = pueblos.reduce((s, p) => s + p.total, 0)
  return { pueblos, colocados, sinSitio }
}
