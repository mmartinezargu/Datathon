// Pantalla principal de CABIDA: pestañas arriba; en "Mapa", el mapa a la izquierda
// y el escenario, la lista (o la ficha) a la derecha.

import { useEffect, useMemo, useState } from 'react'
import { Mapa, type InfoEtiqueta } from './componentes/Mapa'
import { Palancas } from './componentes/Palancas'
import { Ficha } from './componentes/Ficha'
import { Descarga } from './componentes/Descarga'
import { Validacion, type DatosValidacion } from './componentes/Validacion'
import { SIN_INVERSION, calcular, calcularUmbrales, costeInversion, escenarioPorDefecto } from './motor'
import { ESCALA_CRECIMIENTO, ORDEN_TIPOS, TIPOS, colorCrecimiento, textoSobre } from './colores'
import type { Escenario, Inversion, Inversiones, Municipio, ResultadoMunicipio, Tipo, ZonaSalud } from './tipos'
import { miles, millones, pct } from './formato'
import './estilo.css'

type Pestana = 'mapa' | 'validacion'
type ColorMapa = 'tipo' | 'crecimiento'

export default function App() {
  const [municipios, setMunicipios] = useState<Municipio[] | null>(null)
  const [zonas, setZonas] = useState<ZonaSalud[] | null>(null)
  const [limites, setLimites] = useState<GeoJSON.FeatureCollection | null>(null)
  const [validacion, setValidacion] = useState<DatosValidacion | null>(null)
  const [escenario, setEscenario] = useState<Escenario>(escenarioPorDefecto())
  const [seleccionado, setSeleccionado] = useState<string | null>(null)
  const [pestana, setPestana] = useState<Pestana>('mapa')
  const [colorMapa, setColorMapa] = useState<ColorMapa>('tipo')
  const [inversiones, setInversiones] = useState<Inversiones>({})

  // Cargar los datos que preparó Python
  useEffect(() => {
    const archivos = ['municipios.json', 'zonas_salud.json', 'limites.geojson', 'validacion.json']
    Promise.all(archivos.map((f) => fetch(`datos/${f}`).then((r) => r.json()))).then(([m, z, l, v]) => {
      setMunicipios(m)
      setZonas(z)
      setLimites(l)
      setValidacion(v)
    })
  }, [])

  // Recalcular solo cuando cambian los datos o las palancas
  const resultados = useMemo(
    () => (municipios && zonas ? calcular(municipios, zonas, escenario, inversiones) : []),
    [municipios, zonas, escenario, inversiones],
  )
  // Lo mismo sin inversiones, para enseñar en la ficha el "antes" y el "después"
  const hayInversion = Object.keys(inversiones).length > 0
  const resultadosSinInversion = useMemo(
    () => (municipios && zonas && hayInversion ? calcular(municipios, zonas, escenario) : resultados),
    [municipios, zonas, escenario, hayInversion, resultados],
  )
  const umbrales = useMemo(
    () => (municipios && zonas ? calcularUmbrales(municipios.filter((m) => m.universo), zonas, escenario.exigencia) : null),
    [municipios, zonas, escenario.exigencia],
  )
  const porIne = useMemo(() => new Map((municipios ?? []).map((m) => [m.ine, m])), [municipios])
  const colores = useMemo(
    () => Object.fromEntries(resultados.map((r) => [r.ine,
      colorMapa === 'tipo' ? TIPOS[r.tipo].color : colorCrecimiento(r.crecimiento)])),
    [resultados, colorMapa],
  )
  const etiquetas = useMemo<Record<string, InfoEtiqueta>>(
    () => Object.fromEntries(resultados.map((r) => [r.ine, {
      titulo: porIne.get(r.ine)?.nombre ?? '',
      linea: `${TIPOS[r.tipo].nombre}: llegan ${miles(r.llegan)}, caben ${miles(r.caben)}`,
    }])),
    [resultados, porIne],
  )

  if (!municipios || !zonas || !limites || !validacion || !umbrales) {
    return <div className="cargando"><Logo /> Cargando los datos de los 155 municipios…</div>
  }

  const caben = resultados.reduce((s, r) => s + Math.min(r.caben, r.llegan), 0)
  const sinSitio = resultados.reduce((s, r) => s + Math.max(0, -r.margen), 0)
  const cuenta = Object.fromEntries(ORDEN_TIPOS.map((t) => [t, resultados.filter((r) => r.tipo === t).length])) as Record<Tipo, number>
  const sel = seleccionado ? resultados.find((r) => r.ine === seleccionado) ?? null : null
  const selAntes = seleccionado ? resultadosSinInversion.find((r) => r.ine === seleccionado) ?? null : null
  const invertido = Object.values(inversiones).reduce((s, inv) => s + costeInversion(inv), 0)
  const invertir = (ine: string, inv: Inversion) =>
    setInversiones((antes) => {
      const nuevas = { ...antes, [ine]: inv }
      if (!inv.colegios && !inv.centros) delete nuevas[ine] // sin nada construido, fuera de la lista
      return nuevas
    })

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
              <Cifra valor={miles(caben)} texto={`de las ${miles(escenario.personas)} personas caben con los servicios de hoy`} />
              <Cifra valor={miles(sinSitio)} texto={invertido ? `se quedarían sin sitio, contando lo que has invertido (${millones(invertido)})` : 'se quedarían sin sitio: ahí hay que invertir'} acento={TIPOS.tension.color} />
              <Cifra valor={String(cuenta.oportunidad)} texto="municipios con sitio al que no llega gente" acento={TIPOS.oportunidad.color} />
            </div>
            <div className="leyenda" aria-label="Leyenda">
              <Segmentos valor={colorMapa} onCambiar={setColorMapa} />
              {colorMapa === 'tipo' ? (
                <div className="leyenda-tipos">
                  {ORDEN_TIPOS.map((t) => (
                    <span key={t} title={TIPOS[t].que}><i style={{ background: TIPOS[t].color }} />{TIPOS[t].nombre}<b>{cuenta[t]}</b></span>
                  ))}
                </div>
              ) : (
                <div className="leyenda-barra">
                  {ESCALA_CRECIMIENTO.map((t) => (
                    <span key={t.color} style={{ background: t.color, color: textoSobre(t.color) }}>{t.texto}</span>
                  ))}
                </div>
              )}
              <div className="leyenda-fuera"><i /> Más de 50.000 habitantes (fuera del reto)</div>
            </div>
          </div>

          <aside className="panel">
            <section className="escenario">
              <p className="frase">Hasta <b>{escenario.anio}</b>, los pueblos y ciudades pequeñas de Madrid acogen</p>
              <div className="grande">{miles(escenario.personas)}<span> personas</span></div>
              <Palancas escenario={escenario} onCambiar={setEscenario} />
            </section>

            {sel ? (
              <Ficha r={sel} antes={selAntes ?? sel} m={porIne.get(sel.ine)!} escenario={escenario} umbrales={umbrales}
                inversion={inversiones[sel.ine] ?? SIN_INVERSION} onInvertir={(inv) => invertir(sel.ine, inv)}
                onCerrar={() => setSeleccionado(null)} />
            ) : (
              <Listas resultados={resultados} porIne={porIne} onElegir={setSeleccionado} />
            )}

            <Descarga resultados={resultados} porIne={porIne} escenario={escenario} inversiones={inversiones} />
          </aside>
        </main>
      )}
    </div>
  )
}

/** Logo: tres hexágonos en los colores de los tipos (como la portada de la propuesta). */
function Logo() {
  const pts = (cx: number, cy: number, r: number) =>
    Array.from({ length: 6 }, (_, k) => {
      const a = (Math.PI / 180) * (60 * k + 30)
      return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`
    }).join(' ')
  return (
    <svg className="logo" viewBox="0 0 40 36" aria-hidden="true">
      <polygon points={pts(11, 10, 8.5)} fill="#1B998B" />
      <polygon points={pts(26, 10, 8.5)} fill="#D7263D" />
      <polygon points={pts(18.5, 23, 8.5)} fill="#2F6FEB" />
    </svg>
  )
}

function Cifra({ valor, texto, acento }: { valor: string; texto: string; acento?: string }) {
  return (
    <div className="cifra" style={acento ? { borderTopColor: acento } : undefined}>
      <b style={acento ? { color: acento } : undefined}>{valor}</b>
      <span>{texto}</span>
    </div>
  )
}

function Segmentos({ valor, onCambiar }: { valor: ColorMapa; onCambiar: (v: ColorMapa) => void }) {
  const opciones: { v: ColorMapa; t: string }[] = [{ v: 'tipo', t: 'Tipo de municipio' }, { v: 'crecimiento', t: 'Cuánto crece' }]
  return (
    <div className="segmentos mini" role="radiogroup" aria-label="Colorear el mapa por">
      {opciones.map((o) => (
        <button key={o.v} role="radio" aria-checked={valor === o.v} className={valor === o.v ? 'activo' : ''}
          onClick={() => onCambiar(o.v)}>{o.t}</button>
      ))}
    </div>
  )
}

type Lista = 'tension' | 'oportunidad' | 'crecimiento'

function Listas({ resultados, porIne, onElegir }: {
  resultados: ResultadoMunicipio[]; porIne: Map<string, Municipio>; onElegir: (ine: string) => void
}) {
  const [lista, setLista] = useState<Lista>('tension')
  const config = {
    tension: {
      titulo: 'Donde más gente se queda sin sitio',
      filas: resultados.filter((r) => r.tipo === 'tension').sort((a, b) => a.margen - b.margen),
      valor: (r: ResultadoMunicipio) => -r.margen, texto: (r: ResultadoMunicipio) => `−${miles(-r.margen)}`, color: () => TIPOS.tension.color,
    },
    oportunidad: {
      titulo: 'Donde hay sitio y no llega gente',
      filas: resultados.filter((r) => r.tipo === 'oportunidad').sort((a, b) => b.margen - a.margen),
      valor: (r: ResultadoMunicipio) => r.margen, texto: (r: ResultadoMunicipio) => `+${miles(r.margen)}`, color: () => TIPOS.oportunidad.color,
    },
    crecimiento: {
      titulo: 'Los que más crecerían',
      filas: [...resultados].sort((a, b) => b.crecimiento - a.crecimiento),
      valor: (r: ResultadoMunicipio) => r.crecimiento, texto: (r: ResultadoMunicipio) => `+${pct(r.crecimiento)}`, color: (r: ResultadoMunicipio) => colorCrecimiento(r.crecimiento),
    },
  }[lista]
  const top = config.filas.slice(0, 8)
  const max = top.length ? config.valor(top[0]) : 1

  return (
    <section className="ranking">
      <div className="tabs-lista" role="tablist" aria-label="Listas">
        {([['tension', 'Sin sitio'], ['oportunidad', 'Con sitio'], ['crecimiento', 'Más crecen']] as [Lista, string][]).map(([v, t]) => (
          <button key={v} role="tab" aria-selected={lista === v} className={lista === v ? 'activa' : ''} onClick={() => setLista(v)}>{t}</button>
        ))}
      </div>
      <h2>{config.titulo}</h2>
      <p className="ayuda">{lista === 'crecimiento' ? 'Sobre su población actual.' : 'Personas, en el escenario elegido.'} Pulsa uno para ver su ficha.</p>
      {top.length === 0 && <p className="vacio">Ningún municipio en este escenario. Mueve las palancas para ver otros.</p>}
      <ol>
        {top.map((r) => (
          <li key={r.ine}>
            <button onClick={() => onElegir(r.ine)}>
              <span className="r-nombre">{porIne.get(r.ine)?.nombre}</span>
              <span className="r-barra"><span style={{ width: `${(config.valor(r) / max) * 100}%`, background: config.color(r) }} /></span>
              <span className="r-valor">{config.texto(r)}</span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  )
}
