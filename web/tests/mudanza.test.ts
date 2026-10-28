// «Dónde vivir» calcula siempre sin el plan: con los colegios y centros de salud que hay hoy.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { PARAMETROS_PLAN, calcular, escenarioDelPlan, escenarioPorDefecto, inversionesDe, planOptimo, resultadosSinPlan } from '../src/motor'
import { EJEMPLOS_FRASE, FILTROS_INICIALES, interpretarFrase, rankingMudanza } from '../src/mudanza'
import type { Municipio, ZonaSalud } from '../src/tipos'

const leer = <T>(archivo: string): T => JSON.parse(readFileSync(new URL(`../public/datos/${archivo}`, import.meta.url), 'utf8'))
const municipios = leer<Municipio[]>('municipios.json')
const zonas = leer<ZonaSalud[]>('zonas_salud.json')
const porIne = new Map(municipios.map((m) => [m.ine, m]))

describe('Dónde vivir', () => {

  // Las frases de ejemplo de la caja deben dar resultados; la primera es la de la demo
  describe('frases de ejemplo', () => {
    const esc = escenarioPorDefecto(2035, 'min')
    const res = calcular(municipios, zonas, esc)
    const candidatos = (frase: string) => {
      const lectura = interpretarFrase(frase, municipios, FILTROS_INICIALES, esc.medida)
      return rankingMudanza(res, porIne, lectura.filtros, esc.medida).map((c) => porIne.get(c.ine)!.nombre)
    }

    it.each(EJEMPLOS_FRASE)('«%s» encuentra algún municipio', (frase) => {
      expect(candidatos(frase).length).toBeGreaterThan(0)
    })

    it('la primera (la de la demo) da 10 municipios medianos, con El Boalo primero', () => {
      const nombres = candidatos(EJEMPLOS_FRASE[0])
      expect(nombres).toHaveLength(10)
      expect(nombres.slice(0, 3)).toEqual(['El Boalo', 'Villalbilla', 'Villarejo de Salvanés'])
      expect(nombres.every((n) => { const m = municipios.find((x) => x.nombre === n)!; return m.poblacion['2025'] >= 5000 && m.poblacion['2025'] < 20000 })).toBe(true)
    })
  })

  it.each([false, true])('el ranking es el mismo con y sin plan (reubicando: %s)', (reequilibrio) => {
    const esc = { ...escenarioPorDefecto(2035, 'min'), reequilibrio }
    const plan = planOptimo(municipios, zonas, escenarioDelPlan(esc), PARAMETROS_PLAN)
    expect(plan.length).toBeGreaterThan(0)
    const filtros = { ...FILTROS_INICIALES, sitioLibre: false }
    const sinPlan = rankingMudanza(calcular(municipios, zonas, esc), porIne, filtros, esc.medida)
    // Lo que recibe la pestaña con un plan cargado (App: resultadosSinPlan)
    const conPlanCargado = rankingMudanza(resultadosSinPlan(municipios, zonas, esc), porIne, filtros, esc.medida)
    expect(conPlanCargado).toEqual(sinPlan)
    // Con las obras, el ranking cambiaría: por eso no se cuentan
    const conObras = rankingMudanza(calcular(municipios, zonas, esc, inversionesDe(plan)), porIne, filtros, esc.medida)
    expect(conObras).not.toEqual(sinPlan)
  })

  // Con «Reubicar», la gente que llega de municipios cercanos también ocupa sitio
  describe('con «Reubicar»', () => {
    const esc = { ...escenarioPorDefecto(2035, 'min'), reequilibrio: true }
    const res = calcular(municipios, zonas, esc)
    const ineDe = (nombre: string) => municipios.find((m) => m.nombre === nombre)!.ine

    it('el sitio que queda descuenta a los reubicados (Humanes de Madrid se llena)', () => {
      const humanes = res.find((r) => r.ine === ineDe('Humanes de Madrid'))!
      expect(humanes.recibe).toBeGreaterThan(1000)
      const todos = rankingMudanza(res, porIne, { ...FILTROS_INICIALES, sitioLibre: false }, esc.medida)
      const candidato = todos.find((c) => c.ine === humanes.ine)!
      expect(candidato.sitio.vivienda!).toBeLessThan(1)
      // «Que no se llene con la gente que llega» ya no lo deja pasar
      expect(rankingMudanza(res, porIne, FILTROS_INICIALES, esc.medida).some((c) => c.ine === humanes.ine)).toBe(false)
    })

    it('ningún municipio que pasa «que no se llene» se queda sin sitio después de reubicar', () => {
      const porIneRes = new Map(res.map((r) => [r.ine, r]))
      for (const c of rankingMudanza(res, porIne, FILTROS_INICIALES, esc.medida)) {
        const r = porIneRes.get(c.ine)!
        expect(r.margen - r.recibe).toBeGreaterThanOrEqual(0)
      }
    })

    it('«Atraer» no cuenta a los reubicados: su lista es la misma que sin ellos', () => {
      const sinRecibir = res.map((r) => ({ ...r, recibe: 0 }))
      const filtros = { ...FILTROS_INICIALES, sitioLibre: false }
      expect(rankingMudanza(res, porIne, filtros, esc.medida, false)).toEqual(rankingMudanza(sinRecibir, porIne, filtros, esc.medida))
    })
  })

  it('sin «Reubicar» no cambia nada: el ejemplo de Getafe sigue sacando Humanes de Madrid primero', () => {
    const esc = escenarioPorDefecto(2035, 'min')
    const res = calcular(municipios, zonas, esc)
    expect(res.every((r) => r.recibe === 0)).toBe(true)
    const sur = rankingMudanza(res, porIne, { ...FILTROS_INICIALES, zona: 'Sur Metropolitano' }, esc.medida)
    expect(porIne.get(sur[0].ine)!.nombre).toBe('Humanes de Madrid')
  })
})
