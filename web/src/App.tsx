// Pantalla principal de CABIDA.
// Pestañas arriba. La de "Mapa del gestor" va en 3 columnas, en el orden en que se usa:
//   1 Escenario (lo que mueves)  ->  2 Mapa (lo que miras)  ->  3 Resultado (lo que lees)

import { useEffect, useMemo, useState } from 'react'
import { Mapa, type InfoEtiqueta } from './componentes/Mapa'
import { Palancas } from './componentes/Palancas'
import { Ficha } from './componentes/Ficha'
import { Descarga } from './componentes/Descarga'
import { Mudanza } from './componentes/Mudanza'
import { Atraer } from './componentes/Atraer'
import { Metodologia } from './componentes/Metodologia'
import { Plan } from './componentes/Plan'
import { PromocionarEnPlan } from './componentes/Promocionar'
import { Inicio, type Destino, type Totales } from './componentes/Inicio'
import { Vaso } from './componentes/Vaso'
import { OrigenTodos } from './componentes/OrigenVaso'
import { Reubicacion } from './componentes/Reubicacion'
import { Buscador } from './componentes/Buscador'
import { Icono, type NombreIcono } from './componentes/Iconos'
import { FILTROS_INICIALES } from './mudanza'
import { FILTROS_REPARTO, MEZCLA_SUPUESTA } from './reparto'
import { MEDIDAS, radioReubicacion, umbralHospital } from './medida'
import {
  ANIO_BASE, PARAMETROS_PLAN, RITMO_ANUAL, SIN_INVERSION, anadirObra, calcular, calcularUmbrales, cifrasCabecera, costeObra, escenarioDelPlan,
  escenarioPorDefecto, inversionesDe, inversionesPorZona, nuevaObra, obraSugerida, quedanSinSitio, resultadosSinPlan as sinPlan,
  resumenReubicacion, sitioLibre,
} from './motor'
import { COLOR_APAGADO, CONDICIONADA, ESCALA_CRECIMIENTO, ORDEN_TIPOS, TIPOS, colorCrecimiento, textoSobre } from './colores'
import type { DatosValidacion, Escenario, FiltrosMudanza, FiltrosReparto, Municipio, Obra, OpcionesPlan, ParametrosPlan, Perfil, ResultadoMunicipio, Tipo, ZonaSalud } from './tipos'
import { caben, miles, millones, pct } from './formato'
import './estilo.css'
import './diseno.css'

type Pestana = 'inicio' | 'mapa' | 'plan' | 'mudanza' | 'atraer' | 'metodologia'
type ColorMapa = 'tipo' | 'crecimiento'
type VistaMovil = 'escenario' | 'mapa' | 'resultado'
type Paneles = { escenario: boolean; resultado: boolean } // true = plegado

// Cada pestaña tiene su enlace (cabida.vercel.app/#mapa): sirve para compartirla y para la demo
const HASH: Record<Pestana, string> = { inicio: '', mapa: 'mapa', plan: 'plan', mudanza: 'vivir', atraer: 'atraer', metodologia: 'como' }
// El antiguo enlace de «¿Es fiable?» lleva a la sección «¿Acierta?», al final de «Cómo funciona»
const ENLACE_ACIERTA = '#fiable'
// «Atraer» se llamó «Repartir» (#repartir): el enlace antiguo lleva allí
const ENLACE_REPARTIR = '#repartir'
const pestanaDelEnlace = (): Pestana =>
  window.location.hash === ENLACE_ACIERTA ? 'metodologia'
    : window.location.hash === ENLACE_REPARTIR ? 'atraer'
    : (Object.keys(HASH) as Pestana[]).find((p) => HASH[p] && `#${HASH[p]}` === window.location.hash) ?? 'inicio'

// Paneles plegados del mapa: se recuerdan en el navegador (puede fallar en modo privado: entonces, abiertos)
const CLAVE_PANELES = 'cabida.paneles'
function leerPaneles(): Paneles {
  try {
    const p = JSON.parse(window.localStorage.getItem(CLAVE_PANELES) ?? '{}')
    return { escenario: p.escenario === true, resultado: p.resultado === true }
  } catch {
    return { escenario: false, resultado: false }
  }
}

const PESTANAS: { id: Pestana; texto: string; icono: NombreIcono }[] = [
  { id: 'inicio', texto: 'Inicio', icono: 'inicio' },
  { id: 'mapa', texto: 'Mapa del gestor', icono: 'mapa' },
  { id: 'plan', texto: 'Plan', icono: 'plan' },
  { id: 'mudanza', texto: 'Dónde vivir', icono: 'vivir' },
  { id: 'metodologia', texto: 'Cómo funciona', icono: 'metodo' },
]

export default function App() {
  const [municipios, setMunicipios] = useState<Municipio[] | null>(null)
  const [zonas, setZonas] = useState<ZonaSalud[] | null>(null)
  const [limites, setLimites] = useState<GeoJSON.FeatureCollection | null>(null)
  const [validacion, setValidacion] = useState<DatosValidacion | null>(null)
  // La web abre midiendo en minutos en coche (el motor y los tests parten de km)
  const [escenario, setEscenario] = useState<Escenario>(() => escenarioPorDefecto(2035, 'min'))
  const [seleccionado, setSeleccionado] = useState<string | null>(null)
  const [pestana, setPestanaEstado] = useState<Pestana>(pestanaDelEnlace)
  const [colorMapa, setColorMapa] = useState<ColorMapa>('tipo')
  const [resaltado, setResaltado] = useState<Tipo | null>(null)
  const [vistaMovil, setVistaMovil] = useState<VistaMovil>('mapa')
  const [leyendaAbierta, setLeyendaAbierta] = useState(false)
  const [mapaLimpio, setMapaLimpio] = useState(false) // sin cifras ni leyenda encima del mapa
  const [paneles, setPaneles] = useState<Paneles>(leerPaneles)
  const [salto, setSalto] = useState(0) // sube cada vez que hay que bajar a «¿Acierta?»
  // El plan de la pestaña «Plan»: el mapa lo cuenta siempre (una sola lista de obras)
  const [obras, setObras] = useState<Obra[]>([])
  const [parametrosPlan, setParametrosPlan] = useState<ParametrosPlan>(PARAMETROS_PLAN)
  const [opcionesPlan, setOpcionesPlan] = useState<OpcionesPlan>({})
  // «Reubicar» propio de la pestaña «Plan» (por defecto, sí: las cifras del guion son reubicando)
  const [planReubica, setPlanReubica] = useState(true)
  const [filtros, setFiltros] = useState<FiltrosMudanza>(FILTROS_INICIALES)
  const [comparados, setComparados] = useState<string[]>([])
  const [mezcla, setMezcla] = useState<Record<Perfil, number>>(MEZCLA_SUPUESTA)
  const [filtrosReparto, setFiltrosReparto] = useState<FiltrosReparto>(FILTROS_REPARTO)

  // Cambiar de pestaña también cambia el enlace; los botones atrás/adelante del navegador funcionan
  const setPestana = (p: Pestana) => {
    setPestanaEstado(p)
    const destino = HASH[p] ? `#${HASH[p]}` : window.location.pathname
    if (destino !== window.location.hash) window.history.pushState(null, '', destino)
  }
  const irAAcierta = () => {
    setPestanaEstado('metodologia')
    if (window.location.hash !== ENLACE_ACIERTA) window.history.pushState(null, '', ENLACE_ACIERTA)
    setSalto((n) => n + 1)
  }
  useEffect(() => {
    const alCambiar = () => {
      setPestanaEstado(pestanaDelEnlace())
      setSalto((n) => n + 1)
    }
    window.addEventListener('popstate', alCambiar)
    return () => window.removeEventListener('popstate', alCambiar)
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem(CLAVE_PANELES, JSON.stringify(paneles))
    } catch {
      // sin almacenamiento (modo privado): no se recuerda, y ya está
    }
  }, [paneles])
  const plegar = (panel: keyof Paneles, plegado: boolean) => setPaneles((p) => ({ ...p, [panel]: plegado }))

  // Cargar los datos que preparó Python
  useEffect(() => {
    const archivos = ['municipios.json', 'zonas_salud.json', 'limites.geojson', 'validacion.json']
    // En la copia sin internet los datos ya vienen dentro del HTML; si no, se piden al servidor
    const cargar = (f: string): Promise<unknown> =>
      window.__DATOS_CABIDA__?.[f] !== undefined ? Promise.resolve(window.__DATOS_CABIDA__[f]) : fetch(`datos/${f}`).then((r) => r.json())
    Promise.all(archivos.map(cargar)).then(([m, z, l, v]) => {
      setMunicipios(m as Municipio[])
      setZonas(z as ZonaSalud[])
      setLimites(l as GeoJSON.FeatureCollection)
      setValidacion(v as DatosValidacion)
    })
  }, [])

  // Recalcular solo cuando cambian los datos, las palancas o el plan
  const inversiones = useMemo(() => inversionesDe(obras), [obras])
  // Con «Reubicar» o con un plan cargado, los colores salen de lo que falta después de reubicar y con las obras
  const tiposDespues = obras.length > 0 || escenario.reequilibrio
  const resultados = useMemo(
    () => (municipios && zonas ? calcular(municipios, zonas, escenario, inversiones, { tiposDespues }) : []),
    [municipios, zonas, escenario, inversiones, tiposDespues],
  )
  // Lo mismo sin el plan: «Dónde vivir» cuenta siempre con lo que hay hoy, y «Atraer» enseña cuántos más caben gracias a las obras
  const resultadosSinPlan = useMemo(
    () => (municipios && zonas && obras.length ? sinPlan(municipios, zonas, escenario) : resultados),
    [municipios, zonas, escenario, obras.length, resultados],
  )
  // Para la nota del vaso: cuánta gente se reubicaría con el radio elegido, también con el interruptor apagado
  const reubicables = useMemo(
    () => (municipios && zonas && !escenario.reequilibrio
      ? resumenReubicacion(calcular(municipios, zonas, { ...escenario, reequilibrio: true }, inversiones)).personas : null),
    [municipios, zonas, escenario, inversiones],
  )
  const umbrales = useMemo(
    () => (municipios && zonas ? calcularUmbrales(municipios.filter((m) => m.universo), zonas, escenario.exigencia) : null),
    [municipios, zonas, escenario.exigencia],
  )
  const porIne = useMemo(() => new Map((municipios ?? []).map((m) => [m.ine, m])), [municipios])
  const sueloEstimado = useMemo(() => {
    const con = (municipios ?? []).filter((m) => m.universo && m.capacidad?.viv_previstas_con_estimacion)
    return { municipios: con.length, viviendas: con.reduce((s, m) => s + m.capacidad!.viv_previstas_estimadas, 0) }
  }, [municipios])
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
  // Con el enlace #fiable, baja a la sección «¿Acierta?» en cuanto está dibujada
  const cargado = validacion !== null
  useEffect(() => {
    if (cargado && pestana === 'metodologia' && window.location.hash === ENLACE_ACIERTA) {
      document.getElementById('acierta')?.scrollIntoView()
    }
  }, [cargado, pestana, salto])

  const etiquetas = useMemo<Record<string, InfoEtiqueta>>(
    () => Object.fromEntries(resultados.map((r) => [r.ine, {
      titulo: porIne.get(r.ine)?.nombre ?? '',
      linea: `${r.condicionada ? CONDICIONADA.nombre : TIPOS[r.tipo].nombre}: llegan ${miles(r.llegan)}, caben ${caben(r.caben)} sin ampliar`,
    }])),
    [resultados, porIne],
  )

  if (!municipios || !zonas || !limites || !validacion || !umbrales) {
    return <div className="cargando"><Logo /> Cargando los datos de los 155 municipios…</div>
  }

  // Con la reubicación, lo que va a pueblos cercanos pasa de «sin sitio» a «caben»
  const reubicacion = resumenReubicacion(resultados)
  const { dentro, sinSitio, reubicadas: dirigidos } = cifrasCabecera(resultados)
  const reequilibrio = escenario.reequilibrio
  const capacidad = resultados.reduce((s, r) => s + r.caben, 0)
  // «Otros municipios tienen sitio para X personas más. Reubicando a menos de R se aprovechan Y; …»
  const notaVaso = `Otros municipios tienen sitio para ${miles(sitioLibre(resultados))} personas más. ` +
    `Reubicando a menos de ${radioReubicacion(escenario)} se aprovechan ${miles(reubicables ?? dirigidos)}; ` +
    'el resto está lejos o sin hospital cerca.'
  const cuenta = Object.fromEntries(ORDEN_TIPOS.map((t) => [t, resultados.filter((r) => r.tipo === t).length])) as Record<Tipo, number>
  const condicionadas = resultados.filter((r) => r.condicionada).length
  const delReto = municipios.filter((m) => m.universo).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  const sel = seleccionado ? resultados.find((r) => r.ine === seleccionado) ?? null : null
  // Con la reubicación, los municipios con los que intercambia gente el seleccionado (borde grueso en el mapa)
  const vecinos = sel && reequilibrio ? [...sel.envios.map((t) => t.destino), ...sel.llegadas.map((t) => t.origen)] : []
  const invertido = obras.reduce((s, o) => s + costeObra(o), 0)
  const mismaZona = (a: string, b: string) => porIne.get(a)?.capacidad?.zbs_codigo === porIne.get(b)?.capacidad?.zbs_codigo
  // «Planificar aquí» en la ficha: si el municipio no está en el plan, se añade (arriba de su tabla) la obra que suelta su límite
  const planificar = (r: ResultadoMunicipio) => {
    if (!obras.some((o) => o.ine === r.ine)) {
      setObras(anadirObra(obras, nuevaObra(r.ine, obraSugerida(porIne.get(r.ine)!, r, umbrales, obras, parametrosPlan), parametrosPlan)))
    }
    setPestana('plan')
  }
  // «Atraer» no está en el menú: se llega desde «Plan», así que el menú marca «Plan»
  const activa = (id: Pestana) => pestana === id || (id === 'plan' && pestana === 'atraer')
  const elegir = (ine: string | null) => {
    setSeleccionado(ine)
    if (ine) {
      setVistaMovil('resultado') // en el móvil, enseña la ficha al pulsar un municipio
      plegar('resultado', false) // y en el portátil abre el panel de resultado si estaba plegado
    }
  }

  return (
    <div className="app">
      <header className="cabecera">
        <button className="marca" onClick={() => setPestana('inicio')} aria-label="CABIDA: volver al inicio"><Logo /><span>CABIDA</span></button>
        <nav className="pestanas" aria-label="Secciones">
          {PESTANAS.map((p) => (
            <button key={p.id} className={activa(p.id) ? 'activa' : ''} aria-current={activa(p.id) ? 'page' : undefined}
              onClick={() => setPestana(p.id)}>
              <Icono nombre={p.icono} tamano={18} /><span>{p.texto}</span>
            </button>
          ))}
        </nav>
      </header>

      {pestana === 'inicio' ? (
        <main className="pagina"><Inicio totales={totalesInicio(municipios, resultados, escenario, { capacidad, dentro, fuera: sinSitio, reequilibrio, nota: notaVaso, ampliado: invertido > 0 })}
          onIr={(d: Destino) => (d === 'acierta' ? irAAcierta() : setPestana(d))} /></main>
      ) : pestana === 'metodologia' ? (
        <main className="pagina"><Metodologia escenario={escenario} validacion={validacion}
          comarcas={new Set(municipios.filter((m) => m.universo).map((m) => m.zona)).size}
          sinDatoVacias={municipios.filter((m) => m.universo && m.capacidad?.viv_vacias_sin_dato).length}
          sueloEstimado={sueloEstimado} /></main>
      ) : pestana === 'plan' ? (
        <main className="pagina">
          <Plan municipios={municipios} zonas={zonas} porIne={porIne} escenario={escenario}
            obras={obras} onObras={setObras} parametros={parametrosPlan} onParametros={setParametrosPlan}
            opciones={opcionesPlan} onOpciones={setOpcionesPlan} reubica={planReubica} onReubica={setPlanReubica}
            onFicha={(ine) => { elegir(ine); setPestana('mapa') }}
            onVerEnMapa={() => { setEscenario(escenarioDelPlan(escenario, planReubica)); setSeleccionado(null); setPestana('mapa') }} />
          {/* «Atraer» ya no está en el menú: lo que más importa de ella va aquí, y el enlace lleva a la pestaña completa (#atraer) */}
          <PromocionarEnPlan resultados={resultados} porIne={porIne} escenario={escenario} mezcla={mezcla} filtros={filtrosReparto}
            onAjustar={() => setPestana('atraer')} onVerEnMapa={(ine) => { elegir(ine); setPestana('mapa') }} />
        </main>
      ) : pestana === 'mudanza' ? (
        <main className="pagina">
          <Mudanza resultados={resultadosSinPlan} porIne={porIne} escenario={escenario}
            filtros={filtros} onFiltros={setFiltros} comparados={comparados} onComparados={setComparados}
            onVerEnMapa={(ine) => { elegir(ine); setPestana('mapa') }} />
        </main>
      ) : pestana === 'atraer' ? (
        <main className="pagina">
          <Atraer resultados={resultados} resultadosSinPlan={resultadosSinPlan} porIne={porIne} escenario={escenario}
            mezcla={mezcla} onMezcla={setMezcla} filtros={filtrosReparto} onFiltros={setFiltrosReparto}
            obras={obras} onIrAlPlan={() => setPestana('plan')} onVerEnMapa={(ine) => { elegir(ine); setPestana('mapa') }} />
        </main>
      ) : (
        <main className={`cuerpo vista-${vistaMovil}${sel ? ' con-ficha' : ''}` +
          `${paneles.escenario ? ' sin-escenario' : ''}${paneles.resultado ? ' sin-resultado' : ''}`}>
          {/* 1. Escenario (en el portátil se puede plegar; en el móvil va como siempre) */}
          <aside className={`columna col-escenario${paneles.escenario ? ' plegada' : ''}`} aria-label="Escenario">
            <Riel numero={1} texto="Escenario" lado="izquierda" onAbrir={() => plegar('escenario', false)} />
            <BotonPlegar texto="Escenario" lado="izquierda" onPlegar={() => plegar('escenario', true)} />
            <TituloColumna numero={1} texto="Escenario" ayuda="Mueve las palancas" />
            <section className="escenario">
              <p className="frase">Hasta <b>{escenario.anio}</b>, los municipios de menos de 50.000 habitantes acogen</p>
              <div className="grande">{miles(escenario.personas)}<span> personas</span></div>
              <Palancas escenario={escenario} umbrales={umbrales} onCambiar={setEscenario} />
            </section>
            <Descarga resultados={resultados} porIne={porIne} escenario={escenario} obras={obras} />
          </aside>

          {/* 2. Mapa */}
          <div className={`columna col-mapa${mapaLimpio ? ' limpio' : ''}${obras.length ? ' con-plan' : ''}`}>
            <div className="mapa-titulo">
              <TituloColumna numero={2} texto="Mapa" ayuda="Pulsa un municipio o búscalo" />
              <Buscador municipios={delReto} onElegir={elegir} />
            </div>
            {/* Con un plan cargado, siempre a la vista (también con el mapa limpio) */}
            {obras.length > 0 && (
              <div className="franja-plan" role="status">
                <span>Con el plan: <b>{millones(invertido)}</b>, {obras.length} {obras.length === 1 ? 'obra' : 'obras'}</span>
                <span aria-hidden="true">·</span>
                <button className="enlace" onClick={() => setObras([])}>Quitar<span className="largo"> el plan</span></button>
                <span aria-hidden="true">·</span>
                <button className="enlace" onClick={() => setPestana('plan')}>Editar<span className="largo"> en Plan</span></button>
              </div>
            )}
            <Mapa limites={limites} colores={colores} etiquetas={etiquetas} rayados={rayados} vecinos={vecinos}
              seleccionado={seleccionado} onSeleccionar={elegir} />
            <button className="mapa-limpio" aria-pressed={mapaLimpio} onClick={() => setMapaLimpio(!mapaLimpio)}
              aria-label={mapaLimpio ? 'Ver cifras y leyenda' : 'Mapa limpio: esconder cifras y leyenda'}>
              <Icono nombre="ojo" tamano={17} /><span>{mapaLimpio ? 'Ver cifras y leyenda' : 'Mapa limpio'}</span>
            </button>
            {/* Las 3 cifras: si no caben en una línea, pasan a dos */}
            <div className="cifras">
              <Cifra valor={miles(dentro)}
                texto={`de las ${miles(escenario.personas)} personas caben` +
                  (invertido ? ' con el plan' : ' sin ampliar servicios') +
                  (reequilibrio ? `, reubicando ${miles(dirigidos)} en municipios cercanos` : '')} />
              <Cifra valor={miles(sinSitio)} acento={TIPOS.tension.color}
                texto={reequilibrio
                  ? `no encuentran sitio cerca${invertido ? ', aun con el plan' : ': ahí hay que invertir'}`
                  : invertido ? 'se quedarían sin sitio, aun con el plan' : 'se quedarían sin sitio: ahí hay que invertir'} />
              <Cifra valor={String(cuenta.oportunidad)} acento={TIPOS.oportunidad.color}
                texto={`municipios con sitio al que no llega gente${invertido ? ' con el plan' : ''}; en ${condicionadas} el hospital queda a más de ` +
                  `${umbralHospital(escenario.medida)}${escenario.medida === 'min' ? ` ${MEDIDAS.min.como}` : ''}`} />
            </div>
            {/* La leyenda va plegada en un botón para no tapar el mapa */}
            <div className={`leyenda${leyendaAbierta ? ' abierta' : ''}`} aria-label="Leyenda">
              <button className="leyenda-boton" aria-expanded={leyendaAbierta} onClick={() => setLeyendaAbierta(!leyendaAbierta)}>
                <span className="leyenda-muestras" aria-hidden="true">
                  {ORDEN_TIPOS.map((t) => <i key={t} style={{ background: TIPOS[t].color }} />)}
                </span>
                {leyendaAbierta ? 'Ocultar leyenda' : obras.length ? 'Leyenda con el plan' : reequilibrio ? 'Leyenda reubicando' : 'Leyenda'}
              </button>
              <div className="leyenda-cuerpo">
                {tiposDespues && colorMapa === 'tipo' && (
                  <p className="leyenda-plan">
                    {obras.length > 0
                      ? `Con el plan: colores según lo que falta ${reequilibrio ? 'después de reubicar y ' : ''}con las obras.`
                      : 'Reubicando: colores según lo que falta después de reubicar en municipios cercanos.'}
                  </p>
                )}
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
                        <i style={{ background: CONDICIONADA.fondo }} /> Rayado: {CONDICIONADA.nombre.toLowerCase()} (hospital a más de {umbralHospital(escenario.medida)}{escenario.medida === 'min' ? ' en coche' : ''})<b>{condicionadas}</b>
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
          </div>

          {/* 3. Resultado */}
          <aside className={`columna col-resultado${paneles.resultado ? ' plegada' : ''}`} aria-label="Resultado">
            <Riel numero={3} texto={sel ? 'Ficha' : 'Resultado'} lado="derecha" onAbrir={() => plegar('resultado', false)} />
            <BotonPlegar texto="Resultado" lado="derecha" onPlegar={() => plegar('resultado', true)} />
            {sel ? (
              <>
                <div className="resultado-barra">
                  <button className="volver" onClick={() => setSeleccionado(null)}><Icono nombre="volver" tamano={18} /> Volver a la lista</button>
                </div>
                <Ficha r={sel} m={porIne.get(sel.ine)!} porIne={porIne} escenario={escenario} umbrales={umbrales}
                  inversion={inversionesPorZona(inversiones, municipios)[sel.ine] ?? SIN_INVERSION}
                  enPlan={obras.filter((o) => o.ine === sel.ine || (o.tipo === 'centro_salud' && mismaZona(o.ine, sel.ine)))}
                  onPlanificar={() => planificar(sel)} onElegir={elegir} />
              </>
            ) : (
              <>
                <TituloColumna numero={3} texto="Resultado" ayuda={`Los 155 municipios hasta ${escenario.anio}`} />
                <section className="resultado-vaso">
                  <Vaso capacidad={capacidad} dentro={dentro} fuera={sinSitio} compacto ampliado={invertido > 0} nota={notaVaso}
                    origen={<OrigenTodos llegan={dentro + sinSitio} anio={escenario.anio} reequilibrio={reequilibrio} />} />
                </section>
                {reequilibrio && <Reubicacion resumen={reubicacion} medida={escenario.medida} sinSitio={sinSitio} porIne={porIne} onElegir={elegir} />}
                <Listas resultados={resultados} porIne={porIne} resaltado={resaltado} reubicar={reequilibrio} onElegir={elegir} />
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
function totalesInicio(municipios: Municipio[], resultados: ResultadoMunicipio[], esc: Escenario,
  vaso: { capacidad: number; dentro: number; fuera: number; reequilibrio: boolean; nota: string; ampliado: boolean }): Totales {
  const suma = (lista: Municipio[], anioPob: number) => lista.reduce((s, m) => s + (m.poblacion[String(anioPob)] ?? 0), 0)
  const universo = municipios.filter((m) => m.universo)
  return {
    municipios: resultados.length,
    vecinos: suma(universo, ANIO_BASE),
    crecimientoPequenos: suma(universo, ANIO_BASE) / suma(universo, ANIO_BASE - 10) - 1,
    crecimientoComunidad: suma(municipios, ANIO_BASE) / suma(municipios, ANIO_BASE - 10) - 1,
    anio: esc.anio,
    personas: esc.personas,
    ritmoDecada: esc.personas === Math.round(RITMO_ANUAL * (esc.anio - ANIO_BASE)),
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

/** Panel plegado: una franja estrecha con su nombre; al pulsarla se abre otra vez. */
function Riel({ numero, texto, lado, onAbrir }: { numero: number; texto: string; lado: 'izquierda' | 'derecha'; onAbrir: () => void }) {
  return (
    <button className="riel" onClick={onAbrir} aria-label={`Abrir el panel ${texto}`} title={`Abrir ${texto}`}>
      <Icono nombre={lado === 'izquierda' ? 'desplegar' : 'plegar'} tamano={18} />
      <span className="paso">{numero}</span>
      <span className="riel-texto">{texto}</span>
    </button>
  )
}

function BotonPlegar({ texto, lado, onPlegar }: { texto: string; lado: 'izquierda' | 'derecha'; onPlegar: () => void }) {
  return (
    <button className={`plegar plegar-${lado}`} onClick={onPlegar} aria-label={`Plegar el panel ${texto}`} title={`Plegar ${texto}: más sitio para el mapa`}>
      <Icono nombre={lado === 'izquierda' ? 'plegar' : 'desplegar'} tamano={18} />
    </button>
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
const PRIMEROS = 8 // las listas enseñan 8; el resto, con «Ver todos»

function Listas({ resultados, porIne, resaltado, reubicar, onElegir }: {
  resultados: ResultadoMunicipio[]; porIne: Map<string, Municipio>; resaltado: Tipo | null; reubicar: boolean
  onElegir: (ine: string) => void
}) {
  const [lista, setLista] = useState<Lista>('tension')
  // «Ver todos» se recuerda para la lista que se está viendo (al cambiar de lista, otra vez las 8 primeras)
  const [todosEn, setTodosEn] = useState<string | null>(null)
  const clave = resaltado ?? lista
  // Con «Reubicar» activo, a los que tienen sitio se les descuenta lo que reciben de pueblos cercanos
  const sitio = (r: ResultadoMunicipio) => (r.margen > 0 ? r.margen - r.recibe : r.margen)
  const margen = {
    valor: (r: ResultadoMunicipio) => Math.abs(sitio(r)),
    texto: (r: ResultadoMunicipio) => (sitio(r) < 0 ? `−${miles(-sitio(r))}` : `+${miles(sitio(r))}`) +
      (r.recibe >= 1 ? ` (recibe ${miles(r.recibe)})` : ''),
  }
  // Con «Reubicar» activo, en tensión cuenta lo que sigue sin sitio después de reubicar, no el exceso por tendencia
  const sinSitio = (filas: ResultadoMunicipio[]) => ({
    filas: filas.filter((r) => quedanSinSitio(r) >= 1).sort((a, b) => quedanSinSitio(b) - quedanSinSitio(a)),
    valor: quedanSinSitio,
    texto: (r: ResultadoMunicipio) => `−${miles(quedanSinSitio(r))}` + (r.envia >= 1 ? ` (envía ${miles(r.envia)})` : ''),
  })
  // Si se ha pulsado un tipo en la leyenda, la lista enseña solo ese tipo
  const config = resaltado ? {
    titulo: `${TIPOS[resaltado].nombre}: ${TIPOS[resaltado].que}`,
    ayuda: reubicar ? 'Personas que sobran (−) o sitio libre (+), después de reubicar.' : 'Personas que sobran (−) o sitio libre (+).',
    filas: resultados.filter((r) => r.tipo === resaltado).sort((a, b) => Math.abs(sitio(b)) - Math.abs(sitio(a))),
    ...margen,
    ...(reubicar && resaltado === 'tension' ? sinSitio(resultados.filter((r) => r.tipo === 'tension')) : {}),
    color: () => TIPOS[resaltado].color,
  } : {
    tension: reubicar ? {
      titulo: 'Donde más gente sigue sin sitio', ayuda: 'Personas, después de reubicar en municipios cercanos.',
      ...sinSitio(resultados.filter((r) => r.tipo === 'tension')), color: () => TIPOS.tension.color,
    } : {
      titulo: 'Donde más gente se queda sin sitio', ayuda: 'Personas, en el escenario elegido.',
      filas: resultados.filter((r) => r.tipo === 'tension').sort((a, b) => a.margen - b.margen),
      ...margen, color: () => TIPOS.tension.color,
    },
    oportunidad: {
      titulo: 'Donde hay sitio y no llega gente',
      ayuda: reubicar ? 'Sitio que les queda, después de recibir a la gente reubicada.' : 'Personas, en el escenario elegido.',
      filas: resultados.filter((r) => r.tipo === 'oportunidad').sort((a, b) => sitio(b) - sitio(a)),
      ...margen, color: () => TIPOS.oportunidad.color,
    },
    crecimiento: {
      titulo: 'Los que más crecerían', ayuda: 'Sobre su población actual.',
      filas: [...resultados].sort((a, b) => b.crecimiento - a.crecimiento),
      valor: (r: ResultadoMunicipio) => r.crecimiento, texto: (r: ResultadoMunicipio) => `+${pct(r.crecimiento)}`,
      color: (r: ResultadoMunicipio) => colorCrecimiento(r.crecimiento),
    },
  }[lista]
  // Con la reubicación, la cifra lleva «(envía …)» o «(recibe …)»: columna más ancha
  const conEnvio = reubicar && (resaltado ? true : lista !== 'crecimiento')
  const todos = todosEn === clave
  const top = todos ? config.filas : config.filas.slice(0, PRIMEROS)
  const max = top.length ? Math.max(...top.map(config.valor)) || 1 : 1

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
      <ol className={conEnvio ? 'con-envio' : undefined}>
        {top.map((r) => (
          <li key={r.ine}>
            <button onClick={() => onElegir(r.ine)}>
              <span className="r-nombre">
                {porIne.get(r.ine)?.nombre}
                {r.caben < 1 && <small className="r-limite">caben {caben(r.caben)}</small>}
              </span>
              <span className="r-barra"><span style={{ width: `${(config.valor(r) / max) * 100}%`, background: config.color(r) }} /></span>
              <span className="r-valor">{config.texto(r)}</span>
            </button>
          </li>
        ))}
      </ol>
      {config.filas.length > PRIMEROS && (
        <button className="desplegar ver-todos" aria-expanded={todos} onClick={() => setTodosEn(todos ? null : clave)}>
          {todos ? `Ver solo los ${PRIMEROS} primeros` : `Ver todos (${config.filas.length})`}
          <span className="flecha" aria-hidden="true">{todos ? '−' : '+'}</span>
        </button>
      )}
    </section>
  )
}
