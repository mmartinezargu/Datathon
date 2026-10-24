// Las palancas del escenario: lo que el gestor mueve para ver qué pasa.

import { ANIO_BASE, RITMO_ANUAL } from '../motor'
import type { Escenario } from '../tipos'
import { miles } from '../formato'

interface Props {
  escenario: Escenario
  onCambiar: (e: Escenario) => void
}

const ANIOS = [2030, 2035, 2039]

export function Palancas({ escenario, onCambiar }: Props) {
  const anios = escenario.anio - ANIO_BASE
  const maximo = Math.round(RITMO_ANUAL * anios * 2.5) // hasta 2,5 veces el ritmo actual

  function cambiarAnio(anio: number) {
    // Al cambiar el año se mantiene el ritmo anual elegido
    const ritmo = escenario.personas / anios
    onCambiar({ anio, personas: Math.round(ritmo * (anio - ANIO_BASE)) })
  }

  return (
    <div className="palancas">
      <div className="control">
        <div className="etiqueta">
          <span>Año horizonte</span>
          <div className="segmentos" role="radiogroup" aria-label="Año horizonte">
            {ANIOS.map((a) => (
              <button key={a} role="radio" aria-checked={a === escenario.anio}
                className={a === escenario.anio ? 'activo' : ''} onClick={() => cambiarAnio(a)}>
                {a}
              </button>
            ))}
          </div>
        </div>
      </div>
      <label className="control">
        <div className="etiqueta">
          <span>Personas que absorben los 155 municipios</span>
          <b>{miles(escenario.personas)}</b>
        </div>
        <input type="range" min={0} max={maximo} step={1000} value={escenario.personas}
          onChange={(e) => onCambiar({ ...escenario, personas: Number(e.target.value) })} />
        <div className="pista">
          Ritmo de la última década: {miles(RITMO_ANUAL * anios)} hasta {escenario.anio}
        </div>
      </label>
    </div>
  )
}
