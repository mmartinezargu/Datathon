// El vaso de CABIDA: la idea del proyecto en un dibujo.
//   el vaso = la gente que cabe;   el agua = la gente que llega.
// Si llega más de la que cabe, el agua rebosa en rojo y cae fuera.
// Si sobra sitio, se ve el hueco libre arriba.
// El componente no hace cuentas del modelo: recibe las cifras ya calculadas por el motor.

import { useId } from 'react'
import { TIPOS } from '../colores'
import { miles } from '../formato'

interface Props {
  capacidad: number // personas que caben (el tamaño del vaso)
  dentro: number // personas que llegan y caben
  fuera: number // personas que llegan y no caben
  /** Texto bajo "sitio libre" cuando el sitio está en otro sitio (vista de los 155 juntos). */
  notaLibre?: string
  compacto?: boolean
}

// Geometría del vaso (unidades del dibujo)
const BORDE = 30 // altura del borde superior
const FONDO = 150 // altura del fondo
const ALTO = FONDO - BORDE

export function Vaso({ capacidad, dentro, fuera, notaLibre, compacto }: Props) {
  const idRecorte = `vaso-${useId().replace(/:/g, '')}`
  const llegan = dentro + fuera
  const libre = Math.max(0, capacidad - dentro)
  const lleno = capacidad > 0 ? Math.min(1, dentro / capacidad) : fuera > 0 ? 1 : 0
  const nivel = FONDO - lleno * ALTO
  const rebosa = fuera > 0
  const parteFuera = llegan > 0 ? fuera / llegan : 0 // de 0 a 1: cuánto de lo que llega no cabe
  const rojo = TIPOS.tension.color
  const azul = TIPOS.oportunidad.color

  const resumen = rebosa
    ? `Llegan ${miles(llegan)} personas y caben ${miles(dentro)}: ${miles(fuera)} se quedan sin sitio.`
    : `Llegan ${miles(llegan)} personas y caben ${miles(capacidad)}: sobra sitio para ${miles(libre)}.`

  return (
    <figure className={`vaso${compacto ? ' compacto' : ''}`}>
      <svg viewBox="-4 -2 168 177" role="img" aria-label={resumen}>
        <defs>
          <clipPath id={idRecorte}>
            <path d={`M33 ${BORDE} L42 ${FONDO - 2} Q43 ${FONDO + 3} 48 ${FONDO + 3} L112 ${FONDO + 3} Q117 ${FONDO + 3} 118 ${FONDO - 2} L127 ${BORDE} Z`} />
          </clipPath>
        </defs>

        {/* Lo que no cabe: dos chorros que caen por fuera y un charco en el suelo (detrás del vaso) */}
        {rebosa && (
          <g>
            <path d={`M28 ${BORDE + 1} C14 ${BORDE + 10} 9 ${BORDE + 60} ${11 - parteFuera * 3} 163`}
              fill="none" stroke={rojo} strokeWidth={4 + parteFuera * 4} strokeLinecap="round" />
            <path d={`M132 ${BORDE + 1} C146 ${BORDE + 10} 151 ${BORDE + 60} ${149 + parteFuera * 3} 163`}
              fill="none" stroke={rojo} strokeWidth={4 + parteFuera * 4} strokeLinecap="round" />
            <ellipse cx="80" cy="166" rx={44 + parteFuera * 34} ry={4 + parteFuera * 3} fill={rojo} />
          </g>
        )}

        {/* Agua dentro del vaso */}
        <g clipPath={`url(#${idRecorte})`}>
          <rect x="0" y="0" width="160" height="175" fill="#EEF4FA" />
          <rect className="vaso-agua" x="0" y={nivel} width="160" height={175 - nivel} fill={azul} opacity="0.88" />
          <path d={`M0 ${nivel} Q20 ${nivel - 4} 40 ${nivel} T80 ${nivel} T120 ${nivel} T160 ${nivel} V${nivel + 5} H0 Z`} fill="#FFFFFF" opacity="0.28" />
        </g>

        {/* Lo que rebosa por encima del borde */}
        {rebosa && <path d={`M26 ${BORDE + 1} Q80 ${BORDE - 14 - parteFuera * 22} 134 ${BORDE + 1} Z`} fill={rojo} />}

        {/* El vaso (por delante del agua) */}
        <path d={`M30 ${BORDE} L40 ${FONDO} Q41 ${FONDO + 6} 48 ${FONDO + 6} L112 ${FONDO + 6} Q119 ${FONDO + 6} 120 ${FONDO} L130 ${BORDE}`}
          fill="none" stroke="#15233B" strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round" />
        <line x1="25" y1={BORDE} x2="135" y2={BORDE} stroke="#15233B" strokeWidth="3.5" strokeLinecap="round" />
      </svg>

      <figcaption>
        <div className="vaso-fila"><i style={{ background: azul }} /><span>Llegan</span><b>{miles(llegan)}</b></div>
        <div className="vaso-fila"><i className="vaso-borde" /><span>Caben</span><b>{miles(rebosa ? dentro : capacidad)}</b></div>
        {rebosa ? (
          <div className="vaso-fila destacado" style={{ color: rojo }}><i style={{ background: rojo }} /><span>Sin sitio</span><b>{miles(fuera)}</b></div>
        ) : (
          <div className="vaso-fila destacado" style={{ color: azul }}><i className="vaso-hueco" /><span>Sitio libre</span><b>{miles(libre)}</b></div>
        )}
        {rebosa && libre > 0 && notaLibre && (
          <div className="vaso-nota">Y queda sitio para {miles(libre)} más, {notaLibre}</div>
        )}
      </figcaption>
    </figure>
  )
}
