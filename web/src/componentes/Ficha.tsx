// Ficha de un municipio: qué le llega, qué le cabe, qué le limita y de dónde sale cada número.

import { ANIO_BASE, umbralesDe } from '../motor'
import { LIMITES, TIPOS } from '../colores'
import type { Escenario, Limite, Municipio, ResultadoMunicipio, Umbrales } from '../tipos'
import { miles, pct } from '../formato'
import { Evolucion } from './Evolucion'

interface Props {
  r: ResultadoMunicipio
  m: Municipio
  escenario: Escenario
  umbrales: Umbrales
  onCerrar: () => void
}

const ORDEN: Limite[] = ['vivienda', 'colegios', 'sanidad', 'ritmo']

export function Ficha({ r, m, escenario, umbrales, onCerrar }: Props) {
  const tipo = TIPOS[r.tipo]
  // Escala de las barras: el mayor de los límites o de lo que llega
  const valores = ORDEN.map((l) => r.limites[l]).filter((v): v is number => v !== null)
  const escala = Math.max(r.llegan, ...valores, 1)

  return (
    <section className="ficha" style={{ borderTopColor: tipo.color }}>
      <div className="ficha-cabeza">
        <div>
          <span className="chip" style={{ background: tipo.color }}>{tipo.nombre}</span>
          <h2>{m.nombre}</h2>
          <div className="ayuda">{m.zona}; {miles(r.poblacion)} vecinos</div>
        </div>
        <button className="cerrar" onClick={onCerrar} aria-label="Cerrar la ficha y volver a la lista">✕</button>
      </div>

      <div className="ficha-cifras">
        <div><b>{miles(r.llegan)}</b><span>llegarían hasta {escenario.anio}</span></div>
        <div><b style={{ color: tipo.color }}>{miles(r.caben)}</b><span>caben (límite: {LIMITES[r.limitante].nombre.toLowerCase()})</span></div>
      </div>

      <p className="ficha-frase">{frase(r, m, escenario.anio)}</p>

      <h3>Personas que caben según cada recurso</h3>
      <div className="limites">
        {ORDEN.map((l) => {
          const v = r.limites[l]
          const manda = l === r.limitante
          return (
            <div key={l} className={`limite${manda ? ' manda' : ''}`}>
              <span className="l-nombre">{LIMITES[l].nombre}</span>
              <span className="l-pista">
                {v !== null && <span className="l-barra" style={{ width: `${(v / escala) * 100}%`, background: manda ? tipo.color : undefined }} />}
                <span className="l-llegan" style={{ left: `${(r.llegan / escala) * 100}%` }} title={`Llegan ${miles(r.llegan)}`} />
              </span>
              <span className="l-valor">{v === null ? 'no aplica' : miles(v)}</span>
            </div>
          )
        })}
        <div className="l-leyenda"><i /> lo que llega ({miles(r.llegan)})</div>
      </div>

      <div className="cuenta">
        <b>De dónde sale:</b> {explicacion(r, m, escenario, umbrales)}
      </div>

      <h3>Población 2005–{escenario.anio}</h3>
      <Evolucion poblacion={m.poblacion} anioFin={escenario.anio} poblacionFin={r.poblacion + r.llegan} color={tipo.color} />
    </section>
  )
}

function frase(r: ResultadoMunicipio, m: Municipio, anio: number): string {
  const l = LIMITES[r.limitante].frase
  switch (r.tipo) {
    case 'tension':
      return `Si sigue la tendencia, ${m.nombre} recibiría unas ${miles(r.llegan)} personas hasta ${anio}, pero solo caben unas ${miles(r.caben)}: ${l}.`
    case 'polo':
      return `Recibiría unas ${miles(r.llegan)} personas hasta ${anio} y caben ${miles(r.caben)}: puede crecer sin desbordarse.`
    case 'oportunidad':
      return `Caben unas ${miles(r.caben)} personas, pero solo llegarían ${miles(r.llegan)}. Tiene sitio para acoger a más gente.`
    default:
      return `Llegarían unas ${miles(r.llegan)} personas y caben ${miles(r.caben)}. Crece poco y tiene poco margen.`
  }
}

function explicacion(r: ResultadoMunicipio, m: Municipio, esc: Escenario, u: Umbrales): string {
  const c = m.capacidad!
  const p = r.poblacion
  const umb = umbralesDe(m, u)
  switch (r.limitante) {
    case 'colegios': {
      // El nivel que manda es el de menos sitio
      const niveles = [
        { n: c.colegios_primaria, umbral: umb.primaria, nombre: 'primaria' },
        { n: c.colegios_secundaria, umbral: umb.secundaria, nombre: 'secundaria' },
      ].filter((x) => x.n > 0).sort((a, b) => (a.n * a.umbral - p) - (b.n * b.umbral - p))
      const x = niveles[0]
      return `${x.n} ${x.n === 1 ? 'centro' : 'centros'} de ${x.nombre} para ${miles(p)} vecinos: ${miles(p / x.n)} por centro. ` +
        `Los municipios de su tamaño llegan hasta ${miles(x.umbral)}. (${miles(x.umbral)} × ${x.n}) − ${miles(p)} = ${miles(Math.max(0, x.n * x.umbral - p))} personas.`
    }
    case 'sanidad': {
      const libre = Math.max(0, umb.zona - c.zbs_poblacion)
      return `Su zona básica de salud (${c.zbs_nombre}) atiende a ${miles(c.zbs_poblacion)} personas y las zonas de su tamaño llegan hasta ${miles(umb.zona)}. ` +
        (libre === 0 ? 'La zona ya está por encima: no queda sitio.' : `Quedan ${miles(libre)} plazas en la zona; a ${m.nombre} le toca la parte de sus vecinos: ${miles(r.caben)}.`)
    }
    case 'vivienda':
      return `${miles(c.viv_no_principales)} viviendas vacías o secundarias × ${pct(esc.pctVivienda, 0)} + ${miles(c.viv_previstas)} viviendas previstas × ${pct(esc.pctSuelo, 0)}, ` +
        `por ${c.personas_hogar.toFixed(2).replace('.', ',')} personas por hogar = ${miles(r.caben)} personas.`
    default:
      return `Aunque tenga sitio, no conviene crecer más de un ${pct(esc.ritmoMax, 1)} al año: ${miles(p)} × ((1 + ${pct(esc.ritmoMax, 1)})^${esc.anio - ANIO_BASE} − 1) = ${miles(r.caben)} personas.`
  }
}
