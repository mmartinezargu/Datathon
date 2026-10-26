// Simulador «¿Y si llegan más?»: reparte a un grupo de recién llegados entre los pueblos con sitio.
// Cada pueblo tiene un hueco: lo que le queda libre después de la gente que ya le llega según el modelo
// (y de la que recibe si la reubicación está activa). Como en el modelo, cada persona ocupa sitio en
// todos los recursos a la vez, así que el hueco es uno solo para todos.
// Cada perfil recorre su propio ranking de «Dónde vivir» (con las casillas que trae marcadas: colegio
// para las familias, hospital cerca para las personas mayores) y llena los pueblos en ese orden.
// Eligen primero los que tienen menos opciones: personas mayores, después familias y al final teletrabajo.

import { FILTROS_INICIALES, cambiarPerfil, rankingMudanza } from './mudanza'
import type { Municipio, Perfil, Reparto, ResultadoMunicipio } from './tipos'

export const ORDEN_REPARTO: Perfil[] = ['mayor', 'familia', 'teletrabajo']

export const LLEGADAS_EJEMPLO: Record<Perfil, number> = { familia: 5_000, mayor: 2_000, teletrabajo: 3_000 }

/** Sitio libre de un pueblo para recién llegados (nunca negativo). */
export function hueco(r: ResultadoMunicipio): number {
  return Math.max(0, Math.floor(r.margen - r.recibe))
}

export function repartir(resultados: ResultadoMunicipio[], porIne: Map<string, Municipio>, llegan: Record<Perfil, number>): Reparto {
  const libre = new Map(resultados.map((r) => [r.ine, hueco(r)]))
  const recibe = new Map<string, Record<Perfil, number>>()
  const sinSitio: Record<Perfil, number> = { familia: 0, mayor: 0, teletrabajo: 0 }

  for (const perfil of ORDEN_REPARTO) {
    let quedan = Math.max(0, Math.round(llegan[perfil]))
    for (const c of rankingMudanza(resultados, porIne, cambiarPerfil(FILTROS_INICIALES, perfil))) {
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
