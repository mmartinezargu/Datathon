// Ficha de un municipio: qué le llega, qué le cabe, qué le limita y de dónde sale cada número.

import { ANIO_BASE, COSTE_CENTRO_SALUD, COSTE_COLEGIO, PLAZO_CENTRO_SALUD_ANIOS, PLAZO_COLEGIO_ANIOS, alLimite, costeInversion, nivelesColegio, plazoInversion, quedanSinSitio, umbralesDe } from '../motor'
import { CONDICIONADA, LIMITES, TIPOS } from '../colores'
import type { Escenario, Inversion, Limite, Medida, Municipio, ResultadoMunicipio, Traslado, Umbrales } from '../tipos'
import { caben, decimal, miles, millones, pct } from '../formato'
import { MEDIDAS, distanciaTraslado, hospitalCercano, radioReubicacion, textoHospital } from '../medida'
import { Evolucion } from './Evolucion'
import { Icono } from './Iconos'
import { Vaso } from './Vaso'
import { OrigenMunicipio } from './OrigenVaso'

interface Props {
  r: ResultadoMunicipio
  antes: ResultadoMunicipio // el mismo municipio sin las inversiones simuladas
  m: Municipio
  porIne: Map<string, Municipio>
  escenario: Escenario
  umbrales: Umbrales
  inversion: Inversion
  onInvertir: (inv: Inversion) => void
  onElegir: (ine: string) => void // abrir la ficha de otro municipio (los de los traslados)
}

const ORDEN: Limite[] = ['vivienda', 'colegios', 'sanidad', 'ritmo']

export function Ficha({ r, antes, m, porIne, escenario, umbrales, inversion, onInvertir, onElegir }: Props) {
  const tipo = TIPOS[r.tipo]
  // Escala de las barras: el mayor de los límites o de lo que llega
  const valores = ORDEN.map((l) => r.limites[l]).filter((v): v is number => v !== null)
  const escala = Math.max(r.llegan, ...valores, 1)
  const ampliado = inversion.colegios > 0 || inversion.centros > 0
  const limite = alLimite(r, m, umbrales, inversion)

  return (
    <section className="ficha" style={{ borderTopColor: tipo.color }}>
      <div className="ficha-cabeza">
        <span className="chip" style={{ background: r.condicionada ? CONDICIONADA.fondo : tipo.color }}>
          {r.condicionada ? CONDICIONADA.nombre : tipo.nombre}
        </span>
        <h2>{m.nombre}</h2>
        <div className="ayuda">{m.zona}; {miles(r.poblacion)} vecinos hoy</div>
        <div className="ayuda ficha-hospital">
          <Icono nombre="sanidad" tamano={15} />
          {textoHospital(m, escenario.medida)}
        </div>
      </div>

      <Vaso capacidad={r.caben} dentro={Math.min(r.llegan, r.caben)} fuera={Math.max(0, -r.margen)} compacto ampliado={ampliado}
        origen={<OrigenMunicipio anio={escenario.anio} limitante={r.limitante} />} />

      <p className="ficha-frase">{frase(r, m, escenario.anio, ampliado, escenario.medida)}</p>
      {limite && <p className="ficha-limite" style={{ borderLeftColor: TIPOS.tension.color }}>{textoAlLimite(limite, m)}</p>}
      {escenario.reequilibrio && <Reubicados r={r} porIne={porIne} escenario={escenario} onElegir={onElegir} />}

      <h3>Personas que caben{ampliado ? '' : ' sin ampliar servicios'}, según cada recurso</h3>
      <div className="limites">
        {ORDEN.map((l) => {
          const v = r.limites[l]
          const manda = l === r.limitante
          return (
            <div key={l} className={`limite${manda ? ' manda' : ''}`}>
              <span className="l-nombre"><Icono nombre={l} tamano={17} />{LIMITES[l].nombre}</span>
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

      <details className="cuenta-detalle">
        <summary><span aria-hidden="true">#</span>Ver la cuenta</summary>
        <div className="cuenta">{explicacion(r, m, escenario, umbrales, inversion)}</div>
      </details>

      <Invertir r={r} antes={antes} m={m} umbrales={umbrales} inversion={inversion} onInvertir={onInvertir} />

      <h3>Población 2005–{escenario.anio}</h3>
      <Evolucion poblacion={m.poblacion} anioFin={escenario.anio} poblacionFin={r.poblacion + r.llegan} color={tipo.color} />
    </section>
  )
}

/** Con la reubicación activa: a qué pueblos cercanos envía gente, o de cuáles la recibe. */
function Reubicados({ r, porIne, escenario, onElegir }: {
  r: ResultadoMunicipio; porIne: Map<string, Municipio>; escenario: Escenario; onElegir: (ine: string) => void
}) {
  const exceso = Math.max(0, -r.margen)
  const quedan = quedanSinSitio(r)
  // Cada pueblo se puede pulsar para abrir su ficha
  const lista = (traslados: Traslado[], campo: 'origen' | 'destino') => (
    <>
      {traslados.slice(0, 5).map((t, i) => (
        <span key={t[campo]}>
          {i > 0 && ', '}
          <button className="enlace" onClick={() => onElegir(t[campo])}>{porIne.get(t[campo])?.nombre}</button>
          {' '}({miles(t.personas)}, {distanciaTraslado(t, escenario.medida)})
        </span>
      ))}
      {traslados.length > 5 && ' y otros'}
    </>
  )
  let texto
  if (r.envia >= 1) {
    texto = <>Envía <b>{miles(r.envia)}</b> personas a: {lista(r.envios, 'destino')}.
      {quedan >= 1 && <> <b>{miles(quedan)}</b> se quedan sin sitio.</>}</>
  } else if (r.recibe >= 1) {
    texto = <>Recibe <b>{miles(r.recibe)}</b> de: {lista(r.llegadas, 'origen')}.</>
  } else if (exceso >= 1) {
    texto = <>No hay ningún pueblo con sitio a menos de {radioReubicacion(escenario)}: las <b>{miles(exceso)}</b> personas que no caben se quedan sin sitio.</>
  } else {
    return null
  }
  return (
    <p className="ficha-reequilibrio">
      {texto}
      {(r.envia >= 1 || r.recibe >= 1) && <span className="ayuda"> En el mapa, con borde discontinuo.</span>}
    </p>
  )
}

function frase(r: ResultadoMunicipio, m: Municipio, anio: number, ampliado: boolean, medida: Medida): string {
  const l = LIMITES[r.limitante].frase
  const sin = ampliado ? '' : ' sin ampliar servicios'
  switch (r.tipo) {
    case 'tension':
      return r.caben < 1
        ? `Si sigue la tendencia, ${m.nombre} recibiría unas ${miles(r.llegan)} personas hasta ${anio}, pero no cabe nadie${sin}: ${l}.`
        : `Si sigue la tendencia, ${m.nombre} recibiría unas ${miles(r.llegan)} personas hasta ${anio}, pero solo caben unas ${miles(r.caben)}${sin}: ${l}.`
    case 'polo':
      return `Recibiría unas ${miles(r.llegan)} personas hasta ${anio} y caben ${caben(r.caben)}${sin}: puede crecer sin desbordarse.`
    case 'oportunidad':
      return `Caben unas ${miles(r.caben)} personas${sin}, pero solo llegarían ${miles(r.llegan)}. ` +
        (r.condicionada
          ? `Tiene sitio, pero el hospital queda a ${hospitalCercano(m, medida).distancia}${medida === 'min' ? ` ${MEDIDAS.min.como}` : ''}: ` +
            'antes de atraer gente hay que asegurar el acceso.'
          : 'Tiene sitio para acoger a más gente.')
    default:
      return `Llegarían unas ${miles(r.llegan)} personas y caben ${caben(r.caben)}${sin}. Crece poco y tiene poco margen.`
  }
}

/** «Al límite hoy»: por qué no cabe nadie sin ampliar (municipios con caben = 0). */
function textoAlLimite(x: NonNullable<ReturnType<typeof alLimite>>, m: Municipio): string {
  const cuanto = x.exceso < 0.001 ? 'justo en el límite' : `un ${pct(x.exceso, 1)} por encima`
  if (x.recurso === 'sanidad') {
    return `Al límite hoy: su zona de salud (${m.capacidad!.zbs_nombre}) ya atiende a ${miles(x.hoy)} personas y el límite es ${miles(x.limite)} (${cuanto}). ` +
      'Cualquier llegada necesita ampliar.'
  }
  const centros = x.nivel === 'primaria'
    ? (x.centros === 1 ? 'su colegio de primaria ya tiene' : 'sus colegios de primaria ya tienen')
    : (x.centros === 1 ? 'su instituto ya tiene' : 'sus institutos ya tienen')
  return `Al límite hoy: ${centros} unos ${miles(x.hoy)} alumnos${x.centros === 1 ? '' : ' por centro'} y el límite para los de su tamaño es ${miles(x.limite)} (${cuanto}). ` +
    'Cualquier llegada necesita ampliar.'
}

function explicacion(r: ResultadoMunicipio, m: Municipio, esc: Escenario, u: Umbrales, inv: Inversion): string {
  const c = m.capacidad!
  const p = r.poblacion
  const umb = umbralesDe(m, u)
  switch (r.limitante) {
    case 'colegios': {
      // El nivel que manda es el de menos sitio
      const x = nivelesColegio(m, u, inv.colegios).sort((a, b) => a.caben - b.caben)[0]
      const nuevos = inv.colegios ? ` (con ${inv.colegios === 1 ? 'el nuevo' : `los ${inv.colegios} nuevos`})` : ''
      const nivel = x.nombre === 'primaria' ? 'primaria' : 'ESO'
      const estimados = c.alumnos_estimados ? ' (estimación: no hay dato de matrícula)' : ''
      return `${x.n} ${x.n === 1 ? 'centro' : 'centros'} de ${x.nombre}${nuevos} con ${miles(x.alumnos)} alumnos de ${nivel}${estimados}: ${miles(x.alumnos / x.n)} por centro. ` +
        `Los municipios de su tamaño llegan hasta ${miles(x.limite)} por centro. Plazas libres: (${miles(x.limite)} × ${x.n}) − ${miles(x.alumnos)} = ${miles(Math.max(0, x.libres))}. ` +
        `En ${m.nombre} viven ${decimal(x.ninosPorVecino * 100, 1)} niños ${x.nombre === 'primaria' ? 'de 6 a 11 años' : 'de 12 a 17 años'} por cada 100 vecinos (estimación): ` +
        `si quien llega trae los mismos, caben ${miles(x.caben)} personas.`
    }
    case 'sanidad': {
      // La parte del municipio en el sitio libre de la zona (negativa si la zona ya se pasa del límite)
      const parte = (umb.zona - c.zbs_poblacion) * Math.min(1, p / c.zbs_poblacion)
      const total = miles(r.limites.sanidad ?? 0)
      const nuevos = inv.centros
        ? ` Con ${inv.centros === 1 ? 'el centro de salud nuevo' : `los ${inv.centros} centros de salud nuevos`} se suman ${miles(inv.centros * umb.zona)} plazas (${miles(umb.zona)} por centro)` +
          (parte < 0 ? `; descontando ese exceso, quedan ${total}.` : `: ${total} en total.`)
        : ''
      return `Su zona básica de salud (${c.zbs_nombre}) atiende a ${miles(c.zbs_poblacion)} personas y una zona aguanta hasta ${miles(umb.zona)}. ` +
        (parte < 0
          ? `La zona ya está por encima: a ${m.nombre}, por la parte de sus vecinos, le tocan ${miles(-parte)} personas de más${inv.centros ? '' : ', así que no queda sitio'}.`
          : `Quedan ${miles(umb.zona - c.zbs_poblacion)} plazas en la zona; a ${m.nombre} le toca la parte de sus vecinos${inv.centros ? '' : `: ${total}`}.`) + nuevos
    }
    case 'vivienda':
      return (c.viv_vacias_sin_dato
        ? `${miles(c.viv_vacias)} viviendas vacías (estimación: el INE no da las de un pueblo tan pequeño, se calculan con su zona) × `
        : `${miles(c.viv_vacias)} viviendas vacías × `) + `${pct(esc.pctVivienda, 0)} + ${miles(c.viv_previstas)} viviendas previstas` +
        (c.viv_previstas_con_estimacion ? ` (${miles(c.viv_previstas_estimadas)} estimadas: suelo sin cifra en el planeamiento)` : '') +
        ` × ${pct(esc.pctSuelo, 0)}, ` +
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
        <Contador nombre="Colegios nuevos" coste={COSTE_COLEGIO} plazo={PLAZO_COLEGIO_ANIOS} valor={inversion.colegios}
          onCambiar={(colegios) => onInvertir({ ...inversion, colegios })}
          aviso={sinColegio ? 'No tiene colegio propio: sus alumnos van a otro municipio.' : undefined} />
        <Contador nombre="Centros de salud nuevos" coste={COSTE_CENTRO_SALUD} plazo={PLAZO_CENTRO_SALUD_ANIOS} valor={inversion.centros}
          onCambiar={(centros) => onInvertir({ ...inversion, centros })} />
      </div>
      {hay && (
        <div className="invertir-efecto" aria-live="polite">
          <p>
            Con <b>{millones(costeInversion(inversion))}</b> caben <b>{miles(r.caben)}</b> personas
            {ganan >= 1 ? <> ({miles(ganan)} más que antes)</> : <>, las mismas que antes</>}.
          </p>
          <p>Estaría listo en <b>unos {plazoInversion(inversion)} años</b> <span className="estimacion">estimación</span></p>
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

function Contador({ nombre, coste, plazo, valor, onCambiar, aviso }: {
  nombre: string; coste: number; plazo: number; valor: number; onCambiar: (v: number) => void; aviso?: string
}) {
  return (
    <div className="contador">
      <div>
        <span className="c-nombre">{nombre}</span>
        <span className="ayuda">
          {aviso ?? <>unos {millones(coste)} cada uno; abre en unos {plazo} años <span className="estimacion">estimación</span></>}
        </span>
      </div>
      <div className="c-botones">
        <button onClick={() => onCambiar(valor - 1)} disabled={valor === 0} aria-label={`Quitar uno: ${nombre.toLowerCase()}`}>−</button>
        <b aria-live="polite">{valor}</b>
        <button onClick={() => onCambiar(valor + 1)} disabled={!!aviso || valor >= 9} aria-label={`Añadir uno: ${nombre.toLowerCase()}`}>+</button>
      </div>
    </div>
  )
}
