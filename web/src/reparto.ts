// Simulador «¿Y si repartimos a los que llegan?»: coge la gente que el modelo prevé que llega y la
// reparte entre los pueblos según quién es, como si se pudiera dirigir a dónde va cada uno.
// Cada pueblo tiene un hueco: todo lo que le cabe (`caben`, el menor de sus límites). Como en el modelo,
// cada persona ocupa sitio en todos los recursos a la vez, así que el hueco es uno solo para todos.
// Cada perfil recorre su propio ranking de «Dónde vivir» (con las casillas que trae marcadas: colegio
// para las familias, hospital cerca para las personas mayores) y llena los pueblos en ese orden.
// Eligen primero los que tienen menos opciones: personas mayores, después familias y al final teletrabajo.

import { FILTROS_INICIALES, cambiarPerfil, rankingMudanza } from './mudanza'
import type { Municipio, Perfil, Reparto, ResultadoMunicipio } from './tipos'

export const ORDEN_REPARTO: Perfil[] = ['mayor', 'familia', 'teletrabajo']

/** Qué parte de los que llegan es de cada perfil, en %. Supuesto: no hay un dato público de quién llega. */
export const MEZCLA_SUPUESTA: Record<Perfil, number> = { familia: 50, mayor: 20, teletrabajo: 30 }

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

export function repartir(resultados: ResultadoMunicipio[], porIne: Map<string, Municipio>, llegan: Record<Perfil, number>): Reparto {
  const libre = new Map(resultados.map((r) => [r.ine, hueco(r)]))
  const recibe = new Map<string, Record<Perfil, number>>()
  const sinSitio: Record<Perfil, number> = { familia: 0, mayor: 0, teletrabajo: 0 }

  for (const perfil of ORDEN_REPARTO) {
    let quedan = Math.max(0, Math.round(llegan[perfil]))
    // Su ranking de «Dónde vivir», pero también con los pueblos que se llenarían con la previsión: aquí se reparte desde cero
    for (const c of rankingMudanza(resultados, porIne, { ...cambiarPerfil(FILTROS_INICIALES, perfil), sitioLibre: false })) {
      if (quedan === 0) break
      const entran = Math.min(quedan, libre.get(c.ine)!)
      if (entran === 0) continue
      libre.set(c.ine, libre.get(c.ine)! - entran)
      const fila = recibe.get(c.ine) ?? { familia: 0, mayor: 0, teletrabajo: 0 }
      fila[perfil] += entran
      recibe.set(c.ine, fila)
      quedan -= entran
    }
    sinSitio[perfil] = quedan
  }

  const pueblos = [...recibe].map(([ine, porPerfil]) => {
    const total = porPerfil.familia + porPerfil.mayor + porPerfil.teletrabajo
    return { ine, porPerfil, total, lleno: libre.get(ine) === 0 }
  }).sort((a, b) => b.total - a.total)
  const colocados = pueblos.reduce((s, p) => s + p.total, 0)
  return { pueblos, colocados, sinSitio }
}
