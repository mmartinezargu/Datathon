// Pestaña «Repartir» (#repartir), pensada para la institución: coge la gente que el modelo prevé que llega,
// la divide por perfiles (familias, personas mayores, teletrabajo) y la reparte entre los pueblos según
// quiénes son y dónde se la quiere llevar (reparto.ts). Se puede pedir con una frase (IA o palabras clave)
// o con los filtros, y ampliar colegios o centros de salud donde se llenan. Se recalcula al momento.

import { useMemo, useState } from 'react'
import { LIMITES } from '../colores'
import { FILTROS_INICIALES, PERFILES, TAMANOS } from '../mudanza'
import { FILTROS_REPARTO, MEZCLA_SUPUESTA, ORDEN_REPARTO, cabenSinDirigir, hueco, llegadasPorPerfil, repartir } from '../reparto'
import type { Escenario, FiltrosReparto, Inversion, Inversiones, LecturaFrase, Municipio, Perfil, ResultadoMunicipio, Tamano } from '../tipos'
import { miles, millones } from '../formato'
import { COSTE_CENTRO_SALUD, COSTE_COLEGIO, HOSPITAL_LEJOS_KM, SIN_INVERSION, costeInversion } from '../motor'
import { Asistente } from './Asistente'
import { Icono } from './Iconos'

const MAX_FILAS = 10

const EJEMPLOS = [
  'Llevadlos a pueblos pequeños con hospital cerca',
  'Repartid solo en la Sierra Norte',
  'Familias con hijos de instituto, cerca de Getafe',
]

interface Props {
  resultados: ResultadoMunicipio[] // con las inversiones
  resultadosSinInversion: ResultadoMunicipio[]
  porIne: Map<string, Municipio>
  escenario: Escenario
  mezcla: Record<Perfil, number>
  onMezcla: (m: Record<Perfil, number>) => void
  filtros: FiltrosReparto
  onFiltros: (f: FiltrosReparto) => void
  inversiones: Inversiones // las mismas que «¿y si invertimos aquí?» del mapa
  onInvertir: (ine: string, inv: Inversion) => void
  onVerEnMapa: (ine: string) => void
}

/** Plural sencillo: 1 colegio, 2 colegios. */
const cuantos = (n: number, uno: string, varios: string) => `${miles(n)} ${n === 1 ? uno : varios}`

export function Repartir({ resultados, resultadosSinInversion, porIne, escenario, mezcla, onMezcla, filtros, onFiltros,
  inversiones, onInvertir, onVerEnMapa }: Props) {
  const [todos, setTodos] = useState(false)
  const llegan = useMemo(() => llegadasPorPerfil(escenario.personas, mezcla), [escenario.personas, mezcla])
  const reparto = useMemo(() => repartir(resultados, porIne, llegan, filtros), [resultados, porIne, llegan, filtros])
  const hayInversion = Object.keys(inversiones).length > 0
  const repartoSinInvertir = useMemo(() => (hayInversion ? repartir(resultadosSinInversion, porIne, llegan, filtros) : reparto),
    [hayInversion, resultadosSinInversion, porIne, llegan, filtros, reparto])
  const sinDirigir = useMemo(() => cabenSinDirigir(resultados), [resultados])
  const porIneRes = useMemo(() => new Map(resultados.map((r) => [r.ine, r])), [resultados])
  const zonas = useMemo(() => [...new Set(resultados.map((r) => porIne.get(r.ine)!.zona))].sort((a, b) => a.localeCompare(b, 'es')),
    [resultados, porIne])
  const total = Object.values(inversiones).reduce((s, i) => ({ colegios: s.colegios + i.colegios, centros: s.centros + i.centros }), SIN_INVERSION)
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
        <Asistente porIne={porIne} actual={FILTROS_INICIALES} ejemplos={EJEMPLOS} boton="Repartir"
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
          <Casilla texto={`Todos con hospital a menos de ${HOSPITAL_LEJOS_KM} km`} valor={filtros.hospitalCerca}
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

        {hayInversion && (
          <p className="sim-inversion">
            <b>Con tus inversiones</b> ({[total.colegios ? cuantos(total.colegios, 'colegio', 'colegios') : '', total.centros ? cuantos(total.centros, 'centro de salud', 'centros de salud') : '']
              .filter(Boolean).join(' y ')}, unos {millones(costeInversion(total))}) caben{' '}
            <b>{miles(reparto.colocados - repartoSinInvertir.colocados)} personas más</b> que sin invertir
            ({miles(repartoSinInvertir.colocados)} → {miles(reparto.colocados)}). Son las mismas inversiones del mapa.
          </p>
        )}

        <h2>Pueblo a pueblo</h2>
        <p className="ayuda">
          «Lo llena» es lo primero que se acaba en ese pueblo. Si son los colegios o el centro de salud, puedes invertir ahí
          (un colegio, unos {millones(COSTE_COLEGIO)}; un centro de salud, unos {millones(COSTE_CENTRO_SALUD)}) y ver cuántos más caben.
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
                    <td><BotonInvertir r={porIneRes.get(f.ine)!} lleno={f.lleno} inv={inversiones[f.ine] ?? SIN_INVERSION}
                      onInvertir={(inv) => onInvertir(f.ine, inv)} /></td>
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
          de {HOSPITAL_LEJOS_KM} km. Como en el resto del modelo, cada persona ocupa sitio en colegios, centro de salud y vivienda
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

/** «+1 colegio» o «+1 centro de salud» si eso es lo que llena el pueblo; y lo ya invertido, con su botón para quitarlo. */
function BotonInvertir({ r, lleno, inv, onInvertir }: { r: ResultadoMunicipio; lleno: boolean; inv: Inversion; onInvertir: (inv: Inversion) => void }) {
  const puede = lleno && (r.limitante === 'colegios' || r.limitante === 'sanidad')
  return (
    <span className="sim-invertir">
      {inv.colegios > 0 && <button className="sim-hecho" onClick={() => onInvertir({ ...inv, colegios: inv.colegios - 1 })}
        title="Quitar un colegio">+{cuantos(inv.colegios, 'colegio', 'colegios')} ✕</button>}
      {inv.centros > 0 && <button className="sim-hecho" onClick={() => onInvertir({ ...inv, centros: inv.centros - 1 })}
        title="Quitar un centro de salud">+{cuantos(inv.centros, 'centro', 'centros')} ✕</button>}
      {puede && r.limitante === 'colegios' && <button className="sim-mas" onClick={() => onInvertir({ ...inv, colegios: inv.colegios + 1 })}>+1 colegio</button>}
      {puede && r.limitante === 'sanidad' && <button className="sim-mas" onClick={() => onInvertir({ ...inv, centros: inv.centros + 1 })}>+1 centro de salud</button>}
    </span>
  )
}
