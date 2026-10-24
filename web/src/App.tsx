// Pantalla principal de CABIDA: mapa a la izquierda, cifra y palancas a la derecha.

import { useEffect, useMemo, useState } from 'react'
import { Mapa } from './componentes/Mapa'
import { Palancas } from './componentes/Palancas'
import { calcularPresion, escenarioPorDefecto } from './motor'
import type { Escenario, Municipio } from './tipos'
import { miles, pct } from './formato'
import './estilo.css'

// Escala de color provisional (día 1): cuánto crece cada municipio respecto a su población.
// Mañana se sustituye por los 4 tipos (tensión, polo, oportunidad, consolidación).
const ESCALA = [
  { hasta: 0.05, color: '#DCE6EE', texto: 'menos del 5 %' },
  { hasta: 0.10, color: '#F2C4BF', texto: '5–10 %' },
  { hasta: 0.20, color: '#E8867E', texto: '10–20 %' },
  { hasta: Infinity, color: '#D7263D', texto: 'más del 20 %' },
]
const colorPara = (c: number) => ESCALA.find((e) => c < e.hasta)!.color

export default function App() {
  const [municipios, setMunicipios] = useState<Municipio[] | null>(null)
  const [limites, setLimites] = useState<GeoJSON.FeatureCollection | null>(null)
  const [escenario, setEscenario] = useState<Escenario>(escenarioPorDefecto())
  const [seleccionado, setSeleccionado] = useState<string | null>(null)

  // Cargar los datos que preparó Python
  useEffect(() => {
    Promise.all([
      fetch('datos/municipios.json').then((r) => r.json()),
      fetch('datos/limites.geojson').then((r) => r.json()),
    ]).then(([m, l]) => {
      setMunicipios(m)
      setLimites(l)
    })
  }, [])

  // Recalcular solo cuando cambian los datos o las palancas
  const resultados = useMemo(
    () => (municipios ? calcularPresion(municipios, escenario) : []),
    [municipios, escenario],
  )
  const colores = useMemo(
    () => Object.fromEntries(resultados.map((r) => [r.ine, colorPara(r.crecimiento)])),
    [resultados],
  )

  if (!municipios || !limites) return <div className="cargando">Cargando datos…</div>

  const porIne = new Map(municipios.map((m) => [m.ine, m]))
  const sel = seleccionado ? resultados.find((r) => r.ine === seleccionado) : null
  const masPresion = [...resultados].sort((a, b) => b.crecimiento - a.crecimiento).slice(0, 5)

  return (
    <div className="app">
      <header className="cabecera">
        <span className="marca">CABIDA</span>
        <span className="lema">¿Dónde cabe la nueva población de la Comunidad de Madrid?</span>
      </header>
      <main className="cuerpo">
        <Mapa limites={limites} colores={colores} seleccionado={seleccionado} onSeleccionar={setSeleccionado} />
        <aside className="panel">
          <div className="titular">
            <div className="pequeno">Hasta {escenario.anio}, los 155 municipios absorben</div>
            <div className="grande">{miles(escenario.personas)} personas</div>
          </div>
          <Palancas escenario={escenario} onCambiar={setEscenario} />

          <div className="leyenda">
            <div className="pequeno">Crecimiento sobre su población actual</div>
            {ESCALA.map((e) => (
              <span key={e.color}><i style={{ background: e.color }} />{e.texto}</span>
            ))}
          </div>

          {sel ? (
            <div className="ficha-mini">
              <div className="nombre">{porIne.get(sel.ine)?.nombre}</div>
              <div className="pequeno">{miles(sel.poblacion)} habitantes, {porIne.get(sel.ine)?.zona}</div>
              <p>Si sigue la tendencia, recibiría unas <b>{miles(sel.llegan)}</b> personas
                hasta {escenario.anio} (un {pct(sel.crecimiento)} más).</p>
            </div>
          ) : (
            <div className="ranking">
              <div className="pequeno">Los que más crecerían</div>
              <ol>
                {masPresion.map((r) => (
                  <li key={r.ine}>
                    <button onClick={() => setSeleccionado(r.ine)}>{porIne.get(r.ine)?.nombre}</button>
                    <span>{pct(r.crecimiento)}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </aside>
      </main>
    </div>
  )
}
