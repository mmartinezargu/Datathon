// Ficha de un municipio: qué le llega, qué le cabe, qué le limita y de dónde sale cada número.

import { ANIO_BASE, alLimite, aperturaObra, costeObra, nivelesColegio, quedanSinSitio, umbralesDe } from '../motor'
import { CONDICIONADA, LIMITES, TIPOS } from '../colores'
import type { Escenario, Inversion, Limite, Municipio, Obra, ResultadoMunicipio, TipoObra, Traslado, Umbrales } from '../tipos'
import { caben, decimal, miles, millones, pct } from '../formato'
import { Evolucion } from './Evolucion'
import { Icono } from './Iconos'
import { Vaso } from './Vaso'
import { OrigenMunicipio } from './OrigenVaso'

interface Props {
  r: ResultadoMunicipio
  m: Municipio
  porIne: Map<string, Municipio>
  escenario: Escenario
  umbrales: Umbrales
  inversion: Inversion // lo que construye el plan aquí
  enPlan: Obra[] // las obras del plan en este municipio
  onPlanificar: () => void // abrir la pestaña «Plan» (con este municipio añadido si no estaba)
  onElegir: (ine: string) => void // abrir la ficha de otro municipio (los de los traslados)
}

const ORDEN: Limite[] = ['vivienda', 'colegios', 'sanidad', 'ritmo']

export function Ficha({ r, m, porIne, escenario, umbrales, inversion, enPlan, onPlanificar, onElegir }: Props) {
  const tipo = TIPOS[r.tipo]
  // Escala de las barras: el mayor de los límites o de lo que llega
  const valores = ORDEN.map((l) => r.limites[l]).filter((v): v is number => v !== null)
  const escala = Math.max(r.llegan, ...valores, 1)
  const ampliado = enPlan.length > 0
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
          Hospital más cercano: {m.hospital_municipio}, a {decimal(m.hospital_km)} km en línea recta
        </div>
      </div>

      <Vaso capacidad={r.caben} dentro={Math.min(r.llegan, r.caben)} fuera={Math.max(0, -r.margen)} compacto ampliado={ampliado}
        origen={<OrigenMunicipio anio={escenario.anio} limitante={r.limitante} />} />

      <p className="ficha-frase">{frase(r, m, escenario.anio, ampliado)}</p>
      {limite && <p className="ficha-limite" style={{ borderLeftColor: TIPOS.tension.color }}>{textoAlLimite(limite, m)}</p>}
      {escenario.reequilibrio && <Reubicados r={r} porIne={porIne} radioKm={escenario.radioKm} onElegir={onElegir} />}

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

      <EnElPlan obras={enPlan} onPlanificar={onPlanificar} />

      <h3>Población 2005–{escenario.anio}</h3>
      <Evolucion poblacion={m.poblacion} anioFin={escenario.anio} poblacionFin={r.poblacion + r.llegan} color={tipo.color} />
    </section>
  )
}

/** Con la reubicación activa: a qué pueblos cercanos envía gente, o de cuáles la recibe. */
function Reubicados({ r, porIne, radioKm, onElegir }: {
  r: ResultadoMunicipio; porIne: Map<string, Municipio>; radioKm: number; onElegir: (ine: string) => void
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
          {' '}({miles(t.personas)}, {miles(t.km)} km)
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
    texto = <>No hay ningún pueblo con sitio a menos de {radioKm} km: las <b>{miles(exceso)}</b> personas que no caben se quedan sin sitio.</>
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

function frase(r: ResultadoMunicipio, m: Municipio, anio: number, ampliado: boolean): string {
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
          ? `Tiene sitio, pero el hospital queda a ${decimal(m.hospital_km)} km: antes de atraer gente hay que asegurar el acceso.`
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
      const x = nivelesColegio(m, u, inv).sort((a, b) => a.caben - b.caben)[0]
      const nuevas = x.nuevas ? ` + ${miles(x.nuevas)} del plan` : ''
      const nivel = x.nombre === 'primaria' ? 'primaria' : 'ESO'
      const estimados = c.alumnos_estimados ? ' (estimación: no hay dato de matrícula)' : ''
      return `${x.n} ${x.n === 1 ? 'centro' : 'centros'} de ${x.nombre} con ${miles(x.alumnos)} alumnos de ${nivel}${estimados}: ${miles(x.alumnos / x.n)} por centro. ` +
        `Los municipios de su tamaño llegan hasta ${miles(x.limite)} por centro. Plazas libres: (${miles(x.limite)} × ${x.n}) − ${miles(x.alumnos)}${nuevas} = ${miles(Math.max(0, x.libres))}. ` +
        `En ${m.nombre} viven ${decimal(x.ninosPorVecino * 100, 1)} niños ${x.nombre === 'primaria' ? 'de 6 a 11 años' : 'de 12 a 17 años'} por cada 100 vecinos (estimación): ` +
        `si quien llega trae los mismos, caben ${miles(x.caben)} personas.`
    }
    case 'sanidad': {
      // La parte del municipio en el sitio libre de la zona (negativa si la zona ya se pasa del límite)
      const parte = (umb.zona - c.zbs_poblacion) * Math.min(1, p / c.zbs_poblacion)
      const total = miles(r.limites.sanidad ?? 0)
      const nuevos = inv.centros
        ? ` Con ${inv.centros === 1 ? 'el centro de salud nuevo' : `los ${inv.centros} centros de salud nuevos`} del plan se suman ${miles(inv.personasSanidad)} personas` +
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

const OBRAS_EN_TEXTO: Record<TipoObra, [string, string]> = {
  ampliar_primaria: ['ampliación de colegio', 'ampliaciones de colegio'],
  colegio_primaria: ['colegio nuevo', 'colegios nuevos'],
  instituto: ['instituto', 'institutos'],
  centro_salud: ['centro de salud', 'centros de salud'],
}

/** «En el plan: 1 ampliación de colegio y 1 centro de salud (8,5 M€; abre en 2030) → Ver en el plan». */
function EnElPlan({ obras, onPlanificar }: { obras: Obra[]; onPlanificar: () => void }) {
  const partes = (Object.keys(OBRAS_EN_TEXTO) as TipoObra[])
    .map((t) => [t, obras.filter((o) => o.tipo === t).length] as const)
    .filter(([, n]) => n > 0)
    .map(([t, n]) => `${n} ${OBRAS_EN_TEXTO[t][n === 1 ? 0 : 1]}`)
  const lista = partes.length > 1 ? `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}` : partes[0]
  return (
    <p className="ficha-plan">
      <span>
        En el plan:{' '}
        {obras.length ? <><b>{lista}</b> ({millones(obras.reduce((s, o) => s + costeObra(o), 0))}; abre en {Math.max(...obras.map(aperturaObra))})</> : 'nada todavía'}
      </span>
      <button className="enlace" onClick={onPlanificar}>{obras.length ? 'Ver en el plan' : 'Planificar aquí'} →</button>
    </p>
  )
}
