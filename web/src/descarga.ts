// Descarga del escenario actual en CSV (licencia CC BY 4.0).
// Pensado para abrirse bien en Excel en español: separador ";", decimales con coma
// y marca BOM para que respete las tildes. Los números van sin punto de miles para
// que la hoja de cálculo los lea como números (por eso no se usa formato.ts).

import { LIMITES, TIPOS } from './colores'
import { SIN_INVERSION, costeInversion } from './motor'
import type { Escenario, Inversiones, Medida, Municipio, ResultadoMunicipio, Traslado } from './tipos'

const NOMBRE_MEDIDA: Record<Medida, string> = { min: 'minutos en coche', km: 'km en línea recta' }

export function csvEscenario(
  resultados: ResultadoMunicipio[], porIne: Map<string, Municipio>, esc: Escenario, inversiones: Inversiones,
): string {
  const cabecera = [
    'ine', 'municipio', 'zona', 'poblacion_2025', `llegan_hasta_${esc.anio}`, 'caben', 'margen',
    'crecimiento_pct', 'caben_por_vivienda', 'caben_por_colegios', 'caben_por_sanidad', 'caben_por_ritmo',
    'limita', 'tipo', 'medida', 'condicionada', 'hospital_km', 'hospital_min', 'reubicados_recibe', 'reubicados_envia', 'recibe_de', 'envia_a', 'colegios_nuevos', 'centros_salud_nuevos', 'coste_inversion_eur',
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
        String(inv.colegios), String(inv.centros), entero(costeInversion(inv)),
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
