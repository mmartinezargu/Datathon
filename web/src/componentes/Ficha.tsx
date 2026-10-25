// Ficha de un municipio: qué le llega, qué le cabe, qué le limita y de dónde sale cada número.

import { ANIO_BASE, COSTE_CENTRO_SALUD, COSTE_COLEGIO, costeInversion, nivelesColegio, umbralesDe } from '../motor'
import { LIMITES, TIPOS } from '../colores'
import type { Escenario, Inversion, Limite, Municipio, ResultadoMunicipio, Umbrales } from '../tipos'
import { miles, millones, pct } from '../formato'
import { Evolucion } from './Evolucion'

interface Props {
  r: ResultadoMunicipio
  antes: ResultadoMunicipio // el mismo municipio sin las inversiones simuladas
  m: Municipio
  escenario: Escenario
  umbrales: Umbrales
  inversion: Inversion
  onInvertir: (inv: Inversion) => void
  onCerrar: () => void
}

const ORDEN: Limite[] = ['vivienda', 'colegios', 'sanidad', 'ritmo']

export function Ficha({ r, antes, m, escenario, umbrales, inversion, onInvertir, onCerrar }: Props) {
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
        <b>De dónde sale:</b> {explicacion(r, m, escenario, umbrales, inversion)}
      </div>

      <Invertir r={r} antes={antes} m={m} umbrales={umbrales} inversion={inversion} onInvertir={onInvertir} />

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

function explicacion(r: ResultadoMunicipio, m: Municipio, esc: Escenario, u: Umbrales, inv: Inversion): string {
  const c = m.capacidad!
  const p = r.poblacion
  const umb = umbralesDe(m, u)
  switch (r.limitante) {
    case 'colegios': {
      // El nivel que manda es el de menos sitio
      const niveles = nivelesColegio(m, u, inv.colegios).sort((a, b) => (a.n * a.umbral - p) - (b.n * b.umbral - p))
      const x = niveles[0]
      const nuevos = inv.colegios ? ` (con ${inv.colegios === 1 ? 'el nuevo' : `los ${inv.colegios} nuevos`})` : ''
      return `${x.n} ${x.n === 1 ? 'centro' : 'centros'} de ${x.nombre}${nuevos} para ${miles(p)} vecinos: ${miles(p / x.n)} por centro. ` +
        `Los municipios de su tamaño llegan hasta ${miles(x.umbral)}. (${miles(x.umbral)} × ${x.n}) − ${miles(p)} = ${miles(Math.max(0, x.n * x.umbral - p))} personas.`
    }
    case 'sanidad': {
      const libre = Math.max(0, umb.zona - c.zbs_poblacion)
      const nuevos = inv.centros
        ? ` Con ${inv.centros === 1 ? 'el centro de salud nuevo' : `los ${inv.centros} centros de salud nuevos`} se suman ${miles(inv.centros * umb.zona)} plazas más (${miles(umb.zona)} por centro): ${miles(r.caben)} en total.`
        : ''
      return `Su zona básica de salud (${c.zbs_nombre}) atiende a ${miles(c.zbs_poblacion)} personas y las zonas de su tamaño llegan hasta ${miles(umb.zona)}. ` +
        (libre === 0 ? 'La zona ya está por encima: no queda sitio.' : `Quedan ${miles(libre)} plazas en la zona; a ${m.nombre} le toca la parte de sus vecinos${inv.centros ? '' : `: ${miles(r.caben)}`}.`) + nuevos
    }
    case 'vivienda':
      return `${miles(c.viv_no_principales)} viviendas vacías o secundarias × ${pct(esc.pctVivienda, 0)} + ${miles(c.viv_previstas)} viviendas previstas × ${pct(esc.pctSuelo, 0)}, ` +
        `por ${c.personas_hogar.toFixed(2).replace('.', ',')} personas por hogar = ${miles(r.caben)} personas.`
    default:
      return `Aunque tenga sitio, no conviene crecer más de un ${pct(esc.ritmoMax, 1)} al año: ${miles(p)} × ((1 + ${pct(esc.ritmoMax, 1)})^${esc.anio - ANIO_BASE} − 1) = ${miles(r.caben)} personas.`
  }
}

/** Modo «¿y si invertimos aquí?»: construir colegios o centros de salud y ver qué cambia. */
function Invertir({ r, antes, m, umbrales, inversion, onInvertir }: {
  r: ResultadoMunicipio; antes: ResultadoMunicipio; m: Municipio; umbrales: Umbrales
  inversion: Inversion; onInvertir: (inv: Inversion) => void
}) {
  const sinColegio = nivelesColegio(m, umbrales).length === 0
  const hay = inversion.colegios > 0 || inversion.centros > 0
  const ganan = r.caben - antes.caben

  return (
    <>
      <h3>¿Y si invertimos aquí?</h3>
      <div className="invertir">
        <Contador nombre="Colegios nuevos" coste={COSTE_COLEGIO} valor={inversion.colegios}
          onCambiar={(colegios) => onInvertir({ ...inversion, colegios })}
          aviso={sinColegio ? 'No tiene colegio propio: sus alumnos van a otro municipio.' : undefined} />
        <Contador nombre="Centros de salud nuevos" coste={COSTE_CENTRO_SALUD} valor={inversion.centros}
          onCambiar={(centros) => onInvertir({ ...inversion, centros })} />
      </div>
      {hay && (
        <div className="invertir-efecto" aria-live="polite">
          <p>
            Con <b>{millones(costeInversion(inversion))}</b> caben <b>{miles(r.caben)}</b> personas
            {ganan >= 1 ? <> ({miles(ganan)} más que antes)</> : <>, las mismas que antes</>}.
          </p>
          {r.tipo !== antes.tipo ? (
            <p>
              Pasa de <span className="chip" style={{ background: TIPOS[antes.tipo].color }}>{TIPOS[antes.tipo].nombre}</span> a{' '}
              <span className="chip" style={{ background: TIPOS[r.tipo].color }}>{TIPOS[r.tipo].nombre}</span>
            </p>
          ) : (
            <p>Sigue siendo «{TIPOS[r.tipo].nombre.toLowerCase()}».</p>
          )}
          {ganan < 1 && <p className="ayuda">No gana sitio porque {LIMITES[r.limitante].frase}. Prueba a invertir en otra cosa.</p>}
          <button className="boton-quitar" onClick={() => onInvertir({ colegios: 0, centros: 0 })}>Quitar la inversión</button>
        </div>
      )}
    </>
  )
}

function Contador({ nombre, coste, valor, onCambiar, aviso }: {
  nombre: string; coste: number; valor: number; onCambiar: (v: number) => void; aviso?: string
}) {
  return (
    <div className="contador">
      <div>
        <span className="c-nombre">{nombre}</span>
        <span className="ayuda">{aviso ?? `unos ${millones(coste)} cada uno`}</span>
      </div>
      <div className="c-botones">
        <button onClick={() => onCambiar(valor - 1)} disabled={valor === 0} aria-label={`Quitar uno: ${nombre.toLowerCase()}`}>−</button>
        <b aria-live="polite">{valor}</b>
        <button onClick={() => onCambiar(valor + 1)} disabled={!!aviso || valor >= 9} aria-label={`Añadir uno: ${nombre.toLowerCase()}`}>+</button>
      </div>
    </div>
  )
}
