// Simulador «¿Y si llegan más?», al final de «Dónde vivir»: el usuario dice cuántas personas llegan de
// cada tipo y se reparten entre los pueblos con sitio (reparto.ts). Se recalcula al escribir.

import { useMemo, useState } from 'react'
import { PERFILES } from '../mudanza'
import { LLEGADAS_EJEMPLO, ORDEN_REPARTO, hueco, repartir } from '../reparto'
import type { Municipio, Perfil, ResultadoMunicipio } from '../tipos'
import { miles } from '../formato'
import { HOSPITAL_LEJOS_KM } from '../motor'

const MAX_FILAS = 10

interface Props {
  resultados: ResultadoMunicipio[]
  porIne: Map<string, Municipio>
  anio: number
  onVerEnMapa: (ine: string) => void
}

export function Simulador({ resultados, porIne, anio, onVerEnMapa }: Props) {
  const [llegan, setLlegan] = useState<Record<Perfil, number>>(LLEGADAS_EJEMPLO)
  const [todos, setTodos] = useState(false)
  const reparto = useMemo(() => repartir(resultados, porIne, llegan), [resultados, porIne, llegan])
  const huecoTotal = useMemo(() => resultados.reduce((s, r) => s + hueco(r), 0), [resultados])
  const total = ORDEN_REPARTO.reduce((s, p) => s + llegan[p], 0)
  const sinSitio = ORDEN_REPARTO.reduce((s, p) => s + reparto.sinSitio[p], 0)
  const filas = todos ? reparto.pueblos : reparto.pueblos.slice(0, MAX_FILAS)

  return (
    <section className="val-tarjeta simulador">
      <h2>¿Y si llegan más? Simula el reparto</h2>
      <p className="ayuda">
        Escribe cuántas personas más llegan de cada tipo. Las repartimos entre los pueblos que aún tienen sitio en {anio},
        además de la gente que ya les llega según el modelo: cada pueblo recibe hasta llenarse y el resto pasa al siguiente
        de su lista de «Dónde vivir».
      </p>

      <div className="sim-entradas">
        {ORDEN_REPARTO.map((p) => (
          <label key={p} className="control">
            <span className="etiqueta">{PERFILES[p].nombre}</span>
            <input type="number" min={0} step={500} inputMode="numeric" value={llegan[p]}
              onChange={(e) => setLlegan({ ...llegan, [p]: Math.max(0, Number(e.target.value) || 0) })} />
          </label>
        ))}
      </div>

      <div className="sim-resumen">
        <div><b>{miles(reparto.colocados)}</b><span>caben, en {miles(reparto.pueblos.length)} pueblos</span></div>
        <div className={sinSitio > 0 ? 'sim-falta' : ''}><b>{miles(sinSitio)}</b><span>se quedan sin sitio</span></div>
        <div><b>{miles(huecoTotal)}</b><span>es todo el sitio libre que queda en los 155</span></div>
      </div>
      {sinSitio > 0 && (
        <p className="ayuda">
          Sin sitio: {ORDEN_REPARTO.filter((p) => reparto.sinSitio[p] > 0)
            .map((p) => `${miles(reparto.sinSitio[p])} de «${PERFILES[p].nombre}»`).join(', ')}.
        </p>
      )}

      {total > 0 && reparto.pueblos.length > 0 && (
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
        Eligen primero las personas mayores, que tienen menos pueblos posibles (con el hospital a menos de {HOSPITAL_LEJOS_KM} km); después
        las familias (con colegio) y al final quien teletrabaja. Como en el resto del modelo, cada persona ocupa sitio en
        colegios, centro de salud y vivienda a la vez. Es una simulación: supone que se puede dirigir a dónde va cada uno.
      </p>
    </section>
  )
}
