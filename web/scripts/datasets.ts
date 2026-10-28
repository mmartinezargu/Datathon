// Datasets de resultados para data/out (R5), calculados con el mismo motor que la web, para que cuadren con ella.
// Escenario por defecto de la web: 2035, minutos en coche, exigencia media; la reubicación, a 30 min.
//   - resultados_2035.csv: una fila por municipio (llegan, caben, sin sitio, tipo, qué limita y la reubicación)
//   - plan_recomendado.csv: las obras del plan recomendado (reubicando), con coste, año y lo que hace caber
//   - zonas_salud.csv: las 286 zonas básicas de salud (población, límite y municipios del reto)
// Formato de datos abiertos: UTF-8, separador «,», decimales con punto. Se copian también a public/datos para la web.
//
// Uso (desde web/):  npm run datasets

import { copyFileSync, readFileSync, writeFileSync } from 'node:fs'
import { LIMITES, TIPOS } from '../src/colores'
import { NOMBRE_OBRA } from '../src/fuentesPlan'
import {
  PARAMETROS_PLAN, aperturaObra, calcular, calcularUmbrales, costeObra, escenarioDelPlan, escenarioPorDefecto, evaluarPlan,
  planOptimo, quedanSinSitio,
} from '../src/motor'
import type { Municipio, ZonaSalud } from '../src/tipos'

const DATOS = new URL('../public/datos/', import.meta.url)
const OUT = new URL('../../data/out/', import.meta.url)
const leer = <T>(f: string): T => JSON.parse(readFileSync(new URL(f, DATOS), 'utf8'))
const municipios = leer<Municipio[]>('municipios.json')
const zonas = leer<ZonaSalud[]>('zonas_salud.json')
const porIne = new Map(municipios.map((m) => [m.ine, m]))
const nombre = (ine: string) => porIne.get(ine)?.nombre ?? ine

const esc = escenarioPorDefecto(2035, 'min')
const reubicando = escenarioDelPlan(esc)

const entero = (n: number | null) => (n === null ? '' : String(Math.round(n)))
const celda = (v: string) => (/[",\n]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v)
function escribir(archivo: string, cabecera: string[], filas: string[][]) {
  const texto = [cabecera, ...filas].map((f) => f.map(celda).join(',')).join('\n') + '\n'
  writeFileSync(new URL(archivo, OUT), texto)
  copyFileSync(new URL(archivo, OUT), new URL(archivo, DATOS))
  console.log(`  data/out/${archivo}: ${filas.length} filas`)
}

// 1. Resultados por municipio, sin reubicar y reubicando (los tipos reubicando, como los colorea el mapa)
const sin = calcular(municipios, zonas, esc)
const con = new Map(calcular(municipios, zonas, reubicando, {}, { tiposDespues: true }).map((r) => [r.ine, r]))
const lista = (t: { personas: number }[], ine: (x: never) => string) => t.map((x) => `${ine(x as never)} (${Math.round(x.personas)})`).join('; ')
escribir('resultados_2035.csv', [
  'ine', 'municipio', 'zona', 'poblacion_2025', 'llegan_hasta_2035', 'caben', 'sin_sitio', 'caben_por_vivienda', 'caben_por_colegios',
  'caben_por_sanidad', 'caben_por_ritmo', 'limita', 'tipo', 'condicionada', 'hospital_min',
  'reubicando_envia', 'reubicando_recibe', 'reubicando_sin_sitio', 'reubicando_tipo', 'envia_a', 'recibe_de',
], [...sin].sort((a, b) => a.ine.localeCompare(b.ine)).map((r) => {
  const m = porIne.get(r.ine)!
  const c = con.get(r.ine)!
  return [
    r.ine, m.nombre, m.zona, entero(r.poblacion), entero(r.llegan), entero(r.caben), entero(Math.max(0, -r.margen)),
    entero(r.limites.vivienda), entero(r.limites.colegios), entero(r.limites.sanidad), entero(r.limites.ritmo),
    LIMITES[r.limitante].nombre, TIPOS[r.tipo].nombre, r.condicionada ? 'sí' : 'no', m.hospital_min.toFixed(1),
    entero(c.envia), entero(c.recibe), entero(quedanSinSitio(c)), TIPOS[c.tipo].nombre,
    lista(c.envios, (t: { destino: string }) => nombre(t.destino)), lista(c.llegadas, (t: { origen: string }) => nombre(t.origen)),
  ]
}))

// 2. Plan recomendado (reubicando a 30 min), en el orden de la pestaña «Plan»
const plan = planOptimo(municipios, zonas, reubicando, PARAMETROS_PLAN)
const evaluado = evaluarPlan(municipios, zonas, reubicando, plan)
escribir('plan_recomendado.csv', [
  'ine', 'municipio', 'obra', 'zona_salud', 'plazas_o_personas_que_atiende', 'eur_por_plaza', 'coste_eur', 'inicio', 'abre', 'pasan_a_caber',
], plan.map((o, i) => [
  o.ine, nombre(o.ine), NOMBRE_OBRA[o.tipo], porIne.get(o.ine)?.capacidad?.zbs_nombre ?? '', entero(o.plazas),
  o.tipo === 'centro_salud' ? '' : entero(o.eurosPorPlaza), entero(costeObra(o)), String(o.inicio), String(aperturaObra(o)),
  entero(evaluado.ganaPorObra[i] ?? 0),
]))

// 3. Zonas básicas de salud: el límite es el mismo para todas (percentil de la exigencia elegida)
const universo = municipios.filter((m) => m.universo && m.capacidad)
const limite = calcularUmbrales(universo, zonas, esc.exigencia).zonaSalud
const centrosPlan = (codigo: string) => plan.filter((o) => o.tipo === 'centro_salud' && porIne.get(o.ine)?.capacidad?.zbs_codigo === codigo).length
escribir('zonas_salud.csv', [
  'codigo', 'zona_salud', 'poblacion', 'limite', 'sitio_libre', 'municipios_del_reto', 'centros_plan_recomendado',
], [...zonas].sort((a, b) => a.codigo.localeCompare(b.codigo)).map((z) => [
  z.codigo, z.nombre, entero(z.poblacion), entero(limite), entero(limite - z.poblacion),
  universo.filter((m) => m.capacidad!.zbs_codigo === z.codigo).map((m) => m.nombre).join('; '), String(centrosPlan(z.codigo)),
]))
console.log(`  plan: ${plan.length} obras, ${(evaluado.coste / 1e6).toFixed(1)} M€, sin sitio ${Math.round(evaluado.sinSitio)}`)
