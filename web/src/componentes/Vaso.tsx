// El vaso de CABIDA: la idea del proyecto en un dibujo.
//   - el vaso (azul, abajo) = la gente que llega y cabe;
//   - lo que sobresale por encima del borde (rojo) = la gente que llega y no cabe;
//   - si sobra sitio, el vaso queda medio vacío y se ve el hueco libre.
// Las alturas son proporcionales: un vaso pequeño con una torre roja encima = no cabe casi nadie.
// El componente no hace cuentas del modelo: recibe las cifras ya calculadas por el motor.

import type { ReactNode } from 'react'
import { TIPOS } from '../colores'
import { miles } from '../formato'

interface Props {
  capacidad: number // personas que caben en total
  dentro: number // personas que llegan y caben
  fuera: number // personas que llegan y no caben
  /** Texto final de la nota cuando sobra sitio en otros municipios (vista de los 155 juntos). */
  notaLibre?: string
  compacto?: boolean
  /** Explicación del desplegable «¿De dónde sale esto?». Si no se da, no hay desplegable. */
  origen?: ReactNode
  /** true = la cuenta incluye colegios o centros de salud nuevos: ya no es «sin ampliar servicios». */
  ampliado?: boolean
}

// Medidas del dibujo (unidades del SVG)
const ANCHO_VASO = 92
const X_VASO = 8
const SUELO = 214 // línea del fondo del vaso
const ALTO_TOTAL = 186 // altura de la columna más alta (lo que llega, o el vaso si sobra sitio)
const MINIMO = 10 // para que un trozo muy pequeño siga viéndose

export function Vaso({ capacidad, dentro, fuera, notaLibre, compacto, origen, ampliado }: Props) {
  const llegan = dentro + fuera
  const rebosa = fuera > 0
  // Si rebosa, el vaso útil es lo que ya está lleno; el sitio libre de otros municipios va en la nota
  const tamanoVaso = rebosa ? dentro : capacidad
  const libre = Math.max(0, capacidad - dentro)
  const escala = ALTO_TOTAL / Math.max(llegan, tamanoVaso, 1)

  const altoVaso = Math.max(MINIMO, tamanoVaso * escala)
  const altoAgua = rebosa ? altoVaso : Math.max(llegan > 0 ? 4 : 0, dentro * escala)
  const altoRojo = rebosa ? Math.max(MINIMO, fuera * escala) : 0
  const borde = SUELO - altoVaso // altura del borde del vaso
  const techo = borde - altoRojo // altura de lo más alto que llega
  const rojo = TIPOS.tension.color
  const azul = TIPOS.oportunidad.color
  const xEtiqueta = X_VASO + ANCHO_VASO + 16

  const etiquetas: EtiquetaVaso[] = [
    { y: rebosa ? techo : Math.max(SUELO - altoAgua, borde + 46), titulo: 'Llegan', valor: miles(llegan), color: '#15233B' },
    ...(rebosa ? [{ y: borde - altoRojo / 2, titulo: 'No caben', valor: miles(fuera), color: rojo, fuerte: true, medio: true }] : []),
    { y: rebosa ? borde + altoVaso / 2 : borde, titulo: ampliado ? (rebosa ? 'Caben' : 'Caben en total') : 'Caben sin ampliar',
      valor: miles(rebosa ? dentro : capacidad), color: azul, medio: rebosa },
  ]

  const sinAmpliar = ampliado ? '' : ' sin ampliar servicios'
  const resumen = rebosa
    ? `Llegan ${miles(llegan)} personas: caben ${miles(dentro)}${sinAmpliar} y ${miles(fuera)} se quedan sin sitio.`
    : `Llegan ${miles(llegan)} personas y caben todas${sinAmpliar}: sobra sitio para ${miles(libre)} más.`

  return (
    <figure className={`vaso${compacto ? ' compacto' : ''}`}>
      <svg viewBox="0 0 300 236" role="img" aria-label={resumen}>
        {/* Lo que no cabe: sobresale por encima del borde del vaso */}
        {rebosa && (
          <g fill={rojo}>
            <rect x={X_VASO} y={techo} width={ANCHO_VASO} height={altoRojo + 2} rx="6" />
            <text x={X_VASO + ANCHO_VASO / 2} y={techo + Math.min(altoRojo / 2 + 5, altoRojo - 6)} className="vaso-dentro-texto"
              textAnchor="middle" fill="#fff" visibility={altoRojo > 34 ? 'visible' : 'hidden'}>no caben</text>
          </g>
        )}

        {/* El vaso: fondo claro, agua azul y el contorno */}
        <rect x={X_VASO} y={borde} width={ANCHO_VASO} height={altoVaso} fill="#EEF4FA" />
        <rect className="vaso-agua" x={X_VASO} y={SUELO - altoAgua} width={ANCHO_VASO} height={altoAgua} fill={azul} />
        {!rebosa && libre > 0 && (
          <text x={X_VASO + ANCHO_VASO / 2} y={borde + Math.min(22, (altoVaso - altoAgua) / 2 + 5)} className="vaso-dentro-texto"
            textAnchor="middle" fill={azul} visibility={altoVaso - altoAgua > 30 ? 'visible' : 'hidden'}>sitio libre</text>
        )}
        <path d={`M${X_VASO} ${borde} V${SUELO} H${X_VASO + ANCHO_VASO} V${borde}`} fill="none" stroke="#15233B"
          strokeWidth="4" strokeLinejoin="round" />
        <line x1={X_VASO - 8} y1={borde} x2={X_VASO + ANCHO_VASO + 8} y2={borde} stroke="#15233B" strokeWidth="4" strokeLinecap="round" />

        {/* Etiquetas a la derecha, cada una a la altura de lo que señala (sin pisarse) */}
        {colocar(etiquetas).map(({ yTexto, ...e }) => <Etiqueta key={e.titulo} x={xEtiqueta} yTexto={yTexto} {...e} />)}
        <line x1={X_VASO - 8} y1={SUELO + 2} x2={X_VASO + ANCHO_VASO + 8} y2={SUELO + 2} stroke="#15233B" strokeWidth="2" opacity="0.25" />
      </svg>

      <figcaption>
        <p className="vaso-frase">{frase(llegan, dentro, fuera, libre, sinAmpliar)}</p>
        {rebosa && libre > 0 && notaLibre && (
          <p className="vaso-nota">Queda sitio para {miles(libre)} personas más, {notaLibre}</p>
        )}
        {origen && (
          <details className="vaso-origen">
            <summary><span aria-hidden="true">?</span>¿De dónde sale esto?</summary>
            <div className="vaso-origen-cuerpo">{origen}</div>
          </details>
        )}
      </figcaption>
    </figure>
  )
}

interface EtiquetaVaso {
  y: number // altura que señala la rayita
  titulo: string
  valor: string
  color: string
  fuerte?: boolean
  medio?: boolean // centrada en esa altura
}

const HUECO_ETIQUETAS = 44 // alto de una etiqueta (título y cifra) más un poco de aire

/**
 * Dónde va el texto de cada etiqueta: a la altura de lo que señala, pero sin pisarse
 * (si dos quedan muy cerca, se separan) y sin salirse por arriba ni pegarse al suelo.
 */
function colocar(etiquetas: EtiquetaVaso[]): (EtiquetaVaso & { yTexto: number })[] {
  const lista = etiquetas.map((e) => ({ ...e, yTexto: e.y + (e.medio ? 0 : 6) })).sort((a, b) => a.yTexto - b.yTexto)
  // De arriba abajo: cada una, al menos un hueco por debajo de la anterior
  lista.forEach((e, i) => { if (i > 0) e.yTexto = Math.max(e.yTexto, lista[i - 1].yTexto + HUECO_ETIQUETAS) })
  // Si la última se pasa del suelo, se suben todas lo que haga falta, de abajo arriba
  for (let i = lista.length - 1; i >= 0; i--) {
    const tope = i === lista.length - 1 ? SUELO - 20 : lista[i + 1].yTexto - HUECO_ETIQUETAS
    lista[i].yTexto = Math.min(lista[i].yTexto, tope)
  }
  // Y que la de arriba no se salga (el dibujo tiene sitio para las tres)
  lista.forEach((e, i) => { e.yTexto = Math.max(e.yTexto, i === 0 ? 20 : lista[i - 1].yTexto + HUECO_ETIQUETAS) })
  return lista
}

/** Etiqueta con una rayita que apunta a su altura y el texto donde haya sitio. */
function Etiqueta({ x, y, yTexto, titulo, valor, color, fuerte }: EtiquetaVaso & { x: number; yTexto: number }) {
  return (
    <g>
      <line x1={x - 12} y1={y} x2={x - 3} y2={y} stroke={color} strokeWidth="2" />
      <text x={x} y={yTexto - 6} className="vaso-etiqueta" fill={color}>{titulo}</text>
      <text x={x} y={yTexto + 16} className={`vaso-valor${fuerte ? ' fuerte' : ''}`} fill={color}>{valor}</text>
    </g>
  )
}

/** La idea en una frase: de cada 10 personas que llegan, cuántas caben. */
function frase(llegan: number, dentro: number, fuera: number, libre: number, sinAmpliar: string): string {
  if (llegan <= 0) return 'No le llega gente nueva en este escenario.'
  if (fuera <= 0) return `Caben todas las que llegan${sinAmpliar} y sobra sitio para ${miles(libre)} más.`
  const deDiez = Math.round((dentro / llegan) * 10)
  if (deDiez === 0) return `De cada 10 personas que llegan, no cabe ni una${sinAmpliar}.`
  if (deDiez === 10) return `Caben casi todas${sinAmpliar}: solo ${miles(fuera)} se quedan sin sitio.`
  return `De cada 10 personas que llegan, ${deDiez === 1 ? 'cabe 1' : `caben ${deDiez}`}${sinAmpliar}.`
}
