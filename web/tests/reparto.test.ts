// Tests de la pestaña «Repartir» (src/reparto.ts) con los datos reales. Se ejecutan con «npm test».
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { HOSPITAL_LEJOS_KM, HOSPITAL_LEJOS_MIN, calcular, escenarioPorDefecto } from '../src/motor'
import { FILTROS_INICIALES, TAMANOS, rankingMudanza } from '../src/mudanza'
import { FILTROS_REPARTO, MEZCLA_SUPUESTA, cabenSinDirigir, hueco, llegadasPorPerfil, repartir } from '../src/reparto'
import type { FiltrosReparto, Municipio, ZonaSalud } from '../src/tipos'

const leer = <T>(archivo: string): T => JSON.parse(readFileSync(new URL(`../public/datos/${archivo}`, import.meta.url), 'utf8'))
const municipios = leer<Municipio[]>('municipios.json')
const zonas = leer<ZonaSalud[]>('zonas_salud.json')
const esc = escenarioPorDefecto()
const r = calcular(municipios, zonas, esc)
const porIne = new Map(municipios.map((m) => [m.ine, m]))
const porIneRes = new Map(r.map((x) => [x.ine, x]))
const capacidad = r.reduce((s, x) => s + hueco(x), 0)
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
        const cabe = hueco(porIneRes.get(p.ine)!)
        expect(p.total).toBeLessThanOrEqual(cabe)
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

  it('por turnos: si no hay sitio para todos, falta para los tres grupos', () => {
    const rp = repartir(r, porIne, llegan)
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
