// Simulador de reparto, al final de «Dónde vivir»: coge la gente que el modelo prevé que llega, la divide
// por perfiles (familias, personas mayores, teletrabajo) y la reparte entre los pueblos según quiénes son
// (reparto.ts), como si se pudiera dirigir a dónde va cada uno. Se recalcula al escribir.

import { useMemo, useState } from 'react'
import { PERFILES } from '../mudanza'
import { MEZCLA_SUPUESTA, ORDEN_REPARTO, cabenSinDirigir, hueco, llegadasPorPerfil, repartir } from '../reparto'
import type { Escenario, Municipio, Perfil, ResultadoMunicipio } from '../tipos'
import { miles } from '../formato'
import { HOSPITAL_LEJOS_KM } from '../motor'

const MAX_FILAS = 10

interface Props {
  resultados: ResultadoMunicipio[]
  porIne: Map<string, Municipio>
  escenario: Escenario
  onVerEnMapa: (ine: string) => void
}

export function Simulador({ resultados, porIne, escenario, onVerEnMapa }: Props) {
  const [mezcla, setMezcla] = useState<Record<Perfil, number>>(MEZCLA_SUPUESTA)
  const [todos, setTodos] = useState(false)
  const llegan = useMemo(() => llegadasPorPerfil(escenario.personas, mezcla), [escenario.personas, mezcla])
  const reparto = useMemo(() => repartir(resultados, porIne, llegan), [resultados, porIne, llegan])
  const sinDirigir = useMemo(() => cabenSinDirigir(resultados), [resultados])
  const capacidad = useMemo(() => resultados.reduce((s, r) => s + hueco(r), 0), [resultados])
  const sumaMezcla = ORDEN_REPARTO.reduce((s, p) => s + mezcla[p], 0)
  const sinSitio = ORDEN_REPARTO.reduce((s, p) => s + reparto.sinSitio[p], 0)
  const filas = todos ? reparto.pueblos : reparto.pueblos.slice(0, MAX_FILAS)

  return (
    <section className="val-tarjeta simulador">
      <h2>¿Y si repartimos a los que llegan? Simula el reparto</h2>
      <p className="ayuda">
        Según el modelo, hasta {escenario.anio} llegan {miles(escenario.personas)} personas a los 155 pueblos. Aquí las repartimos
        según quiénes son, como si se pudiera elegir a dónde va cada uno: cada grupo va a los pueblos que mejor le encajan en
        «Dónde vivir», cada pueblo recibe hasta llenarse y el resto pasa al siguiente.
      </p>

      <h3 className="sim-pregunta">¿Quiénes llegan? (en %)</h3>
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

      {reparto.pueblos.length > 0 && (
        <div className="tabla-scroll">
          <table className="sim-tabla">
            <thead>
              <tr>
                <th>Pueblo</th>
                {ORDEN_REPARTO.map((p) => <th key={p} className="num">{PERFILES[p].nombre}</th>)}
                <th className="num">Total</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr key={f.ine}>
                  <td><button className="enlace" onClick={() => onVerEnMapa(f.ine)}>{porIne.get(f.ine)!.nombre}</button></td>
                  {ORDEN_REPARTO.map((p) => <td key={p} className="num">{f.porPerfil[p] ? miles(f.porPerfil[p]) : '—'}</td>)}
                  <td className="num"><b>{miles(f.total)}</b></td>
                  <td>{f.lleno && <span className="sim-lleno">Lleno</span>}</td>
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
  )
}
