// «Dónde vivir» calcula siempre sin el plan: con los colegios y centros de salud que hay hoy.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { PARAMETROS_PLAN, calcular, escenarioDelPlan, escenarioPorDefecto, inversionesDe, planOptimo, resultadosSinPlan } from '../src/motor'
import { FILTROS_INICIALES, rankingMudanza } from '../src/mudanza'
import type { Municipio, ZonaSalud } from '../src/tipos'

const leer = <T>(archivo: string): T => JSON.parse(readFileSync(new URL(`../public/datos/${archivo}`, import.meta.url), 'utf8'))
const municipios = leer<Municipio[]>('municipios.json')
const zonas = leer<ZonaSalud[]>('zonas_salud.json')
const porIne = new Map(municipios.map((m) => [m.ine, m]))

describe('Dónde vivir', () => {
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
})
