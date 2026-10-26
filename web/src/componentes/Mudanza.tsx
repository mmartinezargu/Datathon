// Pestaña «¿Dónde me mudo?»: la vista para el ciudadano. Elige su perfil y lo que necesita,
// y le salen los municipios donde aún hay sitio para él, con una frase que explica por qué.

import { useState } from 'react'
import { TIPOS } from '../colores'
import { leerFrase } from '../asistente'
import { EJEMPLOS_FRASE, PERFILES, TAMANOS, cambiarPerfil, rankingMudanza } from '../mudanza'
import type { Candidato, Escenario, FiltrosMudanza, LecturaFrase, Municipio, Perfil, Recurso, ResultadoMunicipio, Tamano } from '../tipos'
import { decimal, miles, pct } from '../formato'
import { HOSPITAL_LEJOS_KM } from '../motor'
import { Icono } from './Iconos'
import { Simulador } from './Simulador'

const MAX_COMPARAR = 3
const MAX_RANKING = 10

interface Props {
  resultados: ResultadoMunicipio[]
  porIne: Map<string, Municipio>
  escenario: Escenario
  filtros: FiltrosMudanza
  onFiltros: (f: FiltrosMudanza) => void
  comparados: string[]
  onComparados: (ines: string[]) => void
  onVerEnMapa: (ine: string) => void
}

export function Mudanza({ resultados, porIne, escenario, filtros, onFiltros, comparados, onComparados, onVerEnMapa }: Props) {
  const ranking = rankingMudanza(resultados, porIne, filtros)
  const porIneRes = new Map(resultados.map((r) => [r.ine, r]))
  const zonas = [...new Set(resultados.map((r) => porIne.get(r.ine)!.zona))].sort((a, b) => a.localeCompare(b, 'es'))
  const cambiar = (cambio: Partial<FiltrosMudanza>) => onFiltros({ ...filtros, ...cambio })
  const alternar = (ine: string) =>
    onComparados(comparados.includes(ine) ? comparados.filter((x) => x !== ine) : [...comparados, ine])

  // Para el comparador: los elegidos, también si ya no pasan los filtros
  const todos = rankingMudanza(resultados, porIne, { ...filtros, colegio: false, instituto: false, sitioLibre: false, zona: null, tamano: 'todos' })
  const elegidos = comparados.map((ine) => todos.find((c) => c.ine === ine)).filter((c): c is Candidato => !!c)

  return (
    <div className="mudanza">
      <section className="val-cabeza">
        <h1>¿Dónde me mudo?</h1>
        <p>
          Dinos quién eres y qué necesitas. Te enseñamos los municipios donde aún habrá sitio en los colegios,
          en el centro de salud y en la vivienda en {escenario.anio}, aunque llegue toda la gente prevista.
        </p>
      </section>

      <section className="val-tarjeta filtros">
        <Asistente porIne={porIne} filtros={filtros} onFiltros={onFiltros} />

        <h2>¿Quién se muda?</h2>
        <div className="segmentos ancho" role="radiogroup" aria-label="Perfil">
          {(Object.keys(PERFILES) as Perfil[]).map((p) => (
            <button key={p} role="radio" aria-checked={filtros.perfil === p} className={filtros.perfil === p ? 'activo' : ''}
              onClick={() => onFiltros(cambiarPerfil(filtros, p))}>{PERFILES[p].nombre}</button>
          ))}
        </div>
        <p className="pista">{PERFILES[filtros.perfil].que}</p>

        <h2>¿Qué necesitas?</h2>
        <div className="casillas">
          <Casilla texto="Que tenga colegio" valor={filtros.colegio} onCambiar={(colegio) => cambiar({ colegio })} />
          <Casilla texto="Que tenga instituto" valor={filtros.instituto} onCambiar={(instituto) => cambiar({ instituto })} />
          <Casilla texto="Que no se llene con la gente que llega" valor={filtros.sitioLibre} onCambiar={(sitioLibre) => cambiar({ sitioLibre })} />
          <Casilla texto={`Con hospital a menos de ${HOSPITAL_LEJOS_KM} km`} valor={filtros.hospitalCerca} onCambiar={(hospitalCerca) => cambiar({ hospitalCerca })} />
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
      </section>

      {elegidos.length > 0 && (
        <Comparador elegidos={elegidos} porIne={porIne} porIneRes={porIneRes} anio={escenario.anio}
          onQuitar={alternar} onVerEnMapa={onVerEnMapa} />
      )}

      <section className="val-tarjeta">
        <h2>{ranking.length === 0 ? 'Ningún municipio cumple todo' : `Los que mejor encajan (${miles(ranking.length)} cumplen lo que pides)`}</h2>
        {ranking.length === 0 ? (
          <p className="vacio">Prueba a quitar algún filtro o a elegir otra zona.</p>
        ) : (
          <p className="ayuda">Marca 2 o 3 para compararlos.</p>
        )}
        <ol className="candidatos">
          {ranking.slice(0, MAX_RANKING).map((c, i) => {
            const m = porIne.get(c.ine)!
            const r = porIneRes.get(c.ine)!
            const marcado = comparados.includes(c.ine)
            return (
              <li key={c.ine} className={marcado ? 'marcado' : ''}>
                <span className="puesto">{i + 1}</span>
                <div className="cand-cuerpo">
                  <div className="cand-cabeza">
                    <b>{m.nombre}</b>
                    <span className="chip" style={{ background: TIPOS[r.tipo].color }}>{TIPOS[r.tipo].nombre}</span>
                    <span className="ayuda">{miles(r.poblacion)} vecinos, {m.zona}</span>
                  </div>
                  <BarrasSitio c={c} poblacion={r.poblacion} />
                  <p className="cand-frase">{frase(c, escenario.anio)}</p>
                  <p className="ayuda cand-hospital">
                    <Icono nombre="sanidad" tamano={14} /> Hospital más cercano: {m.hospital_municipio}, a {decimal(m.hospital_km)} km en línea recta
                  </p>
                  <div className="cand-acciones">
                    <span className="encaje" title="Lo bien que encaja con tu perfil, comparado con los demás que cumplen lo que pides">
                      <span className="encaje-pista"><span style={{ width: `${c.puntos}%` }} /></span>
                      encaja {c.puntos} sobre 100
                    </span>
                    <label className="casilla-mini">
                      <input type="checkbox" checked={marcado} disabled={!marcado && comparados.length >= MAX_COMPARAR}
                        onChange={() => alternar(c.ine)} /> Comparar
                    </label>
                    <button className="enlace" onClick={() => onVerEnMapa(c.ine)}>Ver su ficha</button>
                  </div>
                </div>
              </li>
            )
          })}
        </ol>
        <p className="nota">
          Solo contamos el sitio en colegios, centro de salud y vivienda según los datos públicos. No sabemos precios
          de alquiler ni tiempos de viaje al trabajo: mira también eso antes de decidir.
        </p>
      </section>

      <Simulador resultados={resultados} porIne={porIne} escenario={escenario} onVerEnMapa={onVerEnMapa} />
    </div>
  )
}

const BARRAS: { k: Recurso; nombre: string }[] = [
  { k: 'colegios', nombre: 'Colegios' },
  { k: 'sanidad', nombre: 'Centro de salud' },
  { k: 'vivienda', nombre: 'Casas' },
]

/**
 * Sitio que le queda en cada recurso cuando ya ha llegado la gente prevista.
 * La barra llena = sitio para tantas personas como vecinos tiene hoy (o más).
 */
function BarrasSitio({ c, poblacion }: { c: Candidato; poblacion: number }) {
  return (
    <div className="barras-sitio">
      {BARRAS.map(({ k, nombre }) => {
        const v = c.sitio[k]
        const ancho = v === null ? 0 : Math.min(1, Math.abs(v) / poblacion) * 100
        return (
          <div key={k} className={`bs-fila${v === null ? ' sin' : v < 0 ? ' falta' : ' hay'}`}>
            <span className="bs-nombre"><Icono nombre={k} tamano={16} />{nombre}</span>
            <span className="bs-pista"><span style={{ width: `${Math.max(ancho, v === null ? 0 : 3)}%` }} /></span>
            <span className="bs-valor">{v === null ? 'no tiene' : v >= 0 ? `+${miles(v)}` : `−${miles(-v)}`}</span>
          </div>
        )
      })}
    </div>
  )
}

/** Caja para contarlo con tus palabras: rellena los filtros de abajo, que se pueden retocar a mano. */
function Asistente({ porIne, filtros, onFiltros }: { porIne: Map<string, Municipio>; filtros: FiltrosMudanza; onFiltros: (f: FiltrosMudanza) => void }) {
  const [frase, setFrase] = useState('')
  const [lectura, setLectura] = useState<LecturaFrase | null>(null)
  const [pensando, setPensando] = useState(false)
  const leer = async (texto: string) => {
    if (!texto.trim() || pensando) return
    setPensando(true)
    const l = await leerFrase(texto, [...porIne.values()], filtros)
    setPensando(false)
    setLectura(l)
    if (l.entendido.length) onFiltros(l.filtros)
  }

  return (
    <div className="asistente">
      <h2>Cuéntanoslo con tus palabras</h2>
      <form className="asistente-fila" onSubmit={(e) => { e.preventDefault(); leer(frase) }}>
        <input type="text" value={frase} onChange={(e) => setFrase(e.target.value)}
          placeholder={`Por ejemplo: «${EJEMPLOS_FRASE[0]}»`} aria-label="Cuéntanos quién se muda y qué buscáis" />
        <button type="submit" disabled={!frase.trim() || pensando}>{pensando ? 'Pensando…' : 'Buscar'}</button>
      </form>
      <div className="asistente-ejemplos">
        {EJEMPLOS_FRASE.map((e) => (
          <button key={e} type="button" className="enlace" disabled={pensando} onClick={() => { setFrase(e); leer(e) }}>«{e}»</button>
        ))}
      </div>
      {lectura && (
        lectura.entendido.length ? (
          <div className="asistente-entendido" aria-live="polite">
            <b>Hemos entendido:</b>
            {lectura.origen === 'ia' && <span className="asistente-origen">con IA</span>}
            <ul>{lectura.entendido.map((t) => <li key={t}>{t}</li>)}</ul>
            <p className="ayuda">Si no es así, corrígelo abajo.</p>
          </div>
        ) : (
          <p className="asistente-entendido" aria-live="polite">
            No lo hemos entendido. Prueba a decir quién se muda (familia, jubilado, teletrabajo), dónde trabajas o
            si quieres un pueblo, o elige abajo.
          </p>
        )
      )}
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

const QUE: Record<Recurso, { hay: (n: string) => string; falta: (n: string) => string }> = {
  colegios: { hay: (n) => `sus colegios aún tienen sitio para unas ${n} personas más`, falta: (n) => `a sus colegios les faltaría sitio para unas ${n} personas` },
  sanidad: { hay: (n) => `su centro de salud puede atender a unas ${n} personas más`, falta: (n) => `su centro de salud se quedaría corto en unas ${n} personas` },
  vivienda: { hay: (n) => `hay casa para unas ${n} personas más`, falta: (n) => `faltaría casa para unas ${n} personas` },
}

/** Por qué sale: los dos recursos que más le suben en el ranking. */
function frase(c: Candidato, anio: number): string {
  const partes = c.razones
    .filter((k) => c.sitio[k] !== null)
    .slice(0, 2)
    .map((k) => (c.sitio[k]! >= 0 ? QUE[k].hay(miles(c.sitio[k]!)) : QUE[k].falta(miles(-c.sitio[k]!))))
  if (!partes.length) return ''
  const texto = partes.join(' y ')
  return `${texto[0].toUpperCase()}${texto.slice(1)}, contando la gente que llegaría hasta ${anio}.`
}

function Comparador({ elegidos, porIne, porIneRes, anio, onQuitar, onVerEnMapa }: {
  elegidos: Candidato[]; porIne: Map<string, Municipio>; porIneRes: Map<string, ResultadoMunicipio>; anio: number
  onQuitar: (ine: string) => void; onVerEnMapa: (ine: string) => void
}) {
  const sitio = (v: number | null) => (v === null ? 'no tiene' : v >= 0 ? `${miles(v)} más` : `faltan ${miles(-v)}`)
  const filas: { nombre: string; valor: (c: Candidato) => string }[] = [
    { nombre: 'Vecinos hoy', valor: (c) => miles(porIneRes.get(c.ine)!.poblacion) },
    { nombre: `Llegarían hasta ${anio}`, valor: (c) => { const r = porIneRes.get(c.ine)!; return `${miles(r.llegan)} (+${pct(r.crecimiento, 0)})` } },
    { nombre: 'Colegios / institutos', valor: (c) => { const k = porIne.get(c.ine)!.capacidad!; return `${k.colegios_primaria} / ${k.colegios_secundaria}` } },
    { nombre: 'Sitio en colegios', valor: (c) => sitio(c.sitio.colegios) },
    { nombre: 'Sitio en el centro de salud', valor: (c) => sitio(c.sitio.sanidad) },
    { nombre: 'Hospital más cercano', valor: (c) => { const m = porIne.get(c.ine)!; return `${decimal(m.hospital_km)} km (${m.hospital_municipio})` } },
    { nombre: 'Casa para', valor: (c) => sitio(c.sitio.vivienda) },
    { nombre: 'Tipo', valor: (c) => TIPOS[porIneRes.get(c.ine)!.tipo].nombre },
  ]

  return (
    <section className="val-tarjeta comparador">
      <h2>Comparados</h2>
      {elegidos.length === 1 && <p className="ayuda">Marca otro más en la lista para compararlos.</p>}
      <div className="tabla-scroll">
        <table>
          <thead>
            <tr>
              <th />
              {elegidos.map((c) => (
                <th key={c.ine}>
                  {porIne.get(c.ine)!.nombre}
                  <button className="cerrar mini" onClick={() => onQuitar(c.ine)} aria-label={`Quitar ${porIne.get(c.ine)!.nombre} de la comparación`}>✕</button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.nombre}>
                <td className="comp-nombre">{f.nombre}</td>
                {elegidos.map((c) => <td key={c.ine} className="num">{f.valor(c)}</td>)}
              </tr>
            ))}
            <tr>
              <td />
              {elegidos.map((c) => (
                <td key={c.ine} className="num"><button className="enlace" onClick={() => onVerEnMapa(c.ine)}>Ver su ficha</button></td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  )
}
