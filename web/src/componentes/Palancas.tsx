// Las palancas del escenario: lo que el gestor mueve para ver qué pasa.
// Arriba, el escenario (año y personas). Debajo, los supuestos discutibles:
// en vez de esconderlos, se convierten en controles.

import { useState } from 'react'
import { ANIO_BASE, RITMO_ANUAL } from '../motor'
import type { Escenario } from '../tipos'
import { miles, pct } from '../formato'

interface Props {
  escenario: Escenario
  onCambiar: (e: Escenario) => void
}

const ANIOS = [2030, 2035, 2039]
const EXIGENCIAS = [
  { valor: 0.75, texto: 'Estricta', ayuda: 'Un colegio se considera lleno cuando tiene tantos niños como el 25 % más cargado de los de su tamaño, y un centro de salud cuando atiende a tanta gente como el 25 % de las zonas más pobladas.' },
  { valor: 0.9, texto: 'Media', ayuda: 'Lleno cuando tiene tanta carga como el 10 % más cargado (colegios de su tamaño; zonas de salud de toda la Comunidad).' },
  { valor: 0.97, texto: 'Flexible', ayuda: 'Se aceptan cargas como las de los más saturados.' },
]

export function Palancas({ escenario, onCambiar }: Props) {
  const [abierto, setAbierto] = useState(false)
  const anios = escenario.anio - ANIO_BASE
  const maximo = Math.round(RITMO_ANUAL * anios * 2.5) // hasta 2,5 veces el ritmo actual
  const cambiar = (parcial: Partial<Escenario>) => onCambiar({ ...escenario, ...parcial })
  const exigencia = EXIGENCIAS.find((e) => e.valor === escenario.exigencia) ?? EXIGENCIAS[1]

  function cambiarAnio(anio: number) {
    // Al cambiar el año se mantiene el ritmo anual elegido
    const ritmo = escenario.personas / anios
    cambiar({ anio, personas: Math.round(ritmo * (anio - ANIO_BASE)) })
  }

  return (
    <div className="palancas">
      <div className="control">
        <div className="etiqueta">
          <span>Año horizonte</span>
          <Segmentos opciones={ANIOS.map((a) => ({ valor: a, texto: String(a) }))} valor={escenario.anio} onCambiar={cambiarAnio} nombre="Año horizonte" />
        </div>
      </div>
      <Deslizador etiqueta="Personas que absorben los 155 municipios" valor={escenario.personas}
        texto={miles(escenario.personas)} min={0} max={maximo} paso={1000}
        pista={`Ritmo de la última década: ${miles(RITMO_ANUAL * anios)} hasta ${escenario.anio}`}
        onCambiar={(v) => cambiar({ personas: v })} />
      <label className="control interruptor">
        <input type="checkbox" role="switch" checked={escenario.reequilibrio} onChange={(e) => cambiar({ reequilibrio: e.target.checked })} />
        <span className="interruptor-texto">
          <b>Reubicar en pueblos cercanos con sitio</b>
          <span className="pista">
            Quien no cabe en su municipio va al pueblo con sitio más cercano, a menos de {escenario.radioKm} km y con hospital cerca.
            Si no hay ninguno, se queda sin sitio. Los colores del mapa no cambian.
          </span>
        </span>
      </label>
      {escenario.reequilibrio && (
        <Deslizador etiqueta="Distancia máxima" valor={escenario.radioKm} texto={`${escenario.radioKm} km`}
          min={10} max={50} paso={5} pista="En línea recta entre los centros de los pueblos."
          onCambiar={(v) => cambiar({ radioKm: v })} />
      )}

      <button className="desplegar" aria-expanded={abierto} onClick={() => setAbierto(!abierto)}>
        <span>Supuestos del cálculo</span>
        <span className="flecha" aria-hidden="true">{abierto ? '−' : '+'}</span>
      </button>
      {abierto && (
        <div className="supuestos">
          <div className="control">
            <div className="etiqueta">
              <span>Hasta dónde se cargan colegios y centros de salud</span>
            </div>
            <Segmentos opciones={EXIGENCIAS.map((e) => ({ valor: e.valor, texto: e.texto }))} valor={exigencia.valor}
              onCambiar={(v) => cambiar({ exigencia: v })} nombre="Exigencia con los servicios" ancho />
            <div className="pista">{exigencia.ayuda}</div>
          </div>
          <Deslizador etiqueta="Suelo previsto que llega a construirse" valor={escenario.pctSuelo} texto={pct(escenario.pctSuelo, 0)}
            min={0} max={1} paso={0.05} pista="Del suelo urbanizable que el planeamiento deja pendiente."
            onCambiar={(v) => cambiar({ pctSuelo: v })} />
          <Deslizador etiqueta="Vivienda vacía o secundaria que se ocupa" valor={escenario.pctVivienda} texto={pct(escenario.pctVivienda, 0)}
            min={0} max={0.5} paso={0.05} pista="Viviendas no principales del Censo 2021."
            onCambiar={(v) => cambiar({ pctVivienda: v })} />
          <Deslizador etiqueta="Crecimiento máximo al año" valor={escenario.ritmoMax} texto={pct(escenario.ritmoMax, 1)}
            min={0.01} max={0.06} paso={0.005} pista="Más rápido que esto, un municipio no absorbe gente sin colapsar."
            onCambiar={(v) => cambiar({ ritmoMax: v })} />
        </div>
      )}
    </div>
  )
}

function Deslizador({ etiqueta, valor, texto, min, max, paso, pista, onCambiar }: {
  etiqueta: string; valor: number; texto: string; min: number; max: number; paso: number; pista: string
  onCambiar: (v: number) => void
}) {
  return (
    <label className="control">
      <div className="etiqueta"><span>{etiqueta}</span><b>{texto}</b></div>
      <input type="range" min={min} max={max} step={paso} value={valor} onChange={(e) => onCambiar(Number(e.target.value))} />
      <div className="pista">{pista}</div>
    </label>
  )
}

function Segmentos({ opciones, valor, onCambiar, nombre, ancho }: {
  opciones: { valor: number; texto: string }[]; valor: number; onCambiar: (v: number) => void; nombre: string; ancho?: boolean
}) {
  return (
    <div className={`segmentos${ancho ? ' ancho' : ''}`} role="radiogroup" aria-label={nombre}>
      {opciones.map((o) => (
        <button key={o.valor} role="radio" aria-checked={o.valor === valor}
          className={o.valor === valor ? 'activo' : ''} onClick={() => onCambiar(o.valor)}>
          {o.texto}
        </button>
      ))}
    </div>
  )
}
