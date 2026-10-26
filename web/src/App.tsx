// Pantalla principal de CABIDA.
// Pestañas arriba. La de "Mapa del gestor" va en 3 columnas, en el orden en que se usa:
//   1 Escenario (lo que mueves)  ->  2 Mapa (lo que miras)  ->  3 Resultado (lo que lees)

import { useEffect, useMemo, useState } from 'react'
import { Mapa, type InfoEtiqueta } from './componentes/Mapa'
import { Palancas } from './componentes/Palancas'
import { Ficha } from './componentes/Ficha'
import { Descarga } from './componentes/Descarga'
import { Mudanza } from './componentes/Mudanza'
import { Metodologia } from './componentes/Metodologia'
import { Inicio, type Totales } from './componentes/Inicio'
import { Vaso } from './componentes/Vaso'
import { OrigenTodos } from './componentes/OrigenVaso'
import { Reubicacion } from './componentes/Reubicacion'
import { Icono, type NombreIcono } from './componentes/Iconos'
import { FILTROS_INICIALES } from './mudanza'
import { Validacion, type DatosValidacion } from './componentes/Validacion'
import { ANIO_BASE, HOSPITAL_LEJOS_KM, SIN_INVERSION, calcular, calcularUmbrales, costeInversion, escenarioPorDefecto, resumenReubicacion } from './motor'
import { COLOR_APAGADO, CONDICIONADA, ESCALA_CRECIMIENTO, ORDEN_TIPOS, TIPOS, colorCrecimiento, textoSobre } from './colores'
import type { Escenario, FiltrosMudanza, Inversion, Inversiones, Municipio, ResultadoMunicipio, Tipo, ZonaSalud } from './tipos'
import { miles, millones, pct } from './formato'
import './estilo.css'
import './diseno.css'

type Pestana = 'inicio' | 'mapa' | 'mudanza' | 'validacion' | 'metodologia'
type ColorMapa = 'tipo' | 'crecimiento'
type VistaMovil = 'escenario' | 'mapa' | 'resultado'

// Cada pestaña tiene su enlace (cabida.vercel.app/#mapa): sirve para compartirla y para la demo
const HASH: Record<Pestana, string> = { inicio: '', mapa: 'mapa', mudanza: 'vivir', validacion: 'fiable', metodologia: 'como' }
const pestanaDelEnlace = (): Pestana =>
  (Object.keys(HASH) as Pestana[]).find((p) => HASH[p] && `#${HASH[p]}` === window.location.hash) ?? 'inicio'

const PESTANAS: { id: Pestana; texto: string; icono: NombreIcono }[] = [
  { id: 'inicio', texto: 'Inicio', icono: 'inicio' },
  { id: 'mapa', texto: 'Mapa del gestor', icono: 'mapa' },
  { id: 'mudanza', texto: 'Dónde vivir', icono: 'vivir' },
  { id: 'validacion', texto: '¿Es fiable?', icono: 'fiable' },
  { id: 'metodologia', texto: 'Cómo se calcula', icono: 'metodo' },
]

export default function App() {
  const [municipios, setMunicipios] = useState<Municipio[] | null>(null)
  const [zonas, setZonas] = useState<ZonaSalud[] | null>(null)
  const [limites, setLimites] = useState<GeoJSON.FeatureCollection | null>(null)
  const [validacion, setValidacion] = useState<DatosValidacion | null>(null)
  const [escenario, setEscenario] = useState<Escenario>(escenarioPorDefecto())
  const [seleccionado, setSeleccionado] = useState<string | null>(null)
  const [pestana, setPestanaEstado] = useState<Pestana>(pestanaDelEnlace)
  const [colorMapa, setColorMapa] = useState<ColorMapa>('tipo')
  const [resaltado, setResaltado] = useState<Tipo | null>(null)
  const [vistaMovil, setVistaMovil] = useState<VistaMovil>('mapa')
  const [inversiones, setInversiones] = useState<Inversiones>({})
  const [filtros, setFiltros] = useState<FiltrosMudanza>(FILTROS_INICIALES)
  const [comparados, setComparados] = useState<string[]>([])

  // Cambiar de pestaña también cambia el enlace; los botones atrás/adelante del navegador funcionan
  const setPestana = (p: Pestana) => {
    setPestanaEstado(p)
    const destino = HASH[p] ? `#${HASH[p]}` : window.location.pathname
    if (destino !== window.location.hash) window.history.pushState(null, '', destino)
  }
  useEffect(() => {
    const alCambiar = () => setPestanaEstado(pestanaDelEnlace())
    window.addEventListener('popstate', alCambiar)
    return () => window.removeEventListener('popstate', alCambiar)
  }, [])

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
  // Color de cada municipio; si se ha pulsado un tipo en la leyenda, los demás se apagan
  const colores = useMemo(
    () => Object.fromEntries(resultados.map((r) => {
      if (resaltado && r.tipo !== resaltado) return [r.ine, COLOR_APAGADO]
      return [r.ine, colorMapa === 'tipo' ? TIPOS[r.tipo].color : colorCrecimiento(r.crecimiento)]
    })),
    [resultados, colorMapa, resaltado],
  )
  // Rayadas: las oportunidades condicionadas (hospital lejos), solo si se ve el color de su tipo
  const rayados = useMemo(
    () => new Set(colorMapa === 'tipo' && (!resaltado || resaltado === 'oportunidad')
      ? resultados.filter((r) => r.condicionada).map((r) => r.ine) : []),
    [resultados, colorMapa, resaltado],
  )
  const etiquetas = useMemo<Record<string, InfoEtiqueta>>(
    () => Object.fromEntries(resultados.map((r) => [r.ine, {
      titulo: porIne.get(r.ine)?.nombre ?? '',
      linea: `${r.condicionada ? CONDICIONADA.nombre : TIPOS[r.tipo].nombre}: llegan ${miles(r.llegan)}, caben ${miles(r.caben)}`,
    }])),
    [resultados, porIne],
  )

  if (!municipios || !zonas || !limites || !validacion || !umbrales) {
    return <div className="cargando"><Logo /> Cargando los datos de los 155 municipios…</div>
  }

  // Con la reubicación, lo que va a pueblos cercanos pasa de «sin sitio» a «caben»
  const reubicacion = resumenReubicacion(resultados)
  const dirigidos = reubicacion.personas
  const dentro = resultados.reduce((s, r) => s + Math.min(r.caben, r.llegan), 0) + dirigidos
  const sinSitio = resultados.reduce((s, r) => s + Math.max(0, -r.margen), 0) - dirigidos
  const reequilibrio = escenario.reequilibrio
  const capacidad = resultados.reduce((s, r) => s + r.caben, 0)
  const cuenta = Object.fromEntries(ORDEN_TIPOS.map((t) => [t, resultados.filter((r) => r.tipo === t).length])) as Record<Tipo, number>
  const condicionadas = resultados.filter((r) => r.condicionada).length
  const sel = seleccionado ? resultados.find((r) => r.ine === seleccionado) ?? null : null
  // Con la reubicación, los municipios con los que intercambia gente el seleccionado (borde grueso en el mapa)
  const vecinos = sel && reequilibrio ? [...sel.envios.map((t) => t.destino), ...sel.llegadas.map((t) => t.origen)] : []
  const selAntes = seleccionado ? resultadosSinInversion.find((r) => r.ine === seleccionado) ?? null : null
  const invertido = Object.values(inversiones).reduce((s, inv) => s + costeInversion(inv), 0)
  const invertir = (ine: string, inv: Inversion) =>
    setInversiones((antes) => {
      const nuevas = { ...antes, [ine]: inv }
      if (!inv.colegios && !inv.centros) delete nuevas[ine] // sin nada construido, fuera de la lista
      return nuevas
    })
  const elegir = (ine: string | null) => {
    setSeleccionado(ine)
    if (ine) setVistaMovil('resultado') // en el móvil, enseña la ficha al pulsar un municipio
  }

  return (
    <div className="app">
      <header className="cabecera">
        <button className="marca" onClick={() => setPestana('inicio')} aria-label="CABIDA: volver al inicio"><Logo /><span>CABIDA</span></button>
        <nav className="pestanas" aria-label="Secciones">
          {PESTANAS.map((p) => (
            <button key={p.id} className={pestana === p.id ? 'activa' : ''} aria-current={pestana === p.id ? 'page' : undefined}
              onClick={() => setPestana(p.id)}>
              <Icono nombre={p.icono} tamano={18} /><span>{p.texto}</span>
            </button>
          ))}
        </nav>
      </header>

      {pestana === 'inicio' ? (
        <main className="pagina"><Inicio totales={totalesInicio(municipios, resultados, escenario.anio, { capacidad, dentro, fuera: sinSitio, reequilibrio })}
          onIr={(d) => setPestana(d)} /></main>
      ) : pestana === 'validacion' ? (
        <main className="pagina"><Validacion datos={validacion} /></main>
      ) : pestana === 'metodologia' ? (
        <main className="pagina"><Metodologia escenario={escenario} validacion={validacion} /></main>
      ) : pestana === 'mudanza' ? (
        <main className="pagina">
          <Mudanza resultados={resultados} porIne={porIne} escenario={escenario}
            filtros={filtros} onFiltros={setFiltros} comparados={comparados} onComparados={setComparados}
            onVerEnMapa={(ine) => { elegir(ine); setPestana('mapa') }} />
        </main>
      ) : (
        <main className={`cuerpo vista-${vistaMovil}${sel ? ' con-ficha' : ''}`}>
          {/* 1. Escenario */}
          <aside className="columna col-escenario" aria-label="Escenario">
            <TituloColumna numero={1} texto="Escenario" ayuda="Mueve las palancas" />
            <section className="escenario">
              <p className="frase">Hasta <b>{escenario.anio}</b>, los pueblos y ciudades pequeñas de Madrid acogen</p>
              <div className="grande">{miles(escenario.personas)}<span> personas</span></div>
              <Palancas escenario={escenario} onCambiar={setEscenario} />
            </section>
            <Descarga resultados={resultados} porIne={porIne} escenario={escenario} inversiones={inversiones} />
          </aside>

          {/* 2. Mapa */}
          <div className="columna col-mapa">
            <div className="mapa-titulo"><TituloColumna numero={2} texto="Mapa" ayuda="Pulsa un municipio" /></div>
            <Mapa limites={limites} colores={colores} etiquetas={etiquetas} rayados={rayados} vecinos={vecinos}
              seleccionado={seleccionado} onSeleccionar={elegir} />
            <div className="cifras">
              <Cifra valor={miles(dentro)}
                texto={`de las ${miles(escenario.personas)} personas caben` +
                  (invertido ? ', contando lo que has invertido' : ' con los servicios de hoy') +
                  (reequilibrio ? `, reubicando ${miles(dirigidos)} en pueblos cercanos` : '')} />
              <Cifra valor={miles(sinSitio)} acento={TIPOS.tension.color}
                texto={reequilibrio
                  ? `no encuentran sitio cerca${invertido ? `, aun con ${millones(invertido)} invertidos` : ': ahí hay que invertir'}`
                  : invertido ? `se quedarían sin sitio, aun con ${millones(invertido)} invertidos` : 'se quedarían sin sitio: ahí hay que invertir'} />
              <Cifra valor={String(cuenta.oportunidad)} acento={TIPOS.oportunidad.color}
                texto={`municipios con sitio al que no llega gente; en ${condicionadas} el hospital queda a más de ${HOSPITAL_LEJOS_KM} km`} />
            </div>
            <div className="leyenda" aria-label="Leyenda">
              <Segmentos valor={colorMapa} onCambiar={(v) => { setColorMapa(v); setResaltado(null) }} />
              {colorMapa === 'tipo' ? (
                <>
                  <div className="leyenda-tipos">
                    {ORDEN_TIPOS.map((t) => (
                      <button key={t} className={`tipo-boton${resaltado === t ? ' activo' : ''}${resaltado && resaltado !== t ? ' apagado' : ''}`}
                        aria-pressed={resaltado === t} title={TIPOS[t].que} onClick={() => setResaltado(resaltado === t ? null : t)}>
                        <i style={{ background: TIPOS[t].color }} />{TIPOS[t].nombre}<b>{cuenta[t]}</b>
                      </button>
                    ))}
                  </div>
                  {condicionadas > 0 && (!resaltado || resaltado === 'oportunidad') && (
                    <div className="leyenda-condicionada" title={CONDICIONADA.que}>
                      <i style={{ background: CONDICIONADA.fondo }} /> Rayado: {CONDICIONADA.nombre.toLowerCase()} (hospital a más de {HOSPITAL_LEJOS_KM} km)<b>{condicionadas}</b>
                    </div>
                  )}
                  <div className="leyenda-pista">{resaltado ? 'Pulsa otra vez para ver todos.' : 'Pulsa un tipo para verlo solo.'}</div>
                </>
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

          {/* 3. Resultado */}
          <aside className="columna col-resultado" aria-label="Resultado">
            {sel ? (
              <>
                <div className="resultado-barra">
                  <button className="volver" onClick={() => setSeleccionado(null)}><Icono nombre="volver" tamano={18} /> Volver a la lista</button>
                </div>
                <Ficha r={sel} antes={selAntes ?? sel} m={porIne.get(sel.ine)!} porIne={porIne} escenario={escenario} umbrales={umbrales}
                  inversion={inversiones[sel.ine] ?? SIN_INVERSION} onInvertir={(inv) => invertir(sel.ine, inv)} />
              </>
            ) : (
              <>
                <TituloColumna numero={3} texto="Resultado" ayuda={`Los 155 municipios hasta ${escenario.anio}`} />
                <section className="resultado-vaso">
                  <Vaso capacidad={capacidad} dentro={dentro} fuera={sinSitio} compacto
                    notaLibre={reequilibrio
                      ? 'pero lejos de donde falta o en pueblos con el hospital lejos.'
                      : 'pero en municipios a los que no va la gente: ahí apunta el reequilibrio.'}
                    origen={<OrigenTodos llegan={dentro + sinSitio} anio={escenario.anio} reequilibrio={reequilibrio} />} />
                </section>
                {reequilibrio && <Reubicacion resumen={reubicacion} sinSitio={sinSitio} porIne={porIne} onElegir={elegir} />}
                <Listas resultados={resultados} porIne={porIne} resaltado={resaltado} onElegir={elegir} />
              </>
            )}
          </aside>

          {/* Navegación del móvil: una columna cada vez */}
          <nav className="nav-movil" aria-label="Partes del mapa">
            {([['escenario', 'Escenario', 'ritmo'], ['mapa', 'Mapa', 'mapa'], ['resultado', sel ? 'Ficha' : 'Resultado', 'personas']] as [VistaMovil, string, NombreIcono][]).map(([v, t, i]) => (
              <button key={v} className={vistaMovil === v ? 'activa' : ''} onClick={() => setVistaMovil(v)}><Icono nombre={i} tamano={20} />{t}</button>
            ))}
          </nav>
        </main>
      )}
    </div>
  )
}

/** Cifras de la portada. Son sumas de lo que ya han calculado Python y el motor. */
function totalesInicio(municipios: Municipio[], resultados: ResultadoMunicipio[], anio: number,
  vaso: { capacidad: number; dentro: number; fuera: number; reequilibrio: boolean }): Totales {
  const suma = (lista: Municipio[], anioPob: number) => lista.reduce((s, m) => s + (m.poblacion[String(anioPob)] ?? 0), 0)
  const universo = municipios.filter((m) => m.universo)
  return {
    municipios: resultados.length,
    vecinos: suma(universo, ANIO_BASE),
    crecimientoPequenos: suma(universo, ANIO_BASE) / suma(universo, ANIO_BASE - 10) - 1,
    crecimientoComunidad: suma(municipios, ANIO_BASE) / suma(municipios, ANIO_BASE - 10) - 1,
    anio,
    ...vaso,
  }
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

function TituloColumna({ numero, texto, ayuda }: { numero: number; texto: string; ayuda: string }) {
  return (
    <div className="titulo-columna">
      <span className="paso">{numero}</span>
      <div><b>{texto}</b><span>{ayuda}</span></div>
    </div>
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

function Listas({ resultados, porIne, resaltado, onElegir }: {
  resultados: ResultadoMunicipio[]; porIne: Map<string, Municipio>; resaltado: Tipo | null; onElegir: (ine: string) => void
}) {
  const [lista, setLista] = useState<Lista>('tension')
  const margen = {
    valor: (r: ResultadoMunicipio) => Math.abs(r.margen),
    texto: (r: ResultadoMunicipio) => (r.margen < 0 ? `−${miles(-r.margen)}` : `+${miles(r.margen)}`),
  }
  // Si se ha pulsado un tipo en la leyenda, la lista enseña solo ese tipo
  const config = resaltado ? {
    titulo: `${TIPOS[resaltado].nombre}: ${TIPOS[resaltado].que}`,
    ayuda: 'Personas que sobran (−) o sitio libre (+).',
    filas: resultados.filter((r) => r.tipo === resaltado).sort((a, b) => Math.abs(b.margen) - Math.abs(a.margen)),
    ...margen, color: () => TIPOS[resaltado].color,
  } : {
    tension: {
      titulo: 'Donde más gente se queda sin sitio', ayuda: 'Personas, en el escenario elegido.',
      filas: resultados.filter((r) => r.tipo === 'tension').sort((a, b) => a.margen - b.margen),
      ...margen, color: () => TIPOS.tension.color,
    },
    oportunidad: {
      titulo: 'Donde hay sitio y no llega gente', ayuda: 'Personas, en el escenario elegido.',
      filas: resultados.filter((r) => r.tipo === 'oportunidad').sort((a, b) => b.margen - a.margen),
      ...margen, color: () => TIPOS.oportunidad.color,
    },
    crecimiento: {
      titulo: 'Los que más crecerían', ayuda: 'Sobre su población actual.',
      filas: [...resultados].sort((a, b) => b.crecimiento - a.crecimiento),
      valor: (r: ResultadoMunicipio) => r.crecimiento, texto: (r: ResultadoMunicipio) => `+${pct(r.crecimiento)}`,
      color: (r: ResultadoMunicipio) => colorCrecimiento(r.crecimiento),
    },
  }[lista]
  const top = config.filas.slice(0, 8)
  const max = top.length ? config.valor(top[0]) || 1 : 1

  return (
    <section className="ranking">
      {!resaltado && (
        <div className="tabs-lista" role="tablist" aria-label="Listas">
          {([['tension', 'Sin sitio'], ['oportunidad', 'Con sitio'], ['crecimiento', 'Más crecen']] as [Lista, string][]).map(([v, t]) => (
            <button key={v} role="tab" aria-selected={lista === v} className={lista === v ? 'activa' : ''} onClick={() => setLista(v)}>{t}</button>
          ))}
        </div>
      )}
      <h2>{config.titulo}</h2>
      <p className="ayuda">{config.ayuda} Pulsa uno para ver su ficha.</p>
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
