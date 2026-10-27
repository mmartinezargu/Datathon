// Descarga del escenario actual en CSV (licencia CC BY 4.0).
// Pensado para abrirse bien en Excel en español: separador ";", decimales con coma
// y marca BOM para que respete las tildes. Los números van sin punto de miles para
// que la hoja de cálculo los lea como números (por eso no se usa formato.ts).

import { LIMITES, TIPOS } from './colores'
import { NOMBRE_OBRA } from './fuentesPlan'
import { SIN_INVERSION, aperturaObra, costeObra, inversionesDe } from './motor'
import type { Escenario, FiltrosReparto, Medida, Municipio, Obra, Perfil, Reparto, ResultadoMunicipio, Traslado } from './tipos'

const NOMBRE_MEDIDA: Record<Medida, string> = { min: 'minutos en coche', km: 'km en línea recta' }

export function csvEscenario(
  resultados: ResultadoMunicipio[], porIne: Map<string, Municipio>, esc: Escenario, obras: Obra[],
): string {
  const inversiones = inversionesDe(obras)
  const coste = (ine: string) => obras.filter((o) => o.ine === ine).reduce((s, o) => s + costeObra(o), 0)
  const cabecera = [
    'ine', 'municipio', 'zona', 'poblacion_2025', `llegan_hasta_${esc.anio}`, 'caben', 'margen',
    'crecimiento_pct', 'caben_por_vivienda', 'caben_por_colegios', 'caben_por_sanidad', 'caben_por_ritmo',
    'limita', 'tipo', 'medida', 'condicionada', 'hospital_km', 'hospital_min', 'reubicados_recibe', 'reubicados_envia', 'recibe_de', 'envia_a',
    'plan_plazas_primaria', 'plan_plazas_eso', 'plan_centros_salud', 'plan_coste_eur',
  ]
  const filas = [...resultados]
    .sort((a, b) => a.ine.localeCompare(b.ine))
    .map((r) => {
      const m = porIne.get(r.ine)
      const inv = inversiones[r.ine] ?? SIN_INVERSION
      return [
        // El margen se calcula con las cifras ya redondeadas, para que cuadre en la hoja: caben − llegan
        r.ine, m?.nombre ?? '', m?.zona ?? '', entero(r.poblacion), entero(r.llegan), entero(r.caben), String(Math.round(r.caben) - Math.round(r.llegan)),
        decimal(r.crecimiento * 100), entero(r.limites.vivienda), entero(r.limites.colegios),
        entero(r.limites.sanidad), entero(r.limites.ritmo),
        LIMITES[r.limitante].nombre, TIPOS[r.tipo].nombre, NOMBRE_MEDIDA[esc.medida], r.condicionada ? 'sí' : 'no',
        m ? decimal(m.hospital_km) : '', m ? decimal(m.hospital_min) : '', entero(r.recibe), entero(r.envia),
        traslados(r.llegadas, 'origen', porIne, esc.medida), traslados(r.envios, 'destino', porIne, esc.medida),
        entero(inv.plazasPrimaria), entero(inv.plazasSecundaria), String(inv.centros), entero(coste(r.ine)),
      ]
    })
  return '﻿' + [cabecera, ...filas].map((f) => f.map(celda).join(';')).join('\r\n') + '\r\n'
}

/** El plan de la pestaña «Plan»: una fila por obra, en el orden de la lista. */
export function csvPlan(obras: Obra[], ganaPorObra: number[], porIne: Map<string, Municipio>): string {
  const cabecera = ['ine', 'municipio', 'obra', 'plazas_o_personas_que_atiende', 'euros_por_plaza', 'coste_eur', 'inicio_obras', 'apertura', 'zona_salud', 'pasan_a_caber', 'euros_por_persona']
  const filas = obras.map((o, i) => [
    o.ine, porIne.get(o.ine)?.nombre ?? '', NOMBRE_OBRA[o.tipo], entero(o.plazas),
    o.tipo === 'centro_salud' ? '' : entero(o.eurosPorPlaza), entero(costeObra(o)), String(o.inicio), String(aperturaObra(o)),
    o.tipo === 'centro_salud' ? porIne.get(o.ine)?.capacidad?.zbs_nombre ?? '' : '', entero(ganaPorObra[i] ?? 0),
    (ganaPorObra[i] ?? 0) >= 1 ? entero(costeObra(o) / ganaPorObra[i]) : '',
  ])
  return '\ufeff' + [cabecera, ...filas].map((f) => f.map(celda).join(';')).join('\r\n') + '\r\n'
}

/**
 * La pestaña «Atraer»: una fila por pueblo que recibe gente, de más a menos. Cuántos de cada grupo convendría atraer,
 * lo que le cabe, qué lo llena y para qué grupo promocionarlo. Los supuestos (% de cada grupo y filtros) van en cada fila.
 */
export function csvAtraer(reparto: Reparto, resultados: ResultadoMunicipio[], porIne: Map<string, Municipio>,
  mezcla: Record<Perfil, number>, filtros: FiltrosReparto): string {
  const porIneRes = new Map(resultados.map((r) => [r.ine, r]))
  const GRUPO: Record<Perfil, string> = { familia: 'familias con hijos', mayor: 'personas mayores', teletrabajo: 'teletrabajo' }
  const PERFILES: Perfil[] = ['familia', 'mayor', 'teletrabajo']
  const textoFiltros = [
    filtros.zona ?? 'cualquier zona', filtros.tamano === 'todos' ? '' : `tamaño: ${filtros.tamano}`,
    filtros.hospitalCerca ? 'todos con hospital cerca' : '', filtros.instituto ? 'familias solo con instituto' : '',
  ].filter(Boolean).join(', ')
  const cabecera = [
    'ine', 'municipio', 'zona', 'atraer_familias', 'atraer_mayores', 'atraer_teletrabajo', 'atraer_total', 'le_caben', 'lleno',
    'lo_llena', 'promocionar_sobre_todo_a', 'caben_por_colegios', 'caben_por_sanidad', 'caben_por_vivienda', 'hospital_km', 'hospital_min',
    'supuesto_familias_pct', 'supuesto_mayores_pct', 'supuesto_teletrabajo_pct', 'filtros',
  ]
  const filas = reparto.pueblos.map((f) => {
    const r = porIneRes.get(f.ine)!
    const m = porIne.get(f.ine)
    const principal = PERFILES.reduce((a, b) => (f.porPerfil[b] > f.porPerfil[a] ? b : a))
    return [
      f.ine, m?.nombre ?? '', m?.zona ?? '', entero(f.porPerfil.familia), entero(f.porPerfil.mayor), entero(f.porPerfil.teletrabajo),
      entero(f.total), entero(Math.max(0, Math.floor(r.caben))), f.lleno ? 'sí' : 'no', f.lleno ? LIMITES[r.limitante].nombre : '',
      GRUPO[principal], entero(r.limites.colegios), entero(r.limites.sanidad), entero(r.limites.vivienda),
      m ? decimal(m.hospital_km) : '', m ? decimal(m.hospital_min) : '',
      String(mezcla.familia), String(mezcla.mayor), String(mezcla.teletrabajo), textoFiltros,
    ]
  })
  return '\ufeff' + [cabecera, ...filas].map((f) => f.map(celda).join(';')).join('\r\n') + '\r\n'
}

/** Guarda un texto como archivo en el ordenador del usuario, sin pasar por ningún servidor. */
export function descargar(nombre: string, texto: string) {
  const url = URL.createObjectURL(new Blob([texto], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  a.click()
  // Se libera un poco después: si se libera en el mismo instante, Firefox y Safari cancelan la descarga
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** «Humanes de Madrid (2676 personas; 6,2 km) | Algete (…)», o «(…; 9,5 min)» con minutos: con la reubicación activa. */
function traslados(lista: Traslado[], campo: 'origen' | 'destino', porIne: Map<string, Municipio>, medida: Medida): string {
  const distancia = (t: Traslado) => (medida === 'min' && t.min !== null ? `${decimal(t.min)} min` : `${decimal(t.km)} km`)
  return lista.map((t) => `${porIne.get(t[campo])?.nombre ?? t[campo]} (${entero(t.personas)} personas; ${distancia(t)})`).join(' | ')
}

function entero(n: number | null): string {
  return n === null ? '' : String(Math.round(n))
}

function decimal(n: number): string {
  return n.toFixed(1).replace('.', ',')
}

/** Entre comillas si lleva separador, comillas o saltos de línea. */
function celda(v: string): string {
  return /[;"\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
}
