// Descarga del escenario actual en CSV (licencia CC BY 4.0).
// Pensado para abrirse bien en Excel en español: separador ";", decimales con coma
// y marca BOM para que respete las tildes. Los números van sin punto de miles para
// que la hoja de cálculo los lea como números (por eso no se usa formato.ts).

import { LIMITES, TIPOS } from './colores'
import { SIN_INVERSION, costeInversion } from './motor'
import type { Escenario, Inversiones, Municipio, ResultadoMunicipio } from './tipos'

export function csvEscenario(
  resultados: ResultadoMunicipio[], porIne: Map<string, Municipio>, esc: Escenario, inversiones: Inversiones,
): string {
  const cabecera = [
    'ine', 'municipio', 'zona', 'poblacion_2025', `llegan_hasta_${esc.anio}`, 'caben', 'margen',
    'crecimiento_pct', 'caben_por_vivienda', 'caben_por_colegios', 'caben_por_sanidad', 'caben_por_ritmo',
    'limita', 'tipo', 'colegios_nuevos', 'centros_salud_nuevos', 'coste_inversion_eur',
  ]
  const filas = [...resultados]
    .sort((a, b) => a.ine.localeCompare(b.ine))
    .map((r) => {
      const m = porIne.get(r.ine)
      const inv = inversiones[r.ine] ?? SIN_INVERSION
      return [
        r.ine, m?.nombre ?? '', m?.zona ?? '', entero(r.poblacion), entero(r.llegan), entero(r.caben), entero(r.margen),
        decimal(r.crecimiento * 100), entero(r.limites.vivienda), entero(r.limites.colegios),
        entero(r.limites.sanidad), entero(r.limites.ritmo),
        LIMITES[r.limitante].nombre, TIPOS[r.tipo].nombre, String(inv.colegios), String(inv.centros), entero(costeInversion(inv)),
      ]
    })
  return '﻿' + [cabecera, ...filas].map((f) => f.map(celda).join(';')).join('\r\n') + '\r\n'
}

/** Guarda un texto como archivo en el ordenador del usuario, sin pasar por ningún servidor. */
export function descargar(nombre: string, texto: string) {
  const url = URL.createObjectURL(new Blob([texto], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  a.click()
  URL.revokeObjectURL(url)
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
