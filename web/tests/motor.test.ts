// Tests del motor con los datos reales (web/public/datos). Se ejecutan con «npm test».
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { HOSPITAL_LEJOS_KM, HOSPITAL_LEJOS_MIN, RADIO_REUBICACION_MIN, calcular, calcularUmbrales, escenarioPorDefecto, nivelesColegio, resumenReubicacion } from '../src/motor'
import type { Municipio, ResultadoMunicipio, ZonaSalud } from '../src/tipos'

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
  it('descuenta primero el exceso que ya tiene la zona (Navalcarnero, zona por encima del límite)', () => {
    const u = calcularUmbrales(municipios.filter((m) => m.universo), zonas, esc.exigencia)
    const c = navalcarnero.capacidad!
    expect(c.zbs_poblacion).toBeGreaterThan(u.zonaSalud) // la zona ya está por encima

    const sin = calcular(municipios, zonas, esc).find((x) => x.ine === navalcarnero.ine)!
    const con = calcular(municipios, zonas, esc, { [navalcarnero.ine]: { colegios: 0, centros: 1 } }).find((x) => x.ine === navalcarnero.ine)!
    expect(sin.limites.sanidad).toBe(0)
    expect(con.limites.sanidad).toBeCloseTo(33_134, -1)
    // Lo que añade el centro menos la parte del municipio en el exceso de la zona
    const exceso = (c.zbs_poblacion - u.zonaSalud) * Math.min(1, navalcarnero.poblacion['2025'] / c.zbs_poblacion)
    expect(con.limites.sanidad).toBeCloseTo(u.zonaSalud - exceso, 6)
  })

  it('no cambia el tipo de otros municipios', () => {
    const sin = calcular(municipios, zonas, esc)
    const con = calcular(municipios, zonas, esc, { [navalcarnero.ine]: { colegios: 0, centros: 1 } })
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

describe('medida en minutos en coche (OSRM, sin tráfico)', () => {
  const escMin = escenarioPorDefecto(2035, 'min')
  const lejosMin = new Set(municipios.filter((m) => m.hospital_min > HOSPITAL_LEJOS_MIN).map((m) => m.ine))

  it('por defecto, el motor mide en km y la web en minutos', () => {
    expect(esc.medida).toBe('km')
    expect(escMin).toEqual({ ...esc, medida: 'min' })
    expect(escMin.radioMin).toBe(RADIO_REUBICACION_MIN)
  })

  it('no cambia ni lo que cabe ni los tipos: solo qué oportunidades quedan condicionadas', () => {
    const km = calcular(municipios, zonas, esc)
    const min = calcular(municipios, zonas, escMin)
    expect(Math.round(caben(min))).toBe(56_796)
    expect(min.map((x) => x.tipo)).toEqual(km.map((x) => x.tipo))
    expect(km.filter((x) => x.condicionada)).toHaveLength(17)
    const cond = min.filter((x) => x.condicionada)
    expect(cond).toHaveLength(18)
    expect(cond.every((x) => lejosMin.has(x.ine))).toBe(true)
    // Villar del Olmo: a menos de 25 km en línea recta, pero a más de 30 min en coche
    const villar = municipios.find((m) => m.nombre === 'Villar del Olmo')!
    expect(villar.hospital_km).toBeLessThanOrEqual(HOSPITAL_LEJOS_KM)
    expect(cond.map((x) => x.ine)).toContain(villar.ine)
  })

  it('reubica a 30 min en coche', () => {
    const r = calcular(municipios, zonas, { ...escMin, reequilibrio: true })
    const re = resumenReubicacion(r)
    expect(Math.round(re.personas)).toBe(26_346)
    expect(re.destinos).toBe(30)
    expect(Math.round(escMin.personas - caben(r) - re.personas)).toBe(51_284)
    expect(re.traslados.every((t) => t.min !== null && t.min <= RADIO_REUBICACION_MIN)).toBe(true)
  })

  it.each([10, 30, 45])('ningún pueblo con el hospital a más de 30 min recibe gente (a %i min)', (radioMin) => {
    const r = calcular(municipios, zonas, { ...escMin, reequilibrio: true, radioMin })
    const traslados = resumenReubicacion(r).traslados
    expect(traslados.length).toBeGreaterThan(0)
    expect(traslados.filter((t) => lejosMin.has(t.destino))).toEqual([])
    expect(traslados.every((t) => t.min! <= radioMin)).toBe(true)
  })

  it('más minutos, más gente reubicada', () => {
    const personas = [10, 20, 30, 45].map((radioMin) =>
      resumenReubicacion(calcular(municipios, zonas, { ...escMin, reequilibrio: true, radioMin })).personas)
    expect(personas).toEqual([...personas].sort((a, b) => a - b))
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
