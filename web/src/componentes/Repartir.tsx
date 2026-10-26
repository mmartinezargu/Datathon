// Pestaña «Repartir» (#repartir), pensada para la institución: coge la gente que el modelo prevé que llega,
// la divide por perfiles (familias, personas mayores, teletrabajo) y la reparte entre los pueblos según
// quiénes son y dónde se la quiere llevar (reparto.ts). Se puede pedir con una frase (IA o palabras clave)
// o con los filtros, y añadir obras al plan (pestaña «Plan») donde se llenan por colegios o sanidad. Se recalcula al momento.

import { useMemo, useState } from 'react'
import { LIMITES } from '../colores'
import { FILTROS_INICIALES, PERFILES, TAMANOS } from '../mudanza'
import { FILTROS_REPARTO, MEZCLA_SUPUESTA, ORDEN_REPARTO, cabenSinDirigir, hueco, llegadasPorPerfil, repartir } from '../reparto'
import type { Escenario, FiltrosReparto, LecturaFrase, Municipio, Obra, ParametrosPlan, Perfil, ResultadoMunicipio, Tamano, Umbrales } from '../tipos'
import { miles, millones } from '../formato'
import { costeObra, nuevaObra, obraSugerida } from '../motor'
import { MEDIDAS, umbralHospital } from '../medida'
import { NOMBRE_OBRA } from '../fuentesPlan'
import { Asistente } from './Asistente'
import { Icono } from './Iconos'

const MAX_FILAS = 10

const EJEMPLOS = [
  'Llevadlos a pueblos pequeños con hospital cerca',
  'Repartid solo en la Sierra Norte',
  'Familias con hijos de instituto, cerca de Getafe',
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
  obras: Obra[] // el mismo plan de la pestaña «Plan» y del mapa
  onObras: (o: Obra[]) => void
  umbrales: Umbrales
  parametros: ParametrosPlan
  onIrAlPlan: () => void
  onVerEnMapa: (ine: string) => void
}

/** Plural sencillo: 1 colegio, 2 colegios. */
const cuantos = (n: number, uno: string, varios: string) => `${miles(n)} ${n === 1 ? uno : varios}`

export function Repartir({ resultados, resultadosSinPlan, porIne, escenario, mezcla, onMezcla, filtros, onFiltros,
  obras, onObras, umbrales, parametros, onIrAlPlan, onVerEnMapa }: Props) {
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

  // Una frase: dónde (zona, tamaño, hospital, instituto) y, si dice quiénes llegan, solo ese grupo
  const alLeer = (l: LecturaFrase) => {
    onFiltros({ zona: l.filtros.zona, tamano: l.filtros.tamano, hospitalCerca: l.filtros.hospitalCerca, instituto: l.filtros.instituto })
    if (l.perfilDicho) onMezcla({ familia: 0, mayor: 0, teletrabajo: 0, [l.filtros.perfil]: 100 })
  }

  return (
    <div className="mudanza">
      <section className="val-cabeza">
        <h1>Repartir a los que llegan</h1>
        <p>
          Según el modelo, hasta {escenario.anio} llegan {miles(escenario.personas)} personas a los 155 pueblos. Aquí las repartimos
          según quiénes son y dónde queréis llevarlas, como si se pudiera elegir a dónde va cada uno: cada grupo va a los pueblos
          que mejor le encajan, cada pueblo recibe hasta llenarse y el resto pasa al siguiente.
        </p>
      </section>

      <section className="val-tarjeta filtros simulador">
        <Asistente porIne={porIne} actual={FILTROS_INICIALES} medida={medida} ejemplos={EJEMPLOS} boton="Repartir"
          noEntendido="Prueba a decir quiénes llegan (familias, jubilados, teletrabajo), una zona o un municipio, o si deben ir a pueblos pequeños o con hospital cerca."
          onLectura={alLeer} />

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
          {sumaMezcla === 100
            ? 'Es un supuesto: no hay un dato público de quién llega. Cámbialo para ver otros repartos.'
            : `Suman ${miles(sumaMezcla)} %: repartimos en esa proporción, como si sumaran 100 %.`}
        </p>

        <h2>¿Dónde?</h2>
        <div className="casillas">
          <Casilla texto={`Todos con hospital a menos de ${umbralHospital(medida)}${medida === 'min' ? ' en coche' : ''}`} valor={filtros.hospitalCerca}
            onCambiar={(hospitalCerca) => cambiar({ hospitalCerca })} />
          <Casilla texto="Familias: solo pueblos con instituto" valor={filtros.instituto} onCambiar={(instituto) => cambiar({ instituto })} />
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
      </section>

      <section className="val-tarjeta simulador">
        <div className="sim-resumen">
          <div><b>{miles(reparto.colocados)}</b><span>caben repartiéndolos, en {miles(reparto.pueblos.length)} pueblos</span></div>
          <div className={sinSitio > 0 ? 'sim-falta' : ''}><b>{miles(sinSitio)}</b><span>se quedan sin sitio</span></div>
          <div><b>{miles(sinDirigir)}</b><span>caben si cada uno va donde le lleva la tendencia (el mapa)</span></div>
        </div>
        {sinSitio > 0 && (
          <p className="ayuda">
            Sin sitio: {ORDEN_REPARTO.filter((p) => reparto.sinSitio[p] > 0)
              .map((p) => `${miles(reparto.sinSitio[p])} de «${PERFILES[p].nombre}»`).join(', ')}.
          </p>
        )}

        {hayPlan && (
          <p className="sim-inversion">
            <b>Con el plan</b> ({cuantos(obras.length, 'obra', 'obras')}, unos {millones(coste)}) caben{' '}
            <b>{miles(reparto.colocados - repartoSinPlan.colocados)} personas más</b> que sin él
            ({miles(repartoSinPlan.colocados)} → {miles(reparto.colocados)}). Es el mismo plan de la pestaña{' '}
            <button className="enlace" onClick={onIrAlPlan}>Plan</button>, con sus costes y plazos.
          </p>
        )}

        <h2>Pueblo a pueblo</h2>
        <p className="ayuda">
          «Lo llena» es lo primero que se acaba en ese pueblo. Si son los colegios o el centro de salud, puedes añadir al plan la
          obra que más ayuda ahí (ampliar un colegio, uno nuevo, un instituto o un centro de salud) y ver cuántos más caben.
        </p>
        {reparto.pueblos.length === 0 ? (
          <p className="vacio">No hay ningún pueblo con sitio que cumpla lo que pides. Prueba a quitar algún filtro.</p>
        ) : (
          <div className="tabla-scroll">
            <table className="sim-tabla">
              <thead>
                <tr>
                  <th>Pueblo</th>
                  {ORDEN_REPARTO.map((p) => <th key={p} className="num">{PERFILES[p].nombre}</th>)}
                  <th className="num">Recibe</th>
                  <th>Lo llena</th>
                  <th>Invertir</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((f) => (
                  <tr key={f.ine}>
                    <td><button className="enlace" onClick={() => onVerEnMapa(f.ine)}>{porIne.get(f.ine)!.nombre}</button></td>
                    {ORDEN_REPARTO.map((p) => <td key={p} className="num">{f.porPerfil[p] ? miles(f.porPerfil[p]) : '—'}</td>)}
                    <td className="num"><b>{miles(f.total)}</b><span className="sim-de"> de {miles(hueco(porIneRes.get(f.ine)!))}</span></td>
                    <td>{f.lleno ? <LoLlena r={porIneRes.get(f.ine)!} /> : <span className="sim-de">queda sitio</span>}</td>
                    <td><Obras r={porIneRes.get(f.ine)!} m={porIne.get(f.ine)!} lleno={f.lleno} obras={obras} onObras={onObras}
                      umbrales={umbrales} parametros={parametros} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {reparto.pueblos.length > MAX_FILAS && (
          <button className="enlace" onClick={() => setTodos(!todos)}>
            {todos ? `Ver solo los ${MAX_FILAS} primeros` : `Ver los ${miles(reparto.pueblos.length)} pueblos`}
          </button>
        )}

        <p className="nota">
          Los tres grupos eligen por turnos y a la par, cada uno en proporción a cuántos son: si no hay sitio para todos, falta para todos. Cada grupo va primero a
          los pueblos que mejor le encajan (colegios para las familias, centro de salud para las personas mayores, casas para
          quien teletrabaja); las familias solo a pueblos con colegio y las personas mayores, con el hospital a menos
          de {umbralHospital(medida)} {MEDIDAS[medida].como}. Como en el resto del modelo, cada persona ocupa sitio en colegios, centro de salud y vivienda
          a la vez. Es una simulación: en la realidad cada uno elige dónde vive.
        </p>
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

function LoLlena({ r }: { r: ResultadoMunicipio }) {
  return <span className="sim-llena"><Icono nombre={r.limitante} tamano={15} />{LIMITES[r.limitante].nombre}</span>
}

/** Las obras del plan en este pueblo (con ✕ para quitarlas) y, si lo llenan colegios o sanidad, la que más ayudaría. */
function Obras({ r, m, lleno, obras, onObras, umbrales, parametros }: {
  r: ResultadoMunicipio; m: Municipio; lleno: boolean; obras: Obra[]; onObras: (o: Obra[]) => void; umbrales: Umbrales; parametros: ParametrosPlan
}) {
  const puede = lleno && (r.limitante === 'colegios' || r.limitante === 'sanidad')
  const sugerida = puede ? obraSugerida(m, r, umbrales, obras, parametros) : null
  return (
    <span className="sim-invertir">
      {obras.map((o, i) => (o.ine === r.ine && (
        <button key={i} className="sim-hecho" title="Quitar del plan" onClick={() => onObras(obras.filter((_, j) => j !== i))}>
          {NOMBRE_OBRA[o.tipo]} ✕
        </button>
      )))}
      {sugerida && (
        <button className="sim-mas" title={`Añadir al plan: ${NOMBRE_OBRA[sugerida]}, unos ${millones(costeObra(nuevaObra(r.ine, sugerida, parametros)))}`}
          onClick={() => onObras([...obras, nuevaObra(r.ine, sugerida, parametros)])}>+ {NOMBRE_OBRA[sugerida]}</button>
      )}
    </span>
  )
}
