// Tests de la pestaña «Repartir» (src/reparto.ts) con los datos reales. Se ejecutan con «npm test».
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { HOSPITAL_LEJOS_KM, HOSPITAL_LEJOS_MIN, calcular, escenarioPorDefecto } from '../src/motor'
import { FILTROS_INICIALES, TAMANOS, mezclaDeFrase, rankingMudanza } from '../src/mudanza'
import { FILTROS_REPARTO, MEZCLA_SUPUESTA, aplicarMezcla, cabenSinDirigir, hueco, llegadasPorPerfil, repartir } from '../src/reparto'
import type { FiltrosReparto, Municipio, ZonaSalud } from '../src/tipos'

const leer = <T>(archivo: string): T => JSON.parse(readFileSync(new URL(`../public/datos/${archivo}`, import.meta.url), 'utf8'))
const municipios = leer<Municipio[]>('municipios.json')
const zonas = leer<ZonaSalud[]>('zonas_salud.json')
const esc = escenarioPorDefecto()
const r = calcular(municipios, zonas, esc)
const porIne = new Map(municipios.map((m) => [m.ine, m]))
const porIneRes = new Map(r.map((x) => [x.ine, x]))
// Lo más que cabe en total: sin contar colegios (mayores y teletrabajo no los usan)
const capacidad = r.reduce((s, x) => s + hueco(x, 'mayor'), 0)
const llegan = llegadasPorPerfil(esc.personas, MEZCLA_SUPUESTA)

describe('repartir a los que llegan', () => {
  it('divide a los que llegan según la mezcla, sin perder a nadie', () => {
    expect(llegan.familia + llegan.mayor + llegan.teletrabajo).toBe(esc.personas)
    expect(llegadasPorPerfil(1_000, { familia: 1, mayor: 1, teletrabajo: 2 })).toEqual({ familia: 250, mayor: 250, teletrabajo: 500 })
  })

  const casos: [string, FiltrosReparto][] = [
    ['sin filtros', FILTROS_REPARTO],
    ['solo Sierra Norte, pueblos, todos con hospital cerca', { zona: 'Sierra Norte', tamano: 'pueblo', hospitalCerca: true, instituto: false }],
    ['familias solo con instituto', { ...FILTROS_REPARTO, instituto: true }],
  ]
  for (const [nombre, filtros] of casos) {
    const rp = repartir(r, porIne, llegan, filtros)

    it(`${nombre}: nadie se pierde y ningún pueblo pasa de lo que le cabe`, () => {
      expect(rp.colocados + rp.sinSitio.familia + rp.sinSitio.mayor + rp.sinSitio.teletrabajo).toBe(esc.personas)
      for (const p of rp.pueblos) {
        const res = porIneRes.get(p.ine)!
        const cabe = hueco(res, 'mayor')
        expect(p.total).toBeLessThanOrEqual(cabe)
        expect(p.porPerfil.familia).toBeLessThanOrEqual(hueco(res, 'familia'))
        expect(p.lleno).toBe(p.total === cabe)
      }
    })

    it(`${nombre}: cada uno va solo a donde puede`, () => {
      for (const p of rp.pueblos) {
        const m = porIne.get(p.ine)!
        const res = porIneRes.get(p.ine)!
        if (p.porPerfil.mayor > 0 || filtros.hospitalCerca) expect(m.hospital_km).toBeLessThanOrEqual(HOSPITAL_LEJOS_KM)
        if (p.porPerfil.familia > 0) expect(m.capacidad!.colegios_primaria).toBeGreaterThan(0)
        if (p.porPerfil.familia > 0 && filtros.instituto) expect(m.capacidad!.colegios_secundaria).toBeGreaterThan(0)
        if (filtros.zona) expect(m.zona).toBe(filtros.zona)
        expect(res.poblacion).toBeGreaterThanOrEqual(TAMANOS[filtros.tamano].desde)
        expect(res.poblacion).toBeLessThan(TAMANOS[filtros.tamano].hasta)
      }
    })
  }

  it('mayores y teletrabajo no ocupan plazas de colegio: un municipio sin sitio en colegios recibe mayores y no familias', () => {
    // Uno de verdad: colegios a 0, con sitio en casas y sanidad, colegio de primaria y hospital cerca
    const res = r.find((x) => {
      const m = porIne.get(x.ine)!
      return (x.limites.colegios ?? 1) < 1 && (x.limites.vivienda ?? 0) > 200 && (x.limites.sanidad ?? 0) > 200 && (x.limites.ritmo ?? 0) > 200
        && m.capacidad!.colegios_primaria > 0 && m.hospital_km <= HOSPITAL_LEJOS_KM
    })!
    expect(res).toBeDefined()
    expect(hueco(res, 'familia')).toBe(0)
    expect(hueco(res, 'mayor')).toBeGreaterThan(0)
    const rp = repartir([res], porIne, { familia: 100, mayor: 100, teletrabajo: 100 })
    const fila = rp.pueblos.find((p) => p.ine === res.ine)!
    expect(fila.porPerfil.familia).toBe(0)
    expect(fila.porPerfil.mayor).toBeGreaterThan(0)
    expect(fila.porPerfil.teletrabajo).toBeGreaterThan(0)
    expect(rp.sinSitio.familia).toBe(100)
  })

  it('por turnos: si no hay sitio para todos, falta para los tres grupos', () => {
    // Con el triple de gente no cabe nadie más de ningún grupo (con la de por defecto, mayores y teletrabajo caben todos: no usan colegios)
    const rp = repartir(r, porIne, llegadasPorPerfil(3 * esc.personas, MEZCLA_SUPUESTA))
    expect(rp.sinSitio.familia).toBeGreaterThan(0)
    expect(rp.sinSitio.mayor).toBeGreaterThan(0)
    expect(rp.sinSitio.teletrabajo).toBeGreaterThan(0)
  })

  it('repartiendo caben más que siguiendo la tendencia, y nunca más de lo que cabe en total', () => {
    const rp = repartir(r, porIne, llegan)
    expect(rp.colocados).toBeGreaterThan(cabenSinDirigir(r))
    expect(rp.colocados).toBeLessThanOrEqual(capacidad)
    expect(cabenSinDirigir(r)).toBe(56_796) // la misma cifra de cabecera que el mapa
  })
})

describe('«Atraer» y «Dónde vivir» con la medida en minutos en coche', () => {
  const conHospital: FiltrosReparto = { ...FILTROS_REPARTO, hospitalCerca: true }
  const cercaKm = (m: Municipio) => m.hospital_km <= HOSPITAL_LEJOS_KM
  const cercaMin = (m: Municipio) => m.hospital_min <= HOSPITAL_LEJOS_MIN

  it('«hospital cerca» usa los minutos (OSRM) y no los km', () => {
    const rp = repartir(r, porIne, llegan, conHospital, 'min')
    expect(rp.pueblos.length).toBeGreaterThan(0)
    for (const p of rp.pueblos) expect(cercaMin(porIne.get(p.ine)!)).toBe(true)
    // Algún pueblo lejos en km pero no en minutos recibe gente: la medida cambia el reparto
    expect(rp.pueblos.some((p) => !cercaKm(porIne.get(p.ine)!))).toBe(true)
  })

  it('con km sale lo mismo que sin decir la medida', () => {
    expect(repartir(r, porIne, llegan, conHospital, 'km')).toEqual(repartir(r, porIne, llegan, conHospital))
  })

  it('«Dónde vivir»: la casilla del hospital filtra con la medida elegida', () => {
    const filtros = { ...FILTROS_INICIALES, colegio: false, sitioLibre: false, hospitalCerca: true }
    const min = rankingMudanza(r, porIne, filtros, 'min').map((c) => porIne.get(c.ine)!)
    const km = rankingMudanza(r, porIne, filtros, 'km').map((c) => porIne.get(c.ine)!)
    expect(min.every(cercaMin)).toBe(true)
    expect(km.every(cercaKm)).toBe(true)
    expect(min.map((m) => m.ine).sort()).not.toEqual(km.map((m) => m.ine).sort())
  })
})

describe('porcentajes de quién llega («30 % familias»)', () => {
  it('el lector de palabras clave los entiende', () => {
    expect(mezclaDeFrase('hay un 30% de familias')).toEqual({ familia: 30 })
    expect(mezclaDeFrase('30 % familias y 50 % jubilados')).toEqual({ familia: 30, mayor: 50 })
    expect(mezclaDeFrase('el 20 por ciento son jubilados, teletrabajo al 40%')).toEqual({ mayor: 20, teletrabajo: 40 })
    expect(mezclaDeFrase('la mitad familias')).toEqual({ familia: 50 })
    expect(mezclaDeFrase('somos 4 y trabajo en getafe')).toBeNull()
  })

  it('pone lo dicho y reparte el resto como estaba, siempre sumando 100', () => {
    expect(aplicarMezcla(MEZCLA_SUPUESTA, { familia: 30 })).toEqual({ familia: 30, mayor: 28, teletrabajo: 42 })
    expect(aplicarMezcla(MEZCLA_SUPUESTA, { familia: 30, mayor: 50 })).toEqual({ familia: 30, mayor: 50, teletrabajo: 20 })
    expect(aplicarMezcla({ familia: 0, mayor: 0, teletrabajo: 100 }, { familia: 30 })).toEqual({ familia: 30, mayor: 0, teletrabajo: 70 })
    const pasado = aplicarMezcla(MEZCLA_SUPUESTA, { familia: 80, mayor: 50 })
    expect(pasado.familia + pasado.mayor + pasado.teletrabajo).toBe(100)
  })
})
