// Pantalla principal de CABIDA: pestañas arriba; en "Mapa", el mapa a la izquierda
// y el escenario, la leyenda y la lista (o la ficha) a la derecha.

import { useEffect, useMemo, useState } from 'react'
import { Mapa, type InfoEtiqueta } from './componentes/Mapa'
import { Palancas } from './componentes/Palancas'
import { Evolucion } from './componentes/Evolucion'
import { Validacion, type DatosValidacion } from './componentes/Validacion'
import { ANIO_BASE, calcularPresion, escenarioPorDefecto } from './motor'
import { ESCALA_CRECIMIENTO, colorCrecimiento, textoSobre } from './colores'
import type { Escenario, Municipio, ResultadoMunicipio } from './tipos'
import { miles, pct } from './formato'
import './estilo.css'

type Pestana = 'mapa' | 'validacion'

export default function App() {
  const [municipios, setMunicipios] = useState<Municipio[] | null>(null)
  const [limites, setLimites] = useState<GeoJSON.FeatureCollection | null>(null)
  const [validacion, setValidacion] = useState<DatosValidacion | null>(null)
  const [escenario, setEscenario] = useState<Escenario>(escenarioPorDefecto())
  const [seleccionado, setSeleccionado] = useState<string | null>(null)
  const [pestana, setPestana] = useState<Pestana>('mapa')

  // Cargar los datos que preparó Python
  useEffect(() => {
    Promise.all(['municipios.json', 'limites.geojson', 'validacion.json'].map((f) => fetch(`datos/${f}`).then((r) => r.json())))
      .then(([m, l, v]) => {
        setMunicipios(m)
        setLimites(l)
        setValidacion(v)
      })
  }, [])

  // Recalcular solo cuando cambian los datos o las palancas
  const resultados = useMemo(
    () => (municipios ? calcularPresion(municipios, escenario) : []),
    [municipios, escenario],
  )
  const porIne = useMemo(() => new Map((municipios ?? []).map((m) => [m.ine, m])), [municipios])
  const colores = useMemo(
    () => Object.fromEntries(resultados.map((r) => [r.ine, colorCrecimiento(r.crecimiento)])),
    [resultados],
  )
  const etiquetas = useMemo<Record<string, InfoEtiqueta>>(
    () => Object.fromEntries(resultados.map((r) => [r.ine, {
      titulo: porIne.get(r.ine)?.nombre ?? '',
      linea: `${miles(r.poblacion)} habitantes; llegarían ${miles(r.llegan)} (+${pct(r.crecimiento)})`,
    }])),
    [resultados, porIne],
  )

  if (!municipios || !limites || !validacion) {
    return <div className="cargando"><Logo /> Cargando los datos de los 155 municipios…</div>
  }

  const poblacionHoy = resultados.reduce((s, r) => s + r.poblacion, 0)
  const crecimientoMedio = escenario.personas / poblacionHoy
  const sel = seleccionado ? resultados.find((r) => r.ine === seleccionado) ?? null : null

  return (
    <div className="app">
      <header className="cabecera">
        <div className="marca"><Logo /><span>CABIDA</span></div>
        <nav className="pestanas" aria-label="Secciones">
          <button className={pestana === 'mapa' ? 'activa' : ''} onClick={() => setPestana('mapa')}>Mapa</button>
          <button className={pestana === 'validacion' ? 'activa' : ''} onClick={() => setPestana('validacion')}>Validación</button>
        </nav>
        <span className="lema">¿Dónde cabe la nueva población de la Comunidad de Madrid?</span>
      </header>

      {pestana === 'validacion' ? (
        <main className="pagina"><Validacion datos={validacion} /></main>
      ) : (
        <main className="cuerpo">
          <div className="zona-mapa">
            <Mapa limites={limites} colores={colores} etiquetas={etiquetas}
              seleccionado={seleccionado} onSeleccionar={setSeleccionado} />
            <div className="cifras">
              <Cifra valor="155" texto="municipios de menos de 50.000 habitantes" />
              <Cifra valor={miles(poblacionHoy)} texto={`vecinos a 1 de enero de ${ANIO_BASE}`} />
              <Cifra valor={`+${pct(crecimientoMedio)}`} texto={`crecerían de media hasta ${escenario.anio}`} />
            </div>
            <Leyenda />
          </div>

          <aside className="panel">
            <section className="escenario">
              <p className="frase">
                Hasta <b>{escenario.anio}</b>, los pueblos y ciudades pequeñas de Madrid acogen
              </p>
              <div className="grande">{miles(escenario.personas)}<span> personas</span></div>
              <Palancas escenario={escenario} onCambiar={setEscenario} />
            </section>

            {sel ? (
              <Ficha r={sel} m={porIne.get(sel.ine)!} anio={escenario.anio} onCerrar={() => setSeleccionado(null)} />
            ) : (
              <Ranking resultados={resultados} porIne={porIne} onElegir={setSeleccionado} />
            )}
          </aside>
        </main>
      )}
    </div>
  )
}

/** Logo: un hexágono partido en los 4 colores de los tipos de municipio (como la portada de la propuesta). */
function Logo() {
  const pts = (cx: number, cy: number, r: number) =>
    Array.from({ length: 6 }, (_, k) => {
      const a = (Math.PI / 180) * (60 * k + 30)
      return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`
    }).join(' ')
  return (
    <svg className="logo" viewBox="0 0 40 36" aria-hidden="true">
      <polygon points={pts(11, 10, 8.5)} fill="#FBD050" />
      <polygon points={pts(26, 10, 8.5)} fill="#C9305E" />
      <polygon points={pts(18.5, 23, 8.5)} fill="#2F6FEB" />
    </svg>
  )
}

function Cifra({ valor, texto }: { valor: string; texto: string }) {
  return (
    <div className="cifra">
      <b>{valor}</b>
      <span>{texto}</span>
    </div>
  )
}

function Leyenda() {
  return (
    <div className="leyenda" aria-label="Leyenda">
      <div className="leyenda-titulo">Cuánto crecería cada municipio</div>
      <div className="leyenda-barra">
        {ESCALA_CRECIMIENTO.map((t) => (
          <span key={t.color} style={{ background: t.color, color: textoSobre(t.color) }}>{t.texto}</span>
        ))}
      </div>
      <div className="leyenda-fuera"><i /> Más de 50.000 habitantes (fuera del reto)</div>
    </div>
  )
}

function Ranking({ resultados, porIne, onElegir }: {
  resultados: ResultadoMunicipio[]
  porIne: Map<string, Municipio>
  onElegir: (ine: string) => void
}) {
  const top = [...resultados].sort((a, b) => b.crecimiento - a.crecimiento).slice(0, 8)
  const max = top[0]?.crecimiento || 1
  return (
    <section className="ranking">
      <h2>Los que más crecerían</h2>
      <p className="ayuda">Pulsa un municipio, aquí o en el mapa, para ver su ficha.</p>
      <ol>
        {top.map((r) => (
          <li key={r.ine}>
            <button onClick={() => onElegir(r.ine)}>
              <span className="r-nombre">{porIne.get(r.ine)?.nombre}</span>
              <span className="r-barra">
                <span style={{ width: `${(r.crecimiento / max) * 100}%`, background: colorCrecimiento(r.crecimiento) }} />
              </span>
              <span className="r-valor">+{pct(r.crecimiento)}</span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  )
}

function Ficha({ r, m, anio, onCerrar }: { r: ResultadoMunicipio; m: Municipio; anio: number; onCerrar: () => void }) {
  const color = colorCrecimiento(r.crecimiento)
  return (
    <section className="ficha" style={{ borderTopColor: color }}>
      <div className="ficha-cabeza">
        <div>
          <h2>{m.nombre}</h2>
          <div className="ayuda">{m.zona}, {miles(m.superficie_km2)} km²</div>
        </div>
        <button className="cerrar" onClick={onCerrar} aria-label="Cerrar la ficha y volver a la lista">✕</button>
      </div>
      <div className="ficha-cifras">
        <div><b>{miles(r.poblacion)}</b><span>vecinos hoy</span></div>
        <div><b style={{ color: color === '#FFF1B8' ? '#15233B' : color }}>+{miles(r.llegan)}</b><span>llegarían hasta {anio}</span></div>
      </div>
      <Evolucion poblacion={m.poblacion} anioFin={anio} poblacionFin={r.poblacion + r.llegan} color={color} />
      <p className="ficha-frase">
        Si sigue la tendencia, {m.nombre} recibiría unas <b>{miles(r.llegan)}</b> personas hasta {anio}:
        un {pct(r.crecimiento)} más que hoy.
      </p>
    </section>
  )
}
