// Tests del motor con los datos reales (web/public/datos). Se ejecutan con «npm test».
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  HOSPITAL_LEJOS_KM, PARAMETROS_PLAN, aperturaObra, calcular, calcularUmbrales, cifrasCabecera, costeObra, escenarioDelPlan, escenarioPorDefecto,
  evaluarPlan, inversionesDe, nivelesColegio, nuevaObra, planOptimo, resumenReubicacion,
} from '../src/motor'
import type { Municipio, Obra, ResultadoMunicipio, TipoObra, ZonaSalud } from '../src/tipos'

const leer = <T>(archivo: string): T => JSON.parse(readFileSync(new URL(`../public/datos/${archivo}`, import.meta.url), 'utf8'))
const municipios = leer<Municipio[]>('municipios.json')
const zonas = leer<ZonaSalud[]>('zonas_salud.json')
const esc = escenarioPorDefecto()
const navalcarnero = municipios.find((m) => m.nombre === 'Navalcarnero')!

const cuenta = (r: ResultadoMunicipio[]) => {
  const c = { tension: 0, polo: 0, oportunidad: 0, consolidacion: 0 }
  r.forEach((x) => c[x.tipo]++)
  return c
}
const caben = (r: ResultadoMunicipio[]) => r.reduce((s, x) => s + Math.min(x.caben, x.llegan), 0)

describe('escenario por defecto (2035, sin inversiones)', () => {
  const r = calcular(municipios, zonas, esc)

  it('mantiene las cifras de cabecera y los tipos', () => {
    expect(Math.round(caben(r))).toBe(56_796)
    expect(Math.round(esc.personas - caben(r))).toBe(77_630)
    expect(cuenta(r)).toEqual({ tension: 78, polo: 37, oportunidad: 33, consolidacion: 7 })
  })

  it('mantiene la reubicación a 25 km', () => {
    const re = resumenReubicacion(calcular(municipios, zonas, { ...esc, reequilibrio: true }))
    expect(Math.round(re.personas)).toBe(26_856)
    expect(Math.round(esc.personas - caben(r) - re.personas)).toBe(50_774)
  })
})

describe('invertir en un centro de salud', () => {
  const centro = inversionesDe([nuevaObra(navalcarnero.ine, 'centro_salud', PARAMETROS_PLAN)])

  it('descuenta primero el exceso que ya tiene la zona (Navalcarnero, zona por encima del límite)', () => {
    const u = calcularUmbrales(municipios.filter((m) => m.universo), zonas, esc.exigencia)
    const c = navalcarnero.capacidad!
    expect(c.zbs_poblacion).toBeGreaterThan(u.zonaSalud) // la zona ya está por encima

    const sin = calcular(municipios, zonas, esc).find((x) => x.ine === navalcarnero.ine)!
    const con = calcular(municipios, zonas, esc, centro).find((x) => x.ine === navalcarnero.ine)!
    expect(sin.limites.sanidad).toBe(0)
    expect(con.limites.sanidad).toBeCloseTo(17_321, -1)
    // Lo que atiende el centro (la mediana de las zonas) menos la parte del municipio en el exceso de la zona
    const exceso = (c.zbs_poblacion - u.zonaSalud) * Math.min(1, navalcarnero.poblacion['2025'] / c.zbs_poblacion)
    expect(con.limites.sanidad).toBeCloseTo(PARAMETROS_PLAN.obras.centro_salud.plazas - exceso, 6)
  })

  it('no cambia el tipo de otros municipios', () => {
    const sin = calcular(municipios, zonas, esc)
    const con = calcular(municipios, zonas, esc, centro)
    const cambian = con.filter((x, i) => x.tipo !== sin[i].tipo)
    expect(cambian.map((x) => x.ine)).toEqual([navalcarnero.ine])
    expect(sin.find((x) => x.ine === navalcarnero.ine)!.tipo).toBe('tension')
    expect(cambian[0].tipo).toBe('polo')
    expect(cuenta(con).oportunidad).toBe(33)
    expect(cuenta(con).consolidacion).toBe(7)
  })
})

describe('reubicación y hospital', () => {
  const bustarviejo = municipios.find((m) => m.nombre === 'Bustarviejo')!

  it.each([25, 50])('ningún pueblo con el hospital lejos recibe gente, sea del tipo que sea (a %i km)', (radioKm) => {
    const r = calcular(municipios, zonas, { ...esc, reequilibrio: true, radioKm })
    const b = r.find((x) => x.ine === bustarviejo.ine)!
    expect(bustarviejo.hospital_km).toBeGreaterThan(HOSPITAL_LEJOS_KM)
    expect(b.tipo).toBe('polo') // no es una oportunidad condicionada, y aun así no recibe
    expect(b.margen).toBeGreaterThan(0) // tiene sitio
    expect(b.recibe).toBe(0)
    expect(b.llegadas).toEqual([])
    const lejos = new Set(municipios.filter((m) => m.hospital_km > HOSPITAL_LEJOS_KM).map((m) => m.ine))
    expect(resumenReubicacion(r).traslados.filter((t) => lejos.has(t.destino))).toEqual([])
  })
})

describe('colegios: plazas con la matrícula, personas con los niños que viven en el municipio', () => {
  const manzanares = municipios.find((m) => m.nombre === 'Manzanares el Real')!
  const c = manzanares.capacidad!

  it('un instituto con pocos alumnos (la mayoría estudia fuera) no da cientos de personas por plaza', () => {
    const u = calcularUmbrales(municipios.filter((m) => m.universo), zonas, esc.exigencia)
    expect(c.alumnos_secundaria).toBeLessThan(c.ninos_secundaria / 10) // 61 alumnos de ESO frente a 724 chicos de 12 a 17 años
    const eso = nivelesColegio(manzanares, u).find((x) => x.nombre === 'secundaria')!
    const porPlaza = eso.caben / eso.libres
    expect(porPlaza).toBeCloseTo(manzanares.poblacion['2025'] / c.ninos_secundaria, 6) // un chico de 12 a 17 años por cada ~13 vecinos
    expect(porPlaza).toBeLessThan(20)

    const r = calcular(municipios, zonas, esc).find((x) => x.ine === manzanares.ine)!
    expect(Math.round(r.limites.colegios!)).toBe(4_064) // manda primaria; ESO daría 5.653
    expect(r.limitante).toBe('vivienda')
  })
})

describe('plan', () => {
  const conReubicar = escenarioDelPlan(esc)
  const sinReubicar = { ...esc, reequilibrio: false }
  const cuantas = (obras: Obra[]) => {
    const n: Record<TipoObra, number> = { ampliar_primaria: 0, colegio_primaria: 0, instituto: 0, centro_salud: 0 }
    obras.forEach((o) => n[o.tipo]++)
    return n
  }

  it('los valores por defecto salen de los datos: un centro atiende a la mediana de las 286 zonas', () => {
    const p = zonas.map((z) => z.poblacion).sort((a, b) => a - b)
    expect(zonas.length).toBe(286)
    expect(PARAMETROS_PLAN.obras.centro_salud.plazas).toBe((p[142] + p[143]) / 2)
    expect(costeObra(nuevaObra('28001', 'colegio_primaria', PARAMETROS_PLAN))).toBe(450 * 12_900)
    expect(costeObra(nuevaObra('28001', 'centro_salud', PARAMETROS_PLAN))).toBe(7_100_000) // coste fijo
  })

  it('plan óptimo por defecto, reubicando en pueblos cercanos', () => {
    const plan = planOptimo(municipios, zonas, conReubicar, PARAMETROS_PLAN)
    const r = evaluarPlan(municipios, zonas, conReubicar, plan)
    expect(cuantas(plan)).toEqual({ ampliar_primaria: 10, colegio_primaria: 0, instituto: 3, centro_salud: 10 })
    expect(r.municipios).toBe(20)
    expect(r.coste).toBe(124_100_000)
    expect(Math.round(r.sinSitioAntes)).toBe(50_774)
    expect(Math.round(r.sinSitio)).toBe(12_181)
    expect(Math.round(r.sinSitioPor.vivienda)).toBe(12_159)
    expect(r.sinSitioPor.ritmo).toBe(0)
    expect(r.ultimaApertura).toBe(2030)
    expect(plan.every((o) => o.inicio === 2027)).toBe(true)
    // El calendario suma lo que pasa a caber
    expect(r.calendario.reduce((s, c) => s + c.personas, 0)).toBeCloseTo(r.pasanACaber, 6)
  })

  it('cada pueblo con lo suyo (sin reubicar) necesita mucho más', () => {
    const plan = planOptimo(municipios, zonas, sinReubicar, PARAMETROS_PLAN)
    const r = evaluarPlan(municipios, zonas, sinReubicar, plan)
    expect(cuantas(plan)).toEqual({ ampliar_primaria: 26, colegio_primaria: 0, instituto: 13, centro_salud: 22 })
    expect(r.municipios).toBe(49)
    expect(r.coste).toBe(362_900_000)
    expect(Math.round(r.sinSitioAntes)).toBe(77_630)
    expect(Math.round(r.sinSitio)).toBe(23_897) // la misma cifra que daba etl/plan_inversion.py
  })

  it('no amplía más colegios de los que ya tiene un municipio', () => {
    const plan = planOptimo(municipios, zonas, sinReubicar, PARAMETROS_PLAN)
    for (const m of municipios.filter((x) => x.capacidad)) {
      expect(plan.filter((o) => o.ine === m.ine && o.tipo === 'ampliar_primaria').length).toBeLessThanOrEqual(m.capacidad!.colegios_primaria)
    }
  })

  it('edición a mano: añadir, cambiar plazas y borrar filas', () => {
    const fila = nuevaObra(navalcarnero.ine, 'centro_salud', PARAMETROS_PLAN)
    const uno = evaluarPlan(municipios, zonas, conReubicar, [fila])
    expect(uno.coste).toBe(7_100_000)
    expect(uno.obras.centro_salud).toBe(1)
    expect(uno.ganaPorObra[0]).toBeGreaterThan(0)
    expect(uno.pasanACaber).toBeGreaterThan(0)
    expect(uno.ultimaApertura).toBe(2030)

    // Una ampliación más pequeña cuesta menos y gana menos o lo mismo
    const colegio = { ...nuevaObra(navalcarnero.ine, 'ampliar_primaria', PARAMETROS_PLAN), plazas: 100, eurosPorPlaza: 7_000, anios: 1 }
    const dos = evaluarPlan(municipios, zonas, conReubicar, [fila, colegio])
    expect(dos.coste).toBe(7_100_000 + 700_000)
    expect(aperturaObra(colegio)).toBe(2028)
    const grande = evaluarPlan(municipios, zonas, conReubicar, [fila, { ...colegio, plazas: 225 }])
    expect(grande.ganaPorObra[1]).toBeGreaterThanOrEqual(dos.ganaPorObra[1])

    // Borrar la fila deja el resultado como sin plan
    const nada = evaluarPlan(municipios, zonas, conReubicar, [])
    expect(nada.pasanACaber).toBe(0)
    expect(nada.coste).toBe(0)
    expect(nada.ultimaApertura).toBeNull()
  })

  it('tope de presupuesto total y anual, y limitado a unos municipios', () => {
    const plan = planOptimo(municipios, zonas, conReubicar, PARAMETROS_PLAN, { presupuestoTotal: 50e6, presupuestoAnual: 10e6 })
    const r = evaluarPlan(municipios, zonas, conReubicar, plan)
    expect(r.coste).toBeGreaterThan(40e6)
    expect(r.coste).toBeLessThanOrEqual(50e6)
    expect(r.pasanACaber).toBeGreaterThan(0)
    // Ningún año se gasta más de 10 M€ (el coste de cada obra, repartido entre sus años)
    const gasto = new Map<number, number>()
    for (const o of plan) for (let k = 0; k < o.anios; k++) gasto.set(o.inicio + k, (gasto.get(o.inicio + k) ?? 0) + costeObra(o) / o.anios)
    expect(Math.max(...gasto.values())).toBeLessThanOrEqual(10e6 + 1)
    expect(Math.min(...plan.map((o) => o.inicio))).toBe(2027)
    expect(Math.max(...plan.map((o) => o.inicio))).toBeGreaterThan(2027) // no cabe todo el primer año

    const solo = [navalcarnero.ine]
    const local = planOptimo(municipios, zonas, conReubicar, PARAMETROS_PLAN, { soloMunicipios: solo })
    expect(local.length).toBeGreaterThan(0)
    expect(local.every((o) => o.ine === navalcarnero.ine)).toBe(true)
  })

  it('«Ver en el mapa» da las mismas cifras que el plan', () => {
    const plan = planOptimo(municipios, zonas, conReubicar, PARAMETROS_PLAN)
    const r = evaluarPlan(municipios, zonas, conReubicar, plan)
    // Lo que hace el simulador: la lista convertida en inversiones, con el escenario del plan
    const mapa = cifrasCabecera(calcular(municipios, zonas, escenarioDelPlan(esc), inversionesDe(plan)))
    expect(mapa.sinSitio).toBeCloseTo(r.sinSitio, 6)
    expect(mapa.reubicadas).toBeCloseTo(r.reubicadas, 6)
    expect(mapa.dentro).toBeCloseTo(esc.personas - r.sinSitio, 6)
  })
})
