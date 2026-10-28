// Pestaña «Atraer» (#atraer), para la institución: la palanca de la demanda (la de la oferta, construir, es «Plan»).
// Si se pudiera orientar a dónde va la gente que llega (campañas, ayudas al alquiler, teletrabajo rural), ¿a qué pueblos
// conviene atraer a cada tipo de vecino? Reparte a los que prevé el modelo según quiénes son y dónde se les quiere
// llevar (reparto.ts) y enseña dónde promocionar a cada grupo. Cuenta las obras del plan, pero no las cambia.

import { useMemo, useState } from 'react'
import { LIMITES } from '../colores'
import { FILTROS_INICIALES, PERFILES, TAMANOS } from '../mudanza'
import { CORTO, FILTROS_REPARTO, MEZCLA_SUPUESTA, ORDEN_REPARTO, aplicarMezcla, cabenSinDirigir, hueco, llegadasPorPerfil, repartir } from '../reparto'
import type { Escenario, FiltrosReparto, LecturaFrase, Limite, Municipio, Obra, Perfil, ResultadoMunicipio, Tamano } from '../tipos'
import { miles, millones } from '../formato'
import { csvAtraer, descargar } from '../descarga'
import { costeObra } from '../motor'
import { MEDIDAS, umbralHospital } from '../medida'
import { Asistente } from './Asistente'
import { Icono } from './Iconos'
import { GruposPromocion, SinNadie } from './Promocionar'

const MAX_FILAS = 10

const EJEMPLOS = [
  'Llegan un 30 % de familias y un 50 % de jubilados',
  '¿Dónde atraemos a los jubilados en el sur?',
  'Atraed a las familias a municipios pequeños',
]

interface Props {
  resultados: ResultadoMunicipio[] // con las obras del plan
  resultadosSinPlan: ResultadoMunicipio[]
  porIne: Map<string, Municipio>
  escenario: Escenario
  mezcla: Record<Perfil, number>
  onMezcla: (m: Record<Perfil, number>) => void
  filtros: FiltrosReparto
  onFiltros: (f: FiltrosReparto) => void
  obras: Obra[] // el plan de la pestaña «Plan»: aquí solo se cuenta
  onIrAlPlan: () => void
  onVerEnMapa: (ine: string) => void
}

/** Plural sencillo: 1 obra, 2 obras. */
const cuantos = (n: number, uno: string, varios: string) => `${miles(n)} ${n === 1 ? uno : varios}`

export function Atraer({ resultados, resultadosSinPlan, porIne, escenario, mezcla, onMezcla, filtros, onFiltros,
  obras, onIrAlPlan, onVerEnMapa }: Props) {
  const [todos, setTodos] = useState(false)
  const llegan = useMemo(() => llegadasPorPerfil(escenario.personas, mezcla), [escenario.personas, mezcla])
  const medida = escenario.medida
  const reparto = useMemo(() => repartir(resultados, porIne, llegan, filtros, medida), [resultados, porIne, llegan, medida, filtros])
  const hayPlan = obras.length > 0
  const repartoSinPlan = useMemo(() => (hayPlan ? repartir(resultadosSinPlan, porIne, llegan, filtros, medida) : reparto),
    [hayPlan, resultadosSinPlan, porIne, llegan, medida, filtros, reparto])
  const sinDirigir = useMemo(() => cabenSinDirigir(resultados), [resultados])
  const porIneRes = useMemo(() => new Map(resultados.map((r) => [r.ine, r])), [resultados])
  const zonas = useMemo(() => [...new Set(resultados.map((r) => porIne.get(r.ine)!.zona))].sort((a, b) => a.localeCompare(b, 'es')),
    [resultados, porIne])
  const coste = obras.reduce((s, o) => s + costeObra(o), 0)
  const sumaMezcla = ORDEN_REPARTO.reduce((s, p) => s + mezcla[p], 0)
  const sinSitio = ORDEN_REPARTO.reduce((s, p) => s + reparto.sinSitio[p], 0)
  const filas = todos ? reparto.pueblos : reparto.pueblos.slice(0, MAX_FILAS)
  const cambiar = (cambio: Partial<FiltrosReparto>) => onFiltros({ ...filtros, ...cambio })
  const hayCambios = filtros !== FILTROS_REPARTO || mezcla !== MEZCLA_SUPUESTA

  // Una frase: dónde (zona, tamaño, hospital, instituto) y, si dice a quién atraer, solo a ese grupo
  // Si da porcentajes («30 % familias»), se ponen y el resto se reparte entre los demás como estaba
  const alLeer = (l: LecturaFrase) => {
    onFiltros({ zona: l.filtros.zona, tamano: l.filtros.tamano, hospitalCerca: l.filtros.hospitalCerca, instituto: l.filtros.instituto })
    if (l.mezcla) onMezcla(aplicarMezcla(mezcla, l.mezcla))
    else if (l.perfilDicho) onMezcla({ familia: 0, mayor: 0, teletrabajo: 0, [l.filtros.perfil]: 100 })
  }
  // Lo que hay puesto, en una línea, para verlo sin abrir los ajustes
  const resumenAjustes = [
    ORDEN_REPARTO.map((p) => `${miles(mezcla[p])} % ${CORTO[p]}`).join(', '),
    filtros.zona ?? 'cualquier zona',
    filtros.tamano !== 'todos' ? TAMANOS[filtros.tamano].nombre.toLowerCase() : '',
    filtros.hospitalCerca ? 'todos con hospital cerca' : '',
    filtros.instituto ? 'familias con instituto' : '',
  ].filter(Boolean).join(' · ')

  return (
    <div className="mudanza">
      <section className="val-cabeza">
        <button className="volver atraer-volver" onClick={onIrAlPlan}><Icono nombre="volver" tamano={18} /> Volver al Plan</button>
        <h1>¿Dónde conviene atraer a cada uno?</h1>
        <p>
          Hasta {escenario.anio} llegan {miles(escenario.personas)} personas a los 155 municipios, y muchas irán donde ya no caben.
          Si se pudiera orientar a dónde va cada uno (con campañas, ayudas al alquiler o teletrabajo rural), ¿a qué municipios
          convendría atraer a las familias, a las personas mayores y a quien teletrabaja? Construir es la otra palanca: está
          en <button className="enlace" onClick={onIrAlPlan}>Plan</button>.
        </p>
      </section>

      <section className="val-tarjeta filtros simulador">
        <Asistente porIne={porIne} actual={FILTROS_INICIALES} medida={medida} ejemplos={EJEMPLOS} boton="Calcular"
          noEntendido="Prueba a decir a quién queréis atraer (familias, jubilados, teletrabajo), una zona o un municipio, o si debe ser a municipios pequeños o con hospital cerca."
          onLectura={alLeer} />

        <details className="atraer-ajustes">
        <summary>
          <b>Ajustar: quiénes llegan y dónde</b>
          <span className="ayuda">{resumenAjustes}</span>
        </summary>
        <h2>¿Quiénes llegan? (en %)</h2>
        <div className="sim-entradas">
          {ORDEN_REPARTO.map((p) => (
            <label key={p} className="control">
              <span className="etiqueta">{PERFILES[p].nombre} <b>{miles(llegan[p])}</b></span>
              <input type="number" min={0} max={100} step={5} inputMode="numeric" value={mezcla[p]}
                onChange={(e) => onMezcla({ ...mezcla, [p]: Math.min(100, Math.max(0, Number(e.target.value) || 0)) })} />
            </label>
          ))}
        </div>
        <p className="ayuda">
          {sumaMezcla === 0 ? 'Todos los grupos están a 0 %: pon el porcentaje de alguno para repartir.'
            : sumaMezcla === 100 ? 'Es un supuesto: no hay un dato público de quién llega. Cámbialo para ver otros repartos.'
            : `Suman ${miles(sumaMezcla)} %: repartimos en esa proporción, como si sumaran 100 %.`}
        </p>

        <h2>¿Dónde queréis atraerlos?</h2>
        <div className="casillas">
          <Casilla texto={`Todos con hospital a menos de ${umbralHospital(medida)}${medida === 'min' ? ' en coche' : ''}`} valor={filtros.hospitalCerca}
            onCambiar={(hospitalCerca) => cambiar({ hospitalCerca })} />
          <Casilla texto="Familias: solo municipios con instituto" valor={filtros.instituto} onCambiar={(instituto) => cambiar({ instituto })} />
        </div>
        <div className="filtros-fila">
          <label className="control">
            <span className="etiqueta">Zona</span>
            <select value={filtros.zona ?? ''} onChange={(e) => cambiar({ zona: e.target.value || null })}>
              <option value="">Cualquier zona</option>
              {zonas.map((z) => <option key={z} value={z}>{z}</option>)}
            </select>
          </label>
          <div className="control">
            <span className="etiqueta">Tamaño</span>
            <div className="segmentos ancho" role="radiogroup" aria-label="Tamaño del municipio">
              {(Object.keys(TAMANOS) as Tamano[]).map((t) => (
                <button key={t} role="radio" aria-checked={filtros.tamano === t} className={filtros.tamano === t ? 'activo' : ''}
                  onClick={() => cambiar({ tamano: t })}>{TAMANOS[t].nombre}</button>
              ))}
            </div>
          </div>
        </div>
        {hayCambios && (
          <button className="enlace sim-reiniciar" onClick={() => { onFiltros(FILTROS_REPARTO); onMezcla(MEZCLA_SUPUESTA) }}>
            Volver a empezar
          </button>
        )}
        </details>
      </section>

      <section className="val-tarjeta simulador">
        {sumaMezcla === 0 ? (
          <SinNadie onVolver={() => onMezcla(MEZCLA_SUPUESTA)} />
        ) : (<>
          <div className="sim-resumen">
            <div><b>{miles(reparto.colocados)}</b><span>caben si se atrae a cada uno a su sitio, en {miles(reparto.pueblos.length)} municipios</span></div>
            <div className={sinSitio > 0 ? 'sim-falta' : ''}><b>{miles(sinSitio)}</b><span>se quedan sin sitio aun así</span></div>
            <div><b>{miles(sinDirigir)}</b><span>caben si cada uno va donde le lleva la tendencia (el mapa)</span></div>
          </div>
          {sinSitio > 0 && (
            <p className="ayuda">
              Sin sitio: {ORDEN_REPARTO.filter((p) => reparto.sinSitio[p] > 0)
                .map((p) => `${miles(reparto.sinSitio[p])} de «${PERFILES[p].nombre}»`).join(', ')}.
              {' '}Para ellos hace falta construir: <button className="enlace" onClick={onIrAlPlan}>ver el Plan</button>.
            </p>
          )}
          {hayPlan && (
            <p className="sim-inversion">
              <b>Con el plan</b> ({cuantos(obras.length, 'obra', 'obras')}, unos {millones(coste)}) caben{' '}
              <b>{miles(reparto.colocados - repartoSinPlan.colocados)} personas más</b> que sin él
              ({miles(repartoSinPlan.colocados)} → {miles(reparto.colocados)}). Las obras se cambian en{' '}
              <button className="enlace" onClick={onIrAlPlan}>Plan</button>.
            </p>
          )}

          <h2>Dónde promocionar a cada grupo</h2>
          <GruposPromocion reparto={reparto} llegan={llegan} resultados={resultados} porIne={porIne} medida={medida}
            onVerEnMapa={onVerEnMapa} />

          <button className="desplegar atraer-descarga" disabled={!reparto.pueblos.length}
            onClick={() => descargar(`cabida_atraer_${escenario.anio}.csv`, csvAtraer(reparto, resultados, porIne, mezcla, filtros))}>
            Descargar CSV de los municipios a promocionar<span className="flecha" aria-hidden="true">↓</span>
          </button>

          <details className="atraer-detalle">
          <summary><b>Ver municipio a municipio</b> <span className="ayuda">({miles(reparto.pueblos.length)} municipios)</span></summary>
          <p className="ayuda">
            Cuántos de cada grupo convendría atraer a cada municipio, de lo que le cabe. «Lo llena» es lo primero que se le acaba:
            si son los colegios o el centro de salud, se puede ampliar en <button className="enlace" onClick={onIrAlPlan}>Plan</button>.
          </p>
          {reparto.pueblos.length === 0 ? (
            <p className="vacio">No hay ningún municipio con sitio que cumpla lo que pides. Prueba a quitar algún filtro.</p>
          ) : (
            <div className="tabla-scroll">
              <table className="sim-tabla">
                <thead>
                  <tr>
                    <th>Municipio</th>
                    {ORDEN_REPARTO.map((p) => <th key={p} className="num">{PERFILES[p].nombre}</th>)}
                    <th className="num">Recibe</th>
                    <th>Lo llena</th>
                  </tr>
                </thead>
                <tbody>
                  {filas.map((f) => (
                    <tr key={f.ine}>
                      <td><button className="enlace" onClick={() => onVerEnMapa(f.ine)}>{porIne.get(f.ine)!.nombre}</button></td>
                      {ORDEN_REPARTO.map((p) => <td key={p} className="num">{f.porPerfil[p] ? miles(f.porPerfil[p]) : '—'}</td>)}
                      <td className="num"><b>{miles(f.total)}</b><span className="sim-de"> de {miles(hueco(porIneRes.get(f.ine)!, 'mayor'))}</span></td>
                      <td>{f.llenoPor ? <LoLlena limite={f.llenoPor} /> : <span className="sim-de">queda sitio</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {reparto.pueblos.length > MAX_FILAS && (
            <button className="enlace" onClick={() => setTodos(!todos)}>
              {todos ? `Ver solo los ${MAX_FILAS} primeros` : `Ver los ${miles(reparto.pueblos.length)} municipios`}
            </button>
          )}
          </details>

          <p className="nota">
            Cada grupo va primero a los municipios que mejor le encajan (colegios con sitio para las familias, centro de salud para las
            personas mayores, casas para quien teletrabaja); las familias solo a municipios con colegio y las personas mayores, con el
            hospital a menos de {umbralHospital(medida)} {MEDIDAS[medida].como}. Los tres grupos eligen por turnos y a la par, cada uno en proporción a cuántos
            son, y cada municipio recibe hasta llenarse. Las familias ocupan sitio en colegios, centro de salud y vivienda; las personas
            mayores y quien teletrabaja, en todo menos en colegios. Es una simulación: en la realidad cada uno elige dónde vive.
          </p>
        </>)}
      </section>
    </div>
  )
}

function Casilla({ texto, valor, onCambiar }: { texto: string; valor: boolean; onCambiar: (v: boolean) => void }) {
  return (
    <label className="casilla">
      <input type="checkbox" checked={valor} onChange={(e) => onCambiar(e.target.checked)} /> {texto}
    </label>
  )
}

function LoLlena({ limite }: { limite: Limite }) {
  return <span className="sim-llena"><Icono nombre={limite} tamano={15} />{LIMITES[limite].nombre}</span>
}
