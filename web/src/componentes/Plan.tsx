// Pestaña «Plan» (#plan): qué hace falta construir para que quepa la gente.
// Para profesionales: una sola lista de obras que se rellena de tres maneras (plan óptimo, con un presupuesto o a mano),
// todo editable, con los valores por defecto de CABIDA y su fuente. Las cuentas las hace motor.ts.

import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import {
  PARAMETROS_PLAN, aperturaObra, calcularUmbrales, costeObra, escenarioDelPlan, evaluarPlan, nuevaObra, obraSugerida, planOptimo, resumenReubicacion,
} from '../motor'
import { FUENTES_PLAN, FUENTE_ANIO_INICIO, NOMBRE_OBRA, QUE_HACE_OBRA } from '../fuentesPlan'
import { LIMITES, TIPOS } from '../colores'
import { csvPlan, descargar } from '../descarga'
import { decimal, miles, millones } from '../formato'
import type { Escenario, Municipio, Obra, OpcionesPlan, ParametrosPlan, ResultadoPlan, TipoObra, ZonaSalud } from '../tipos'
import { Buscador } from './Buscador'

interface Props {
  municipios: Municipio[]
  zonas: ZonaSalud[]
  porIne: Map<string, Municipio>
  escenario: Escenario
  obras: Obra[]
  onObras: (obras: Obra[]) => void
  parametros: ParametrosPlan
  onParametros: (p: ParametrosPlan) => void
  opciones: OpcionesPlan // con qué se rellenó el último plan (para la comparación sin reubicar)
  onOpciones: (o: OpcionesPlan) => void
  onFicha: (ine: string) => void
  onVerEnMapa: () => void
}

const TIPOS_OBRA = Object.keys(NOMBRE_OBRA) as TipoObra[]
type Modo = 'presupuesto' | 'mano' | null

export function Plan({ municipios, zonas, porIne, escenario, obras, onObras, parametros, onParametros, opciones, onOpciones, onFicha, onVerEnMapa }: Props) {
  const [modo, setModo] = useState<Modo>(null)
  const esc = useMemo(() => escenarioDelPlan(escenario), [escenario])
  const delReto = useMemo(() => municipios.filter((m) => m.universo && m.capacidad).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')), [municipios])
  const umbrales = useMemo(() => calcularUmbrales(delReto, zonas, esc.exigencia), [delReto, zonas, esc.exigencia])

  const resultado = useMemo(() => evaluarPlan(municipios, zonas, esc, obras), [municipios, zonas, esc, obras])
  // «Cada pueblo con lo suyo»: el mismo plan óptimo, con las mismas opciones, sin reubicar
  const comparacion = useMemo(() => {
    const sinReubicar = { ...escenario, reequilibrio: false }
    return evaluarPlan(municipios, zonas, sinReubicar, planOptimo(municipios, zonas, sinReubicar, parametros, opciones))
  }, [municipios, zonas, escenario, parametros, opciones])

  const rellenar = (o: OpcionesPlan) => {
    onOpciones(o)
    onObras(planOptimo(municipios, zonas, esc, parametros, o))
  }
  const anadir = (ine: string) => {
    const r = resultado.resultados.find((x) => x.ine === ine)
    const m = porIne.get(ine)
    if (!r || !m) return
    onObras([...obras, nuevaObra(ine, obraSugerida(m, r, umbrales, obras, parametros), parametros)])
  }
  const cambiar = (i: number, parcial: Partial<Obra>) => onObras(obras.map((o, k) => (k === i ? { ...o, ...parcial } : o)))

  return (
    <div className="plan">
      <section className="val-cabeza">
        <h1>¿Qué hace falta para que quepan?</h1>
        <p>
          Hasta {escenario.anio} llegan {miles(escenario.personas)} personas. Aun reubicando en pueblos cercanos,{' '}
          <b>{miles(resultado.sinSitioAntes)}</b> se quedan sin sitio. Aquí se decide qué colegios y centros de salud construir, dónde y cuándo.
          El escenario se cambia en el <a href="#mapa">mapa</a>.
        </p>
      </section>

      <div className="plan-botones" role="group" aria-label="Rellenar la lista">
        <button className="plan-boton principal" onClick={() => { setModo(null); rellenar({}) }}>
          <b>Plan óptimo</b><span>Lo que haga falta, donde más gente cabe por cada euro</span>
        </button>
        <button className={`plan-boton${modo === 'presupuesto' ? ' activo' : ''}`} aria-expanded={modo === 'presupuesto'}
          onClick={() => setModo(modo === 'presupuesto' ? null : 'presupuesto')}>
          <b>Con este presupuesto</b><span>Lo reparte lo mejor posible</span>
        </button>
        <button className={`plan-boton${modo === 'mano' ? ' activo' : ''}`} aria-expanded={modo === 'mano'}
          onClick={() => setModo(modo === 'mano' ? null : 'mano')}>
          <b>Añadir a mano</b><span>Una obra en el municipio que elijas</span>
        </button>
      </div>
      {modo === 'presupuesto' && <Presupuesto delReto={delReto} porIne={porIne} opciones={opciones} onRepartir={rellenar} />}
      {modo === 'mano' && (
        <div className="plan-panel">
          <p className="ayuda">Elige un municipio: se añade la obra que suelta su límite, y en la lista puedes cambiarla.</p>
          <Buscador municipios={delReto} onElegir={anadir} texto="Añadir municipio" />
        </div>
      )}

      <div className="plan-cuerpo">
        <div className="plan-izquierda">
          <Lista obras={obras} resultado={resultado} porIne={porIne} parametros={parametros} horizonte={escenario.anio}
            onCambiar={cambiar} onBorrar={(i) => onObras(obras.filter((_, k) => k !== i))} onFicha={onFicha} />
          <Parametros parametros={parametros} onParametros={onParametros} />
        </div>

        <aside className="plan-derecha" aria-label="Resultado del plan">
          <Resumen r={resultado} comparacion={comparacion} hayObras={obras.length > 0} />
          <div className="plan-acciones">
            <button className="plan-boton principal" disabled={!obras.length} onClick={onVerEnMapa}>
              <b>Ver en el mapa</b><span>Con la lista y la reubicación en el simulador</span>
            </button>
            <button className="desplegar" disabled={!obras.length}
              onClick={() => descargar(`cabida_plan_${escenario.anio}.csv`, csvPlan(obras, resultado.ganaPorObra, porIne))}>
              Descargar CSV del plan<span className="flecha" aria-hidden="true">↓</span>
            </button>
          </div>
          <Calendario r={resultado} desde={obras.length ? Math.min(...obras.map((o) => o.inicio)) : parametros.anioInicio} />
          <ComoSeConsigue r={resultado} radioKm={esc.radioKm} />
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
    <form className="plan-panel" onSubmit={(e) => {
      e.preventDefault()
      if (!valido) return
      onRepartir({ presupuestoTotal: totalM * 1e6, presupuestoAnual: anualM > 0 ? anualM * 1e6 : undefined, soloMunicipios: solo.length ? solo : undefined })
    }}>
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
      <button className="plan-boton principal" type="submit" disabled={!valido}><b>Repartir</b></button>
    </form>
  )
}

function Lista({ obras, resultado, porIne, parametros, horizonte, onCambiar, onBorrar, onFicha }: {
  obras: Obra[]; resultado: ResultadoPlan; porIne: Map<string, Municipio>; parametros: ParametrosPlan; horizonte: number
  onCambiar: (i: number, parcial: Partial<Obra>) => void; onBorrar: (i: number) => void; onFicha: (ine: string) => void
}) {
  const limitante = new Map(resultado.resultados.map((r) => [r.ine, r.limitante]))
  return (
    <section className="val-tarjeta">
      <h2>Obras del plan</h2>
      {obras.length === 0 ? (
        <p className="vacio">La lista está vacía. Pulsa «Plan óptimo» para rellenarla, o añade obras con los otros dos botones.</p>
      ) : (
        <div className="tabla-scroll">
          <table className="plan-tabla">
            <thead>
              <tr><th>Municipio</th><th>Obra</th><th className="num">Plazas</th><th className="num">€ por plaza</th>
                <th className="num">Años</th><th className="num">Coste</th><th className="num">Abre</th><th className="num">Caben más</th><th aria-label="Borrar" /></tr>
            </thead>
            <tbody>
              {obras.map((o, i) => {
                const centro = o.tipo === 'centro_salud'
                const gana = resultado.ganaPorObra[i] ?? 0
                const nombre = porIne.get(o.ine)?.nombre ?? o.ine
                return (
                  <tr key={i}>
                    <td><button className="enlace" onClick={() => onFicha(o.ine)} title="Ver su ficha en el mapa">{nombre}</button></td>
                    <td>
                      <select value={o.tipo} aria-label={`Obra en ${nombre}`}
                        onChange={(e) => { const tipo = e.target.value as TipoObra; onCambiar(i, { tipo, ...parametros.obras[tipo] }) }}>
                        {TIPOS_OBRA.map((t) => <option key={t} value={t}>{NOMBRE_OBRA[t]}</option>)}
                      </select>
                    </td>
                    <td className="num"><Numero valor={o.plazas} onCambiar={(plazas) => onCambiar(i, { plazas })}
                      etiqueta={centro ? `Personas que atiende el centro de ${nombre}` : `Plazas en ${nombre}`} sufijo={centro ? 'pers.' : undefined} /></td>
                    <td className="num"><Numero valor={o.eurosPorPlaza} onCambiar={(eurosPorPlaza) => onCambiar(i, { eurosPorPlaza })}
                      escala={centro ? 1e6 : 1} sufijo={centro ? 'M€' : undefined}
                      etiqueta={centro ? `Millones que cuesta el centro de ${nombre}` : `Euros por plaza en ${nombre}`} /></td>
                    <td className="num"><Numero valor={o.anios} onCambiar={(anios) => onCambiar(i, { anios: Math.round(anios) })} etiqueta={`Años de obra en ${nombre}`} corto /></td>
                    <td className="num">{millones(costeObra(o))}</td>
                    <td className={`num${aperturaObra(o) > horizonte ? ' plan-tarde' : ''}`}
                      title={aperturaObra(o) > horizonte ? `Abre después de ${horizonte}` : undefined}>{aperturaObra(o)}</td>
                    <td className="num">
                      {gana >= 1 ? miles(gana) : <span className="plan-cero" title={`Aquí manda ${LIMITES[limitante.get(o.ine) ?? 'vivienda'].nombre.toLowerCase()}`}>0</span>}
                    </td>
                    <td><button className="plan-borrar" onClick={() => onBorrar(i)} aria-label={`Borrar la obra de ${nombre}`} title="Borrar">×</button></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      {obras.length > 0 && (
        <p className="ayuda plan-pie">«Caben más»: personas más de las que le llegan que caben en el municipio con esa obra. Pulsa un municipio para ver su ficha.</p>
      )}
    </section>
  )
}

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

function Resumen({ r, comparacion, hayObras }: { r: ResultadoPlan; comparacion: ResultadoPlan; hayObras: boolean }) {
  const colegios = r.obras.ampliar_primaria + r.obras.colegio_primaria + r.obras.instituto
  const otros = r.sinSitioPor.colegios + r.sinSitioPor.sanidad
  const motivos = [
    r.sinSitioPor.vivienda >= 1 && `${miles(r.sinSitioPor.vivienda)} por falta de vivienda`,
    r.sinSitioPor.ritmo >= 1 && `${miles(r.sinSitioPor.ritmo)} porque su pueblo crecería demasiado deprisa`,
    otros >= 1 && `${miles(otros)} por colegios o sanidad, que necesitan más obras`,
  ].filter((x): x is string => !!x)
  const colegiosComp = comparacion.obras.ampliar_primaria + comparacion.obras.colegio_primaria + comparacion.obras.instituto
  return (
    <section className="val-tarjeta plan-resumen" aria-live="polite">
      <h2>Lo que consigue</h2>
      {hayObras ? (
      <div className="plan-cifras">
        <Dato valor={millones(r.coste)} texto={`en ${r.municipios} ${r.municipios === 1 ? 'municipio' : 'municipios'}`} />
        <Dato valor={`${colegios} + ${r.obras.centro_salud}`}
          texto={`colegios e institutos (${detalleColegios(r)}) y centros de salud`} />
        <Dato valor={miles(r.pasanACaber)} texto="personas más caben" acento={TIPOS.polo.color} />
        <Dato valor={r.ultimaApertura ? String(r.ultimaApertura) : '—'} texto="abre lo último" />
      </div>
      ) : <p className="vacio">Todavía no hay obras en el plan.</p>}
      <p className="plan-quedan">
        {hayObras ? 'Siguen' : 'Se quedan'} sin sitio <b>{miles(r.sinSitio)}</b>
        {motivos.length > 0 && <>: {motivos.length > 1 ? `${motivos.slice(0, -1).join(', ')} y ${motivos[motivos.length - 1]}` : motivos[0]}</>}.
        {(r.sinSitioPor.vivienda >= 1 || r.sinSitioPor.ritmo >= 1) && ' La vivienda y el ritmo no se arreglan con colegios ni centros de salud.'}
      </p>
      <p className="plan-comparacion">
        <b>Cada pueblo con lo suyo.</b> Sin reubicar en pueblos cercanos, el mismo cálculo pide {colegiosComp} colegios e institutos
        y {comparacion.obras.centro_salud} centros de salud, <b>{millones(comparacion.coste)}</b>, y aun así siguen sin sitio{' '}
        <b>{miles(comparacion.sinSitio)}</b>.
      </p>
    </section>
  )
}

function detalleColegios(r: ResultadoPlan): string {
  const partes = [
    [r.obras.ampliar_primaria, 'ampliación', 'ampliaciones'],
    [r.obras.colegio_primaria, 'colegio nuevo', 'colegios nuevos'],
    [r.obras.instituto, 'instituto', 'institutos'],
  ] as const
  const texto = partes.filter(([n]) => n > 0).map(([n, uno, varios]) => `${n} ${n === 1 ? uno : varios}`)
  return texto.length ? texto.join(', ') : 'ninguno'
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

function ComoSeConsigue({ r, radioKm }: { r: ResultadoPlan; radioKm: number }) {
  const re = resumenReubicacion(r.resultados)
  return (
    <section className="plan-como">
      <h2>Cómo se consigue</h2>
      <ul>
        <li>Nadie se muda lejos: {decimal(re.kmMedio)} km de media en línea recta, y nunca a más de {radioKm} km de su pueblo.</li>
        <li>La Administración decide dónde se construye vivienda.</li>
        <li>Sin esa vivienda en los pueblos con sitio, la reubicación no ocurre.</li>
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
          const centro = t === 'centro_salud'
          return (
            <div key={t} className="plan-param">
              <h3>{NOMBRE_OBRA[t]}</h3>
              <p className="ayuda">{QUE_HACE_OBRA[t]}</p>
              <div className="plan-campos">
                <label className="control"><span className="etiqueta">{centro ? 'Personas que atiende' : 'Plazas'}</span>
                  <Numero valor={v.plazas} onCambiar={(plazas) => cambiar(t, { plazas })} etiqueta={`${NOMBRE_OBRA[t]}: ${centro ? 'personas que atiende' : 'plazas'}`} /></label>
                <label className="control"><span className="etiqueta">{centro ? 'Millones el centro' : '€ por plaza'}</span>
                  <Numero valor={v.eurosPorPlaza} onCambiar={(eurosPorPlaza) => cambiar(t, { eurosPorPlaza })} escala={centro ? 1e6 : 1}
                    etiqueta={`${NOMBRE_OBRA[t]}: ${centro ? 'millones que cuesta' : 'euros por plaza'}`} /></label>
                <label className="control"><span className="etiqueta">Años de obra</span>
                  <Numero valor={v.anios} onCambiar={(anios) => cambiar(t, { anios: Math.round(anios) })} etiqueta={`${NOMBRE_OBRA[t]}: años de obra`} /></label>
              </div>
              <p className="plan-fuente">
                {FUENTES_PLAN[t].texto}{' '}
                {FUENTES_PLAN[t].enlaces.map((e, k) => (
                  <span key={e.url}>{k > 0 && '; '}<a href={e.url} target="_blank" rel="noreferrer">{e.texto}</a></span>
                ))}.
              </p>
            </div>
          )
        })}
        <div className="plan-param">
          <h3>Año de inicio de las obras</h3>
          <label className="control"><span className="etiqueta">Empiezan en</span>
            <Numero valor={parametros.anioInicio} onCambiar={(a) => onParametros({ ...parametros, anioInicio: Math.round(a) })} etiqueta="Año en que empiezan las obras" anio /></label>
          <p className="plan-fuente">{FUENTE_ANIO_INICIO}</p>
        </div>
      </div>
      <button className="desplegar" disabled={!cambiados} onClick={() => onParametros(PARAMETROS_PLAN)}>
        Volver a los valores de CABIDA<span className="flecha" aria-hidden="true">↺</span>
      </button>
    </details>
  )
}
