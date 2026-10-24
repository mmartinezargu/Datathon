// Gráfica pequeña de la población 2005-2025 de un municipio (Padrón, INE),
// con la proyección hasta el año horizonte en línea discontinua.

import { miles } from '../formato'

interface Props {
  poblacion: Record<string, number> // año -> habitantes
  anioFin: number // año horizonte del escenario
  poblacionFin: number // habitantes previstos en el año horizonte
  color: string
}

const ANCHO = 320
const ALTO = 110
const MARGEN = { izq: 4, der: 46, arr: 14, aba: 20 }

export function Evolucion({ poblacion, anioFin, poblacionFin, color }: Props) {
  const anios = Object.keys(poblacion).map(Number).sort((a, b) => a - b)
  const valores = anios.map((a) => poblacion[String(a)])
  const minA = anios[0]
  const maxV = Math.max(...valores, poblacionFin)
  const minV = Math.min(...valores) * 0.92

  const x = (a: number) => MARGEN.izq + ((a - minA) / (anioFin - minA)) * (ANCHO - MARGEN.izq - MARGEN.der)
  const y = (v: number) => MARGEN.arr + (1 - (v - minV) / (maxV - minV)) * (ALTO - MARGEN.arr - MARGEN.aba)

  const linea = anios.map((a, i) => `${x(a)},${y(valores[i])}`).join(' ')
  const area = `${x(minA)},${ALTO - MARGEN.aba} ${linea} ${x(anios.at(-1)!)},${ALTO - MARGEN.aba}`
  const ultimo = anios.at(-1)!

  return (
    <svg className="evolucion" viewBox={`0 0 ${ANCHO} ${ALTO}`} role="img"
      aria-label={`Población de ${miles(valores[0])} en ${minA} a ${miles(valores.at(-1)!)} en ${ultimo}; prevista ${miles(poblacionFin)} en ${anioFin}`}>
      <polygon points={area} fill={color} opacity={0.18} />
      <polyline points={linea} fill="none" stroke="#15233B" strokeWidth={2} strokeLinejoin="round" />
      {/* Proyección del escenario */}
      <line x1={x(ultimo)} y1={y(valores.at(-1)!)} x2={x(anioFin)} y2={y(poblacionFin)}
        stroke={color} strokeWidth={2.5} strokeDasharray="4 3" />
      <circle cx={x(ultimo)} cy={y(valores.at(-1)!)} r={3} fill="#15233B" />
      <circle cx={x(anioFin)} cy={y(poblacionFin)} r={4} fill={color} stroke="#fff" strokeWidth={1.5} />
      <text x={x(anioFin) + 7} y={y(poblacionFin) + 4} className="evolucion-valor">{miles(poblacionFin)}</text>
      <text x={x(minA)} y={ALTO - 4} className="evolucion-eje">{minA}</text>
      <text x={x(ultimo)} y={ALTO - 4} className="evolucion-eje" textAnchor="middle">{ultimo}</text>
      <text x={x(anioFin)} y={ALTO - 4} className="evolucion-eje" textAnchor="middle">{anioFin}</text>
    </svg>
  )
}
