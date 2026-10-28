// Tests del motor con los datos reales (web/public/datos). Se ejecutan con «npm test».
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  HOSPITAL_LEJOS_KM, HOSPITAL_LEJOS_MIN, OBRAS_REFERENCIA, PARAMETROS_PLAN, anadirObra, colocarObra, ordenarObras, RADIO_REUBICACION_MIN, aperturaObra, calcular, calcularUmbrales, cifrasCabecera, costeObra, escenarioDelPlan, escenarioPorDefecto,
  evaluarPlan, inversionesDe, inversionesPorZona, nivelesColegio, nuevaObra, planOptimo, quedanSinSitio, resumenReubicacion,
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
    // El centro suma a la zona: (límite + lo que atiende − población de la zona) × la parte del municipio en la zona
    const parte = Math.min(1, navalcarnero.poblacion['2025'] / c.zbs_poblacion)
    expect(con.limites.sanidad).toBeCloseTo((u.zonaSalud + PARAMETROS_PLAN.obras.centro_salud.plazas - c.zbs_poblacion) * parte, 6)
    expect(con.limites.sanidad).toBeGreaterThan(0)
  })

  it('sirve a toda su zona, y solo cambia el tipo de municipios de esa zona', () => {
    const sin = calcular(municipios, zonas, esc)
    const con = calcular(municipios, zonas, esc, centro)
    const zona = navalcarnero.capacidad!.zbs_codigo
    const deLaZona = new Set(municipios.filter((m) => m.universo && m.capacidad?.zbs_codigo === zona).map((m) => m.ine))
    const cambian = con.filter((x, i) => x.tipo !== sin[i].tipo).map((x) => x.ine)
    expect(cambian).toContain(navalcarnero.ine)
    expect(cambian.every((ine) => deLaZona.has(ine))).toBe(true)
    // Todos los de la zona ganan sitio por sanidad; los de otras zonas, no
    con.forEach((x, i) => {
      if (deLaZona.has(x.ine)) expect(x.limites.sanidad!).toBeGreaterThanOrEqual(sin[i].limites.sanidad!)
      else expect(x.limites.sanidad).toBe(sin[i].limites.sanidad)
    })
  })

  it('un centro puesto en un pueblo de la zona da lo mismo que en otro de la misma zona', () => {
    const molar = municipios.filter((m) => m.universo && m.capacidad?.zbs_nombre === 'El Molar')
    expect(molar.length).toBeGreaterThan(1)
    const en = (ine: string) => calcular(municipios, zonas, esc, inversionesDe([nuevaObra(ine, 'centro_salud', PARAMETROS_PLAN)])).map((x) => x.caben)
    expect(en(molar[0].ine)).toEqual(en(molar[1].ine))
    const porZona = inversionesPorZona(inversionesDe([nuevaObra(molar[0].ine, 'centro_salud', PARAMETROS_PLAN)]), municipios)
    for (const m of molar) expect(porZona[m.ine].centros).toBe(1)
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
    expect(costeObra(nuevaObra('28001', 'colegio_primaria', PARAMETROS_PLAN))).toBe(450 * 18_583)
    expect(costeObra(nuevaObra('28001', 'centro_salud', PARAMETROS_PLAN))).toBe(6_670_000) // coste fijo
  })

  it('el coste por defecto de cada obra es la mediana de sus obras de referencia', () => {
    const med = (v: number[]) => { const s = [...v].sort((a, b) => a - b); const k = Math.floor(s.length / 2); return s.length % 2 ? s[k] : (s[k - 1] + s[k]) / 2 }
    for (const t of ['ampliar_primaria', 'colegio_primaria', 'instituto', 'centro_salud'] as TipoObra[]) {
      const obras = OBRAS_REFERENCIA.obras.filter((o) => o.obra_plan === t)
      const valores = obras.map((o) => (t === 'centro_salud' ? o.coste_eur : o.coste_eur / o.plazas!))
      expect(obras.length).toBe(OBRAS_REFERENCIA.medianas[t].n)
      expect(PARAMETROS_PLAN.obras[t].eurosPorPlaza).toBe(Math.round(med(valores)))
      expect(obras.every((o) => o.url.startsWith('https://www.comunidad.madrid/') && !o.url.includes('download'))).toBe(true)
    }
    expect(PARAMETROS_PLAN.obras).toMatchObject({
      ampliar_primaria: { eurosPorPlaza: 10_936 }, colegio_primaria: { eurosPorPlaza: 18_583 },
      instituto: { eurosPorPlaza: 12_562 }, centro_salud: { eurosPorPlaza: 6_670_000 },
    })
  })

  it('un centro de salud va al municipio más poblado de su zona, sin cambiar coste ni personas', () => {
    const mejorada = municipios.find((m) => m.nombre === 'Mejorada del Campo')!
    const loeches = municipios.find((m) => m.nombre === 'Loeches')!
    expect(loeches.capacidad!.zbs_codigo).toBe(mejorada.capacidad!.zbs_codigo)
    const enLoeches = nuevaObra(loeches.ine, 'centro_salud', PARAMETROS_PLAN)
    expect(colocarObra(enLoeches, municipios).ine).toBe(mejorada.ine)
    // Un colegio no se mueve
    expect(colocarObra(nuevaObra(loeches.ine, 'ampliar_primaria', PARAMETROS_PLAN), municipios).ine).toBe(loeches.ine)
    for (const e of [conReubicar, sinReubicar]) {
      const plan = planOptimo(municipios, zonas, e, PARAMETROS_PLAN)
      const zona = (ine: string) => municipios.find((m) => m.ine === ine)!.capacidad!.zbs_codigo
      for (const o of plan.filter((x) => x.tipo === 'centro_salud')) {
        const deZona = municipios.filter((m) => m.universo && m.capacidad?.zbs_codigo === zona(o.ine))
        expect(o.ine).toBe(deZona.sort((a, b) => b.poblacion['2025'] - a.poblacion['2025'])[0].ine)
      }
      // Con el centro en cualquier otro municipio de su zona, las cifras son las mismas
      const otro = plan.map((o) => (o.tipo !== 'centro_salud' ? o
        : { ...o, ine: municipios.filter((m) => m.universo && m.capacidad?.zbs_codigo === zona(o.ine)).at(-1)!.ine }))
      const a = evaluarPlan(municipios, zonas, e, plan)
      const b = evaluarPlan(municipios, zonas, e, otro)
      expect(b.coste).toBe(a.coste)
      expect(b.sinSitio).toBeCloseTo(a.sinSitio, 6)
    }
  })

  it('la lista va con los colegios arriba y las obras nuevas se añaden arriba de su grupo', () => {
    const plan = planOptimo(municipios, zonas, conReubicar, PARAMETROS_PLAN)
    expect(ordenarObras(plan)).toEqual(plan)
    const colegio = nuevaObra(navalcarnero.ine, 'instituto', PARAMETROS_PLAN)
    const centro = nuevaObra(navalcarnero.ine, 'centro_salud', PARAMETROS_PLAN)
    const conColegio = anadirObra(plan, colegio, municipios)
    expect(conColegio[0]).toEqual(colegio)
    const conCentro = anadirObra(plan, centro, municipios)
    const colegios = plan.filter((o) => o.tipo !== 'centro_salud').length
    expect(conCentro[colegios]).toEqual(colocarObra(centro, municipios))
    expect(conCentro.length).toBe(plan.length + 1)
  })

  it('plan óptimo por defecto, reubicando en pueblos cercanos', () => {
    const plan = planOptimo(municipios, zonas, conReubicar, PARAMETROS_PLAN)
    const r = evaluarPlan(municipios, zonas, conReubicar, plan)
    expect(cuantas(plan)).toEqual({ ampliar_primaria: 7, colegio_primaria: 0, instituto: 2, centro_salud: 6 })
    expect(r.municipios).toBe(15)
    expect(r.coste).toBe(79_353_320)
    expect(Math.round(r.sinSitioAntes)).toBe(50_774)
    expect(Math.round(r.sinSitio)).toBe(9_319)
    expect(Math.round(r.sinSitioPor.vivienda)).toBe(9_319) // lo que queda es todo por vivienda
    expect(r.sinSitioPor.ritmo).toBe(0)
    expect(r.ultimaApertura).toBe(2030)
    expect(plan.every((o) => o.inicio === 2027)).toBe(true)
    // El calendario y lo que gana cada obra suman lo que pasa a caber
    expect(r.calendario.reduce((s, c) => s + c.personas, 0)).toBeCloseTo(r.pasanACaber, 6)
    expect(r.ganaPorObra.reduce((s, g) => s + g, 0)).toBeCloseTo(r.pasanACaber, 6)
  })

  it('cada pueblo con lo suyo (sin reubicar) necesita mucho más', () => {
    const plan = planOptimo(municipios, zonas, sinReubicar, PARAMETROS_PLAN)
    const r = evaluarPlan(municipios, zonas, sinReubicar, plan)
    expect(cuantas(plan)).toEqual({ ampliar_primaria: 26, colegio_primaria: 0, instituto: 13, centro_salud: 8 })
    expect(r.municipios).toBe(41)
    expect(r.coste).toBe(261_044_880)
    expect(Math.round(r.sinSitioAntes)).toBe(77_630)
    expect(Math.round(r.sinSitio)).toBe(23_874)
  })

  it.each([true, false])('no pone dos centros en la misma zona salvo que la zona lo necesite (reubicando: %s)', (reequilibrio) => {
    const e = { ...esc, reequilibrio }
    const plan = planOptimo(municipios, zonas, e, PARAMETROS_PLAN)
    const u = calcularUmbrales(municipios.filter((m) => m.universo), zonas, e.exigencia)
    const llegan = new Map(calcular(municipios, zonas, e).map((r) => [r.ine, r.llegan]))
    const porZona = new Map<string, number>()
    for (const o of plan.filter((x) => x.tipo === 'centro_salud')) {
      const z = municipios.find((m) => m.ine === o.ine)!.capacidad!.zbs_codigo
      porZona.set(z, (porZona.get(z) ?? 0) + 1)
    }
    expect(porZona.size).toBeGreaterThan(0)
    for (const [z, n] of porZona) {
      if (n < 2) continue
      // Exceso de la zona: población + lo que les llega a sus municipios del reto − límite
      const deLaZona = municipios.filter((m) => m.capacidad?.zbs_codigo === z)
      const exceso = deLaZona[0].capacidad!.zbs_poblacion + deLaZona.reduce((s, m) => s + (llegan.get(m.ine) ?? 0), 0) - u.zonaSalud
      expect(exceso).toBeGreaterThan((n - 1) * PARAMETROS_PLAN.obras.centro_salud.plazas)
    }
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
    expect(uno.coste).toBe(6_670_000)
    expect(uno.obras.centro_salud).toBe(1)
    expect(uno.ganaPorObra[0]).toBeGreaterThan(0)
    expect(uno.pasanACaber).toBeGreaterThan(0)
    expect(uno.ultimaApertura).toBe(2030)

    // Una ampliación más pequeña cuesta menos y gana menos o lo mismo
    const colegio = { ...nuevaObra(navalcarnero.ine, 'ampliar_primaria', PARAMETROS_PLAN), plazas: 100, eurosPorPlaza: 7_000, anios: 1 }
    const dos = evaluarPlan(municipios, zonas, conReubicar, [fila, colegio])
    expect(dos.coste).toBe(6_670_000 + 700_000)
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

  it('con el plan cargado, el mapa colorea por lo que falta después de reubicar y con las obras', () => {
    const plan = planOptimo(municipios, zonas, conReubicar, PARAMETROS_PLAN)
    const inv = inversionesDe(plan)
    const antes = calcular(municipios, zonas, conReubicar, inv)
    const despues = calcular(municipios, zonas, conReubicar, inv, { tiposDespues: true })
    expect(despues.map((r) => r.caben)).toEqual(antes.map((r) => r.caben)) // solo cambian los colores
    const tension = despues.filter((r) => r.tipo === 'tension')
    expect(tension.map((r) => r.ine)).toEqual(despues.filter((r) => quedanSinSitio(r) >= 25).map((r) => r.ine))
    expect(tension.length).toBeLessThan(cuenta(antes).tension)
    // Sin plan, los colores de siempre
    expect(cuenta(calcular(municipios, zonas, esc))).toEqual({ tension: 78, polo: 37, oportunidad: 33, consolidacion: 7 })
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
