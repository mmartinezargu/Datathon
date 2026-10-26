// Pestaña «Repartir» (#repartir), el simulador de reparto: coge la gente que el modelo prevé que llega, la divide
// por perfiles (familias, personas mayores, teletrabajo) y la reparte entre los pueblos según quiénes son
// (reparto.ts), como si se pudiera dirigir a dónde va cada uno. Se recalcula al escribir.

import { useMemo, useState } from 'react'
import { LIMITES } from '../colores'
import { PERFILES } from '../mudanza'
import { MEZCLA_SUPUESTA, ORDEN_REPARTO, cabenSinDirigir, hueco, llegadasPorPerfil, repartir } from '../reparto'
import type { Escenario, Inversion, Inversiones, Municipio, Perfil, ResultadoMunicipio } from '../tipos'
import { miles, millones } from '../formato'
import { COSTE_CENTRO_SALUD, COSTE_COLEGIO, HOSPITAL_LEJOS_KM, SIN_INVERSION, costeInversion } from '../motor'
import { Icono } from './Iconos'

const MAX_FILAS = 10

interface Props {
  resultados: ResultadoMunicipio[] // con las inversiones
  resultadosSinInversion: ResultadoMunicipio[]
  porIne: Map<string, Municipio>
  escenario: Escenario
  inversiones: Inversiones // las mismas que «¿y si invertimos aquí?» del mapa
  onInvertir: (ine: string, inv: Inversion) => void
  onVerEnMapa: (ine: string) => void
}

/** Plural sencillo: 1 colegio, 2 colegios. */
const cuantos = (n: number, uno: string, varios: string) => `${miles(n)} ${n === 1 ? uno : varios}`

export function Simulador({ resultados, resultadosSinInversion, porIne, escenario, inversiones, onInvertir, onVerEnMapa }: Props) {
  const [mezcla, setMezcla] = useState<Record<Perfil, number>>(MEZCLA_SUPUESTA)
  const [todos, setTodos] = useState(false)
  const llegan = useMemo(() => llegadasPorPerfil(escenario.personas, mezcla), [escenario.personas, mezcla])
  const reparto = useMemo(() => repartir(resultados, porIne, llegan), [resultados, porIne, llegan])
  const hayInversion = Object.keys(inversiones).length > 0
  const repartoSinInvertir = useMemo(() => (hayInversion ? repartir(resultadosSinInversion, porIne, llegan) : reparto),
    [hayInversion, resultadosSinInversion, porIne, llegan, reparto])
  const porIneRes = useMemo(() => new Map(resultados.map((r) => [r.ine, r])), [resultados])
  const total = Object.values(inversiones).reduce((s, i) => ({ colegios: s.colegios + i.colegios, centros: s.centros + i.centros }), SIN_INVERSION)
  const sinDirigir = useMemo(() => cabenSinDirigir(resultados), [resultados])
  const capacidad = useMemo(() => resultados.reduce((s, r) => s + hueco(r), 0), [resultados])
  const sumaMezcla = ORDEN_REPARTO.reduce((s, p) => s + mezcla[p], 0)
  const sinSitio = ORDEN_REPARTO.reduce((s, p) => s + reparto.sinSitio[p], 0)
  const filas = todos ? reparto.pueblos : reparto.pueblos.slice(0, MAX_FILAS)

  return (
    <div className="mudanza">
    <section className="val-cabeza">
      <h1>¿Y si repartimos a los que llegan?</h1>
      <p>
        Según el modelo, hasta {escenario.anio} llegan {miles(escenario.personas)} personas a los 155 pueblos. Aquí las repartimos
        según quiénes son, como si se pudiera elegir a dónde va cada uno: cada grupo va a los pueblos que mejor le encajan en
        «Dónde vivir», cada pueblo recibe hasta llenarse y el resto pasa al siguiente.
      </p>
    </section>
    <section className="val-tarjeta simulador">

      <h2>¿Quiénes llegan? (en %)</h2>
      <div className="sim-entradas">
        {ORDEN_REPARTO.map((p) => (
          <label key={p} className="control">
            <span className="etiqueta">{PERFILES[p].nombre} <b>{miles(llegan[p])}</b></span>
            <input type="number" min={0} max={100} step={5} inputMode="numeric" value={mezcla[p]}
              onChange={(e) => setMezcla({ ...mezcla, [p]: Math.min(100, Math.max(0, Number(e.target.value) || 0)) })} />
          </label>
        ))}
      </div>
      <p className="ayuda">
        {sumaMezcla === 100
          ? 'Es un supuesto: no hay un dato público de quién llega. Cámbialo para ver otros repartos.'
          : `Suman ${miles(sumaMezcla)} %: repartimos en esa proporción, como si sumaran 100 %.`}
      </p>

      <div className="sim-resumen">
        <div><b>{miles(reparto.colocados)}</b><span>caben repartiéndolos, en {miles(reparto.pueblos.length)} pueblos</span></div>
        <div className={sinSitio > 0 ? 'sim-falta' : ''}><b>{miles(sinSitio)}</b><span>se quedan sin sitio</span></div>
        <div><b>{miles(sinDirigir)}</b><span>caben si cada uno va donde le lleva la tendencia (el mapa)</span></div>
      </div>
      {sinSitio > 0 && (
        <p className="ayuda">
          Sin sitio: {ORDEN_REPARTO.filter((p) => reparto.sinSitio[p] > 0)
            .map((p) => `${miles(reparto.sinSitio[p])} de «${PERFILES[p].nombre}»`).join(', ')}.
          {' '}En los 155 caben {miles(capacidad)} personas en total.
        </p>
      )}

      {hayInversion && (
        <p className="sim-inversion">
          <b>Con tus inversiones</b> ({[total.colegios ? cuantos(total.colegios, 'colegio', 'colegios') : '', total.centros ? cuantos(total.centros, 'centro de salud', 'centros de salud') : '']
            .filter(Boolean).join(' y ')}, unos {millones(costeInversion(total))}) caben{' '}
          <b>{miles(reparto.colocados - repartoSinInvertir.colocados)} personas más</b> que sin invertir
          ({miles(repartoSinInvertir.colocados)} → {miles(reparto.colocados)}). Son las mismas inversiones del mapa.
        </p>
      )}

      <h2>Pueblo a pueblo</h2>
      <p className="ayuda">
        «Lo llena» es lo primero que se acaba en ese pueblo. Si son los colegios o el centro de salud, puedes invertir ahí
        (un colegio, unos {millones(COSTE_COLEGIO)}; un centro de salud, unos {millones(COSTE_CENTRO_SALUD)}) y ver cuántos más caben.
      </p>
      {reparto.pueblos.length > 0 && (
        <div className="tabla-scroll">
          <table className="sim-tabla">
            <thead>
              <tr>
                <th>Pueblo</th>
                {ORDEN_REPARTO.map((p) => <th key={p} className="num">{PERFILES[p].nombre}</th>)}
                <th className="num">Recibe</th>
                <th>Lo llena</th>
                <th>Invertir</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr key={f.ine}>
                  <td><button className="enlace" onClick={() => onVerEnMapa(f.ine)}>{porIne.get(f.ine)!.nombre}</button></td>
                  {ORDEN_REPARTO.map((p) => <td key={p} className="num">{f.porPerfil[p] ? miles(f.porPerfil[p]) : '—'}</td>)}
                  <td className="num"><b>{miles(f.total)}</b><span className="sim-de"> de {miles(hueco(porIneRes.get(f.ine)!))}</span></td>
                  <td>{f.lleno ? <LoLlena r={porIneRes.get(f.ine)!} /> : <span className="sim-de">queda sitio</span>}</td>
                  <td><BotonInvertir r={porIneRes.get(f.ine)!} lleno={f.lleno} inv={inversiones[f.ine] ?? SIN_INVERSION}
                    onInvertir={(inv) => onInvertir(f.ine, inv)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {reparto.pueblos.length > MAX_FILAS && (
        <button className="enlace" onClick={() => setTodos(!todos)}>
          {todos ? `Ver solo los ${MAX_FILAS} primeros` : `Ver los ${miles(reparto.pueblos.length)} pueblos`}
        </button>
      )}

      <p className="nota">
        Eligen primero las personas mayores, que tienen menos pueblos posibles (con el hospital a menos de {HOSPITAL_LEJOS_KM} km);
        después las familias (con colegio) y al final quien teletrabaja. Como en el resto del modelo, cada persona ocupa sitio en
        colegios, centro de salud y vivienda a la vez. Es una simulación: en la realidad cada uno elige dónde vive.
      </p>
    </section>
    </div>
  )
}

function LoLlena({ r }: { r: ResultadoMunicipio }) {
  return <span className="sim-llena"><Icono nombre={r.limitante} tamano={15} />{LIMITES[r.limitante].nombre}</span>
}

/** «+1 colegio» o «+1 centro de salud» si eso es lo que llena el pueblo; y lo ya invertido, con su botón para quitarlo. */
function BotonInvertir({ r, lleno, inv, onInvertir }: { r: ResultadoMunicipio; lleno: boolean; inv: Inversion; onInvertir: (inv: Inversion) => void }) {
  const puede = lleno && (r.limitante === 'colegios' || r.limitante === 'sanidad')
  return (
    <span className="sim-invertir">
      {inv.colegios > 0 && <button className="sim-hecho" onClick={() => onInvertir({ ...inv, colegios: inv.colegios - 1 })}
        title="Quitar un colegio">+{cuantos(inv.colegios, 'colegio', 'colegios')} ✕</button>}
      {inv.centros > 0 && <button className="sim-hecho" onClick={() => onInvertir({ ...inv, centros: inv.centros - 1 })}
        title="Quitar un centro de salud">+{cuantos(inv.centros, 'centro', 'centros')} ✕</button>}
      {puede && r.limitante === 'colegios' && <button className="sim-mas" onClick={() => onInvertir({ ...inv, colegios: inv.colegios + 1 })}>+1 colegio</button>}
      {puede && r.limitante === 'sanidad' && <button className="sim-mas" onClick={() => onInvertir({ ...inv, centros: inv.centros + 1 })}>+1 centro de salud</button>}
    </span>
  )
}
