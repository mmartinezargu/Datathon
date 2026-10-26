// Tests del simulador de reparto (src/reparto.ts) con los datos reales. Se ejecutan con «npm test».
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { HOSPITAL_LEJOS_KM, calcular, escenarioPorDefecto } from '../src/motor'
import { MEZCLA_SUPUESTA, cabenSinDirigir, hueco, llegadasPorPerfil, repartir } from '../src/reparto'
import type { Municipio, ZonaSalud } from '../src/tipos'

const leer = <T>(archivo: string): T => JSON.parse(readFileSync(new URL(`../public/datos/${archivo}`, import.meta.url), 'utf8'))
const municipios = leer<Municipio[]>('municipios.json')
const zonas = leer<ZonaSalud[]>('zonas_salud.json')
const esc = escenarioPorDefecto()
const r = calcular(municipios, zonas, esc)
const porIne = new Map(municipios.map((m) => [m.ine, m]))
const huecoDe = new Map(r.map((x) => [x.ine, hueco(x)]))
const capacidad = r.reduce((s, x) => s + hueco(x), 0)

describe('reparto de los que llegan', () => {
  it('divide a los que llegan según la mezcla, sin perder a nadie', () => {
    const ll = llegadasPorPerfil(esc.personas, MEZCLA_SUPUESTA)
    expect(ll.familia + ll.mayor + ll.teletrabajo).toBe(esc.personas)
    expect(llegadasPorPerfil(1_000, { familia: 1, mayor: 1, teletrabajo: 2 })).toEqual({ familia: 250, mayor: 250, teletrabajo: 500 })
  })

  for (const [nombre, mezcla] of [
    ['mezcla supuesta (50/20/30)', MEZCLA_SUPUESTA],
    ['solo personas mayores', { familia: 0, mayor: 100, teletrabajo: 0 }],
  ] as const) {
    const llegan = llegadasPorPerfil(esc.personas, mezcla)
    const rp = repartir(r, porIne, llegan)

    it(`${nombre}: nadie se pierde y ningún pueblo pasa de lo que le cabe`, () => {
      expect(rp.colocados + rp.sinSitio.familia + rp.sinSitio.mayor + rp.sinSitio.teletrabajo).toBe(esc.personas)
      for (const p of rp.pueblos) {
        expect(p.total).toBeLessThanOrEqual(huecoDe.get(p.ine)!)
        expect(p.lleno).toBe(p.total === huecoDe.get(p.ine))
      }
    })

    it(`${nombre}: mayores solo con hospital cerca y familias solo con colegio`, () => {
      for (const p of rp.pueblos) {
        const m = porIne.get(p.ine)!
        if (p.porPerfil.mayor > 0) expect(m.hospital_km).toBeLessThanOrEqual(HOSPITAL_LEJOS_KM)
        if (p.porPerfil.familia > 0) expect(m.capacidad!.colegios_primaria).toBeGreaterThan(0)
      }
    })
  }

  it('repartiendo caben más que siguiendo la tendencia, y nunca más de lo que cabe en total', () => {
    const rp = repartir(r, porIne, llegadasPorPerfil(esc.personas, MEZCLA_SUPUESTA))
    expect(rp.colocados).toBeGreaterThan(cabenSinDirigir(r))
    expect(rp.colocados).toBeLessThanOrEqual(capacidad)
    expect(cabenSinDirigir(r)).toBe(60_785)
  })
})
