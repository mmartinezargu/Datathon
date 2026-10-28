// Pestaña «Plan» (#plan): qué hace falta construir para que quepa la gente.
// Para profesionales: una sola lista de obras que se rellena de dos maneras (plan recomendado, o a tu medida: con un presupuesto o a mano),
// todo editable, con los valores por defecto de CABIDA y su fuente. Se ve en dos tablas (colegios e institutos; centros de salud):
// en la lista van siempre en ese orden (ordenarObras) y las obras nuevas entran arriba de su tabla (anadirObra).
// Las cuentas las hace motor.ts.

import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import {
  OBRAS_REFERENCIA, PARAMETROS_PLAN, anadirObra, aperturaObra, calcularUmbrales, cambiarTipoObra, costeObra, escenarioDelPlan, evaluarPlan,
  nuevaObra, obraSugerida, planOptimo, resumenReubicacion, sinSitioAlReves,
} from '../motor'
import { FUENTES_PLAN, FUENTE_ANIO_INICIO, NOMBRE_OBRA, QUE_HACE_OBRA, textoComparacion, textoObras, valorObra } from '../fuentesPlan'
import { LIMITES, TIPOS } from '../colores'
import { decimal, miles, millones } from '../formato'
import { radioReubicacion } from '../medida'
import type { Escenario, Municipio, Obra, OpcionesPlan, ParametrosPlan, ResultadoPlan, TipoObra, ZonaSalud } from '../tipos'
import { Buscador } from './Buscador'
import { ObrasReferencia } from './ObrasReferencia'

interface Props {
  municipios: Municipio[]
  zonas: ZonaSalud[]
  porIne: Map<string, Municipio>
  escenario: Escenario
  obras: Obra[]
  onObras: (obras: Obra[]) => void
  parametros: ParametrosPlan
  onParametros: (p: ParametrosPlan) => void
  opciones: OpcionesPlan // con qué se rellenó el último reparto de presupuesto
  onOpciones: (o: OpcionesPlan) => void
  reubica: boolean // interruptor propio del plan: reubicar en municipios cercanos (por defecto, sí)
  onReubica: (v: boolean) => void
  onFicha: (ine: string) => void
  onVerEnMapa: () => void
}

const TIPOS_OBRA = Object.keys(NOMBRE_OBRA) as TipoObra[]
type Modo = 'optimo' | 'medida' | null // cuál de los dos botones está elegido

export function Plan({ municipios, zonas, porIne, escenario, obras, onObras, parametros, onParametros, opciones, onOpciones, reubica, onReubica,
  onFicha, onVerEnMapa }: Props) {
  const [modo, setModo] = useState<Modo>(null)
  const esc = useMemo(() => escenarioDelPlan(escenario, reubica), [escenario, reubica])
  const delReto = useMemo(() => municipios.filter((m) => m.universo && m.capacidad).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')), [municipios])
  const umbrales = useMemo(() => calcularUmbrales(delReto, zonas, esc.exigencia), [delReto, zonas, esc.exigencia])

  const resultado = useMemo(() => evaluarPlan(municipios, zonas, esc, obras), [municipios, zonas, esc, obras])
  // Con estas mismas obras, el caso contrario al del interruptor (null con la lista vacía)
  const alReves = useMemo(() => sinSitioAlReves(municipios, zonas, esc, obras), [municipios, zonas, esc, obras])

  const rellenar = (o: OpcionesPlan) => {
    onOpciones(o)
    onObras(planOptimo(municipios, zonas, esc, parametros, o))
  }
  const anadir = (ine: string) => {
    const r = resultado.resultados.find((x) => x.ine === ine)
    const m = porIne.get(ine)
    if (!r || !m) return
    onObras(anadirObra(obras, nuevaObra(ine, obraSugerida(m, r, umbrales, obras, parametros), parametros)))
  }
  const cambiar = (i: number, parcial: Partial<Obra>) => onObras(obras.map((o, k) => (k === i ? { ...o, ...parcial } : o)))
  const cambiarTipo = (i: number, tipo: TipoObra) => onObras(cambiarTipoObra(obras, i, tipo, parametros))

  return (
    <div className="plan">
      <section className="val-cabeza">
        <h1>¿Qué hace falta para que quepan?</h1>
        <p>
          Hasta {escenario.anio} llegan {miles(escenario.personas)} personas. {reubica ? 'Aun reubicando en municipios cercanos' : 'Sin reubicar'},{' '}
          <b>{miles(resultado.sinSitioAntes)}</b> se quedan sin sitio. Aquí se decide qué colegios y centros de salud construir, dónde y cuándo.
          El escenario se cambia en el <a href="#mapa">mapa</a>.
        </p>
      </section>

      <label className="control interruptor plan-reubicar">
        <input type="checkbox" role="switch" checked={reubica} onChange={(e) => onReubica(e.target.checked)} />
        <span className="interruptor-texto">
          <b>Reubicar en municipios cercanos</b>
          <span className="pista">
            Quien no cabe en su municipio va al más cercano con sitio, a menos de {radioReubicacion(escenario)} y con hospital cerca.
            Lo usan el plan recomendado, «Lo que consigue» y la tabla.
          </span>
        </span>
      </label>

      <div className="plan-botones" role="group" aria-label="Rellenar la lista">
        <button className={`plan-boton${modo === 'optimo' ? ' principal' : ''}`} aria-pressed={modo === 'optimo'}
          onClick={() => { setModo('optimo'); rellenar({}) }}>
          <b>Plan recomendado</b><span>Lo que haga falta, donde más gente cabe por cada euro</span>
        </button>
        <button className={`plan-boton${modo === 'medida' ? ' principal' : ''}`} aria-pressed={modo === 'medida'}
          onClick={() => setModo('medida')}>
          <b>A tu medida</b><span>Con un presupuesto o añadiendo obras a mano</span>
        </button>
      </div>
      {modo === 'medida' && (
        <div className="plan-panel">
          <Presupuesto delReto={delReto} porIne={porIne} opciones={opciones} onRepartir={rellenar} />
          <div className="plan-seccion">
            <h3>O añade una obra a mano</h3>
            <p className="ayuda">Elige un municipio: se añade arriba de su tabla la obra que suelta su límite, y ahí puedes cambiarla por cualquier otra.</p>
            <Buscador municipios={delReto} onElegir={anadir} texto="Añadir municipio" />
          </div>
        </div>
      )}

      <div className="plan-cuerpo">
        <div className="plan-izquierda">
          <Lista obras={obras} resultado={resultado} porIne={porIne} parametros={parametros} horizonte={escenario.anio}
            onCambiar={cambiar} onCambiarTipo={cambiarTipo} onBorrar={(i) => onObras(obras.filter((_, k) => k !== i))} onVaciar={() => { onObras([]); setModo(null) }}
            onFicha={onFicha} />
          <Parametros parametros={parametros} onParametros={onParametros} />
        </div>

        <aside className="plan-derecha" aria-label="Resultado del plan">
          <Resumen r={resultado} alReves={alReves} reubica={reubica} />
          <div className="plan-acciones">
            <button className="plan-boton principal" disabled={!obras.length} onClick={onVerEnMapa}>
              <b>Ver en el mapa</b><span>{reubica ? 'Con la lista y la reubicación en el simulador' : 'Con la lista, sin reubicar, en el simulador'}</span>
            </button>
          </div>
          <Calendario r={resultado} desde={obras.length ? Math.min(...obras.map((o) => o.inicio)) : parametros.anioInicio} />
          {reubica && <ComoSeConsigue r={resultado} esc={esc} />}
        </aside>
      </div>
    </div>
  )
}

function Presupuesto({ delReto, porIne, opciones, onRepartir }: {
  delReto: Municipio[]; porIne: Map<string, Municipio>; opciones: OpcionesPlan; onRepartir: (o: OpcionesPlan) => void
}) {
  const [total, setTotal] = useState(opciones.presupuestoTotal ? String(opciones.presupuestoTotal / 1e6) : '')
  const [anual, setAnual] = useState(opciones.presupuestoAnual ? String(opciones.presupuestoAnual / 1e6) : '')
  const [solo, setSolo] = useState<string[]>(opciones.soloMunicipios ?? [])
  const totalM = Number(total.replace(',', '.'))
  const anualM = Number(anual.replace(',', '.'))
  const valido = totalM > 0

  return (
    <form className="plan-seccion" onSubmit={(e) => {
      e.preventDefault()
      if (!valido) return
      onRepartir({ presupuestoTotal: totalM * 1e6, presupuestoAnual: anualM > 0 ? anualM * 1e6 : undefined, soloMunicipios: solo.length ? solo : undefined })
    }}>
      <h3>Reparte un presupuesto</h3>
      <div className="plan-campos">
        <label className="control"><span className="etiqueta">Presupuesto total (M€)</span>
          <input type="text" inputMode="decimal" value={total} onChange={(e) => setTotal(e.target.value)} placeholder="Por ejemplo, 100" required /></label>
        <label className="control"><span className="etiqueta">Como mucho al año (M€, opcional)</span>
          <input type="text" inputMode="decimal" value={anual} onChange={(e) => setAnual(e.target.value)} placeholder="Sin límite" /></label>
      </div>
      <div className="control">
        <span className="etiqueta">Solo en estos municipios (opcional)</span>
        <Buscador municipios={delReto.filter((m) => !solo.includes(m.ine))} onElegir={(ine) => setSolo([...solo, ine])} texto="Añadir municipio" />
        {solo.length > 0 && (
          <ul className="plan-chips">
            {solo.map((ine) => (
              <li key={ine}>{porIne.get(ine)?.nombre}
                <button type="button" aria-label={`Quitar ${porIne.get(ine)?.nombre}`} onClick={() => setSolo(solo.filter((x) => x !== ine))}>×</button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <button className="plan-boton principal" type="submit" disabled={!valido}><b>Repartir (sustituye la lista)</b></button>
    </form>
  )
}

function Lista({ obras, resultado, porIne, parametros, horizonte, onCambiar, onCambiarTipo, onBorrar, onVaciar, onFicha }: {
  obras: Obra[]; resultado: ResultadoPlan; porIne: Map<string, Municipio>; parametros: ParametrosPlan; horizonte: number
  onCambiar: (i: number, parcial: Partial<Obra>) => void; onCambiarTipo: (i: number, tipo: TipoObra) => void; onBorrar: (i: number) => void; onVaciar: () => void; onFicha: (ine: string) => void
}) {
  const limitante = new Map(resultado.resultados.map((r) => [r.ine, r.limitante]))
  // Cada fila con su sitio en la lista (las dos tablas editan la misma lista)
  const filas = obras.map((o, i) => ({ o, i }))
  const colegios = filas.filter((f) => f.o.tipo !== 'centro_salud')
  const centros = filas.filter((f) => f.o.tipo === 'centro_salud')
  const nombre = (o: Obra) => porIne.get(o.ine)?.nombre ?? o.ine

  // Columnas que comparten las dos tablas: municipio al principio; años, coste, apertura, lo que gana y borrar al final
  const municipio = (o: Obra) => (
    <td><button className="enlace" onClick={() => onFicha(o.ine)} title="Ver su ficha en el mapa">{nombre(o)}</button></td>
  )
  // Cualquiera de los 4 tipos en cualquier fila: al cambiar, toma los valores de ese tipo y pasa a su tabla
  const tipo = (o: Obra, i: number) => (
    <td className="plan-obra">
      <select value={o.tipo} aria-label={`Obra en ${nombre(o)}`} onChange={(e) => onCambiarTipo(i, e.target.value as TipoObra)}>
        {TIPOS_OBRA.map((t) => <option key={t} value={t}>{NOMBRE_OBRA[t]}</option>)}
      </select>
    </td>
  )
  const finales = (o: Obra, i: number) => {
    const gana = resultado.ganaPorObra[i] ?? 0
    return (
      <>
        <td className="num"><Numero valor={o.anios} onCambiar={(anios) => onCambiar(i, { anios: Math.round(anios) })} etiqueta={`Años de obra en ${nombre(o)}`} corto /></td>
        <td className="num">
          {o.tipo === 'centro_salud'
            ? <Numero valor={o.eurosPorPlaza} onCambiar={(eurosPorPlaza) => onCambiar(i, { eurosPorPlaza })} escala={1e6} sufijo="M€"
              etiqueta={`Millones que cuesta el centro de ${nombre(o)}`} />
            : millones(costeObra(o))}
        </td>
        <td className={`num${aperturaObra(o) > horizonte ? ' plan-tarde' : ''}`}
          title={aperturaObra(o) > horizonte ? `Abre después de ${horizonte}` : undefined}>{aperturaObra(o)}</td>
        <td className="num">
          {gana >= 1 ? miles(gana) : <span className="plan-cero" title={`Con las demás obras puestas, quitar esta no deja a nadie sin sitio: manda ${LIMITES[limitante.get(o.ine) ?? 'vivienda'].nombre.toLowerCase()} o ya la cubren otras obras`}>0</span>}
        </td>
        <td className="num">{gana >= 1 ? miles(costeObra(o) / gana) : '—'}</td>
        <td><button className="plan-borrar" onClick={() => onBorrar(i)} aria-label={`Borrar la obra de ${nombre(o)}`} title="Borrar">×</button></td>
      </>
    )
  }
  const cabeceraFinal = (
    <><th className="num">Años</th><th className="num">Coste</th><th className="num">Abre</th><th className="num">Pasan<br />a caber</th>
      <th className="num" title={AYUDA_POR_PERSONA}>€ por persona<br />que cabe</th><th aria-label="Borrar" /></>
  )

  return (
    <section className="val-tarjeta">
      <div className="plan-lista-cabeza">
        <h2>Obras del plan</h2>
        {obras.length > 0 && <button className="desplegar" onClick={onVaciar}>Vaciar lista<span className="flecha" aria-hidden="true">×</span></button>}
      </div>
      {obras.length === 0 && (
        <p className="vacio">La lista está vacía. Pulsa «Plan recomendado» para rellenarla, o usa «A tu medida» para repartir un presupuesto o añadir obras a mano.</p>
      )}
      {colegios.length > 0 && (
        <>
          <h3 className="plan-tabla-titulo">Colegios e institutos</h3>
          <div className="tabla-scroll">
            <table className="plan-tabla">
              <thead>
                <tr><th>Municipio</th><th>Obra</th><th className="num">Plazas</th><th className="num">€ por<br />plaza</th>{cabeceraFinal}</tr>
              </thead>
              <tbody>
                {colegios.map(({ o, i }) => (
                  <tr key={i}>
                    {municipio(o)}
                    {tipo(o, i)}
                    <td className="num"><Numero valor={o.plazas} onCambiar={(plazas) => onCambiar(i, { plazas })} etiqueta={`Plazas en ${nombre(o)}`} /></td>
                    <td className="num"><Numero valor={o.eurosPorPlaza} onCambiar={(eurosPorPlaza) => onCambiar(i, { eurosPorPlaza })}
                      etiqueta={`Euros por plaza en ${nombre(o)}`} /></td>
                    {finales(o, i)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="ayuda plan-pie">«€ por persona que cabe»: {AYUDA_POR_PERSONA}</p>
        </>
      )}
      {centros.length > 0 && (
        <>
          <h3 className="plan-tabla-titulo">Centros de salud</h3>
          <div className="tabla-scroll">
            <table className="plan-tabla">
              <thead>
                <tr><th>Municipio</th><th>Obra</th><th>Zona de salud</th><th className="num">Personas<br />que atiende</th>{cabeceraFinal}</tr>
              </thead>
              <tbody>
                {centros.map(({ o, i }) => (
                  <tr key={i}>
                    {municipio(o)}
                    {tipo(o, i)}
                    <td>{porIne.get(o.ine)?.capacidad?.zbs_nombre}</td>
                    <td className="num"><Numero valor={o.plazas} onCambiar={(plazas) => onCambiar(i, { plazas })}
                      etiqueta={`Personas que atiende el centro de ${nombre(o)}`} /></td>
                    {finales(o, i)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="ayuda plan-pie">
            Un centro de salud sirve a toda su zona básica, esté en el municipio que esté: el plan recomendado lo pone en el más poblado
            de la zona; a mano, se queda donde lo pongas. El coste es el del centro
            ({millones(parametros.obras.centro_salud.eurosPorPlaza)} por defecto); se puede cambiar en cada fila.
          </p>
        </>
      )}
      {obras.length > 0 && (
        <p className="ayuda plan-pie">
          «Pasan a caber»: cuánta gente se quedaría sin sitio en los 155 si se quitara solo esa obra, con las demás puestas. Unas obras
          se apoyan en otras, así que las filas no tienen por qué sumar el total de arriba. Pulsa un municipio para ver su ficha.
        </p>
      )}
    </section>
  )
}

const AYUDA_POR_PERSONA = 'Cada plaza escolar da sitio a una familia entera, no solo al niño; cuántas personas depende de los niños ' +
  'por vecino de cada municipio. Reubicando, lo que se libera aprovecha también a los vecinos.'

/**
 * Campo numérico en formato español («23.078», «7,1»). Mientras se escribe guarda el texto, para poder borrar sin que salte.
 * En millones (escala 1e6) el punto también vale como coma decimal.
 */
function Numero({ valor, onCambiar, etiqueta, escala = 1, sufijo, corto = false, anio = false }: {
  valor: number; onCambiar: (v: number) => void; etiqueta: string; escala?: number; sufijo?: string; corto?: boolean; anio?: boolean
}) {
  const [texto, setTexto] = useState<string | null>(null)
  const leer = (t: string) => Number(escala > 1 ? t.replace(',', '.') : t.replace(/\./g, '').replace(',', '.'))
  return (
    <span className={`plan-num${corto ? ' corto' : ''}`}>
      <input type="text" inputMode="decimal" aria-label={etiqueta} value={texto ?? (anio ? String(valor) : escala > 1 ? decimal(valor / escala) : miles(valor))}
        onChange={(e) => {
          setTexto(e.target.value)
          const v = leer(e.target.value.trim())
          if (e.target.value.trim() !== '' && Number.isFinite(v) && v >= 0) onCambiar(v * escala)
        }}
        onBlur={() => setTexto(null)} />
      {sufijo && <small>{sufijo}</small>}
    </span>
  )
}

function Resumen({ r, alReves, reubica }: { r: ResultadoPlan; alReves: number | null; reubica: boolean }) {
  const hayObras = alReves !== null
  const total = Object.values(r.obras).reduce((s, n) => s + n, 0)
  const otros = r.sinSitioPor.colegios + r.sinSitioPor.sanidad
  const motivos = [
    r.sinSitioPor.vivienda >= 1 && `${miles(r.sinSitioPor.vivienda)} por falta de vivienda`,
    r.sinSitioPor.ritmo >= 1 && `${miles(r.sinSitioPor.ritmo)} porque su municipio crecería demasiado deprisa`,
    otros >= 1 && `${miles(otros)} por colegios o sanidad, que necesitan más obras`,
  ].filter((x): x is string => !!x)
  return (
    <section className="val-tarjeta plan-resumen" aria-live="polite">
      <h2>Lo que consigue</h2>
      {hayObras ? (
      <div className="plan-cifras">
        <Dato valor={millones(r.coste)} texto={`en ${r.municipios} ${r.municipios === 1 ? 'municipio' : 'municipios'}`} />
        <Dato valor={String(total)} texto={`${total === 1 ? 'obra' : 'obras'}: ${textoObras(r.obras)}`} />
        <Dato valor={miles(r.pasanACaber)} texto={`personas más caben; ${miles(r.coste / Math.max(1, r.pasanACaber))} € por persona`} acento={TIPOS.polo.color} />
        <Dato valor={r.ultimaApertura ? String(r.ultimaApertura) : '—'} texto="abre lo último" />
      </div>
      ) : <p className="vacio">Todavía no hay obras en el plan.</p>}
      <p className="plan-quedan">
        {hayObras ? 'Siguen' : 'Se quedan'} sin sitio <b>{miles(r.sinSitio)}</b>
        {motivos.length > 0 && <>: {motivos.length > 1 ? `${motivos.slice(0, -1).join(', ')} y ${motivos[motivos.length - 1]}` : motivos[0]}</>}.
        {(r.sinSitioPor.vivienda >= 1 || r.sinSitioPor.ritmo >= 1) && ' La vivienda y el ritmo no se arreglan con colegios ni centros de salud.'}
      </p>
      {alReves !== null && <p className="plan-comparacion">{textoComparacion(reubica, alReves)}</p>}
    </section>
  )
}

function Dato({ valor, texto, acento }: { valor: string; texto: string; acento?: string }) {
  return (
    <div className="plan-dato">
      <b style={acento ? { color: acento } : undefined}>{valor}</b>
      <span>{texto}</span>
    </div>
  )
}

/** Barras: personas que pasan a caber cada año, según abren las obras. */
function Calendario({ r, desde }: { r: ResultadoPlan; desde: number }) {
  if (!r.ultimaApertura) return null
  const porAnio = new Map(r.calendario.map((c) => [c.anio, c.personas]))
  const datos = Array.from({ length: r.ultimaApertura - desde + 1 }, (_, k) => ({ anio: desde + k, personas: Math.round(porAnio.get(desde + k) ?? 0) }))
  return (
    <section className="val-tarjeta">
      <h2>Año a año</h2>
      <p className="ayuda">Personas que pasan a caber el año en que abren las obras.</p>
      <div className="plan-grafico">
        <ResponsiveContainer width="100%" height={170}>
          <BarChart data={datos} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--linea)" />
            <XAxis dataKey="anio" tickLine={false} axisLine={{ stroke: 'var(--linea)' }} tick={{ fill: 'var(--tinta2)', fontSize: 12 }} />
            <YAxis width={52} tickLine={false} axisLine={false} tick={{ fill: 'var(--tinta2)', fontSize: 11 }} tickFormatter={(v: number) => miles(v)} />
            <Tooltip cursor={{ fill: 'var(--fondo)' }} formatter={(v) => [`${miles(Number(v))} personas`, 'Pasan a caber']}
              labelFormatter={(a) => `Abren en ${a}`} />
            <Bar dataKey="personas" fill={TIPOS.polo.color} radius={[4, 4, 0, 0]} maxBarSize={44} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}

function ComoSeConsigue({ r, esc }: { r: ResultadoPlan; esc: Escenario }) {
  const re = resumenReubicacion(r.resultados)
  return (
    <section className="plan-como">
      <h2>Cómo se consigue</h2>
      <ul>
        {esc.medida === 'min' ? (
          <li>Nadie se muda lejos: {miles(re.minMedio)} min de media en coche, sin tráfico, y nunca a más de {radioReubicacion(esc)} de su municipio.</li>
        ) : (
          <li>Nadie se muda lejos: {decimal(re.kmMedio)} km de media en línea recta, y nunca a más de {radioReubicacion(esc)} de su municipio.</li>
        )}
        <li>La Administración decide dónde se construye vivienda.</li>
        <li>Sin esa vivienda en los municipios con sitio, la reubicación no ocurre.</li>
      </ul>
    </section>
  )
}

function Parametros({ parametros, onParametros }: { parametros: ParametrosPlan; onParametros: (p: ParametrosPlan) => void }) {
  const cambiar = (tipo: TipoObra, parcial: Partial<ParametrosPlan['obras'][TipoObra]>) =>
    onParametros({ ...parametros, obras: { ...parametros.obras, [tipo]: { ...parametros.obras[tipo], ...parcial } } })
  const cambiados = JSON.stringify(parametros) !== JSON.stringify(PARAMETROS_PLAN)
  return (
    <details className="val-tarjeta plan-parametros">
      <summary><b>Parámetros</b><span className="ayuda">{cambiados ? 'Has cambiado algún valor' : 'Los valores de CABIDA, con su fuente'}</span></summary>
      <p className="ayuda">Se usan al rellenar la lista y al añadir obras; las que ya están en la lista no cambian.</p>
      <div className="plan-param-lista">
        {TIPOS_OBRA.map((t) => {
          const v = parametros.obras[t]
          const cabida = PARAMETROS_PLAN.obras[t]
          const centro = t === 'centro_salud'
          const n = OBRAS_REFERENCIA.medianas[t].n
          return (
            <div key={t} className="plan-param">
              <h3>{NOMBRE_OBRA[t]}</h3>
              <p className="ayuda">{QUE_HACE_OBRA[t]}</p>
              <div className="plan-campos">
                <label className="control"><span className="etiqueta">{centro ? 'Personas que atiende' : 'Plazas'}</span>
                  <Numero valor={v.plazas} onCambiar={(plazas) => cambiar(t, { plazas })} etiqueta={`${NOMBRE_OBRA[t]}: ${centro ? 'personas que atiende' : 'plazas'}`} />
                  {v.plazas !== cabida.plazas && <ValorTuyo texto={miles(cabida.plazas)} />}</label>
                <label className="control"><span className="etiqueta">{centro ? 'Millones el centro' : '€ por plaza'}</span>
                  <Numero valor={v.eurosPorPlaza} onCambiar={(eurosPorPlaza) => cambiar(t, { eurosPorPlaza })} escala={centro ? 1e6 : 1}
                    etiqueta={`${NOMBRE_OBRA[t]}: ${centro ? 'millones que cuesta' : 'euros por plaza'}`} />
                  {v.eurosPorPlaza !== cabida.eurosPorPlaza && (
                    <ValorTuyo texto={`${valorObra(t, cabida.eurosPorPlaza)} (mediana de ${n} ${n === 1 ? 'obra' : 'obras'})`} />
                  )}</label>
                <label className="control"><span className="etiqueta">Años de obra</span>
                  <Numero valor={v.anios} onCambiar={(anios) => cambiar(t, { anios: Math.round(anios) })} etiqueta={`${NOMBRE_OBRA[t]}: años de obra`} />
                  {v.anios !== cabida.anios && <ValorTuyo texto={`${cabida.anios} años`} />}</label>
              </div>
              <ObrasReferencia tipo={t} />
              <p className="plan-fuente">
                {FUENTES_PLAN[t].texto}
                {FUENTES_PLAN[t].enlaces.map((e, k) => (
                  <span key={e.url}>{k === 0 ? ' ' : '; '}<a href={e.url} target="_blank" rel="noreferrer">{e.texto}</a></span>
                ))}
                {FUENTES_PLAN[t].enlaces.length > 0 && '.'}
              </p>
            </div>
          )
        })}
        <div className="plan-param">
          <h3>Año de inicio de las obras</h3>
          <label className="control"><span className="etiqueta">Empiezan en</span>
            <Numero valor={parametros.anioInicio} onCambiar={(a) => onParametros({ ...parametros, anioInicio: Math.round(a) })} etiqueta="Año en que empiezan las obras" anio />
            {parametros.anioInicio !== PARAMETROS_PLAN.anioInicio && <ValorTuyo texto={String(PARAMETROS_PLAN.anioInicio)} />}</label>
          <p className="plan-fuente">{FUENTE_ANIO_INICIO}</p>
        </div>
      </div>
      <button className="desplegar" disabled={!cambiados} onClick={() => onParametros(PARAMETROS_PLAN)}>
        Volver a los valores de CABIDA<span className="flecha" aria-hidden="true">↺</span>
      </button>
    </details>
  )
}

/** Debajo de un campo que alguien ha cambiado: «Valor tuyo. El de CABIDA es …». */
function ValorTuyo({ texto }: { texto: string }) {
  return <small className="plan-tuyo">Valor tuyo. El de CABIDA es {texto}.</small>
}
