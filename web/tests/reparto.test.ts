// Tests del simulador «¿Y si llegan más?» (src/reparto.ts) con los datos reales. Se ejecutan con «npm test».
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { HOSPITAL_LEJOS_KM, calcular, escenarioPorDefecto } from '../src/motor'
import { LLEGADAS_EJEMPLO, hueco, repartir } from '../src/reparto'
import type { Municipio, ZonaSalud } from '../src/tipos'

const leer = <T>(archivo: string): T => JSON.parse(readFileSync(new URL(`../public/datos/${archivo}`, import.meta.url), 'utf8'))
const municipios = leer<Municipio[]>('municipios.json')
const zonas = leer<ZonaSalud[]>('zonas_salud.json')
const r = calcular(municipios, zonas, escenarioPorDefecto())
const porIne = new Map(municipios.map((m) => [m.ine, m]))
const huecoDe = new Map(r.map((x) => [x.ine, hueco(x)]))
const huecoTotal = r.reduce((s, x) => s + hueco(x), 0)

describe('reparto de recién llegados', () => {
  for (const [nombre, llegan] of [
    ['el ejemplo (10.000)', LLEGADAS_EJEMPLO],
    ['más de lo que cabe (50.000)', { familia: 20_000, mayor: 10_000, teletrabajo: 20_000 }],
  ] as const) {
    const rp = repartir(r, porIne, llegan)

    it(`${nombre}: nadie se pierde y ningún pueblo pasa de su hueco`, () => {
      const sin = rp.sinSitio.familia + rp.sinSitio.mayor + rp.sinSitio.teletrabajo
      expect(rp.colocados + sin).toBe(llegan.familia + llegan.mayor + llegan.teletrabajo)
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

  it('con más gente que sitio, se llena todo el sitio libre', () => {
    const rp = repartir(r, porIne, { familia: 0, mayor: 0, teletrabajo: huecoTotal + 1_000 })
    expect(rp.colocados).toBe(huecoTotal)
    expect(rp.sinSitio.teletrabajo).toBe(1_000)
  })
})
