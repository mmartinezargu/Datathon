// Mapa de los municipios con MapLibre (librería de mapas web, libre y gratuita).
// No usa mapa de fondo de terceros: solo los contornos oficiales del IDEM.
// Así funciona sin conexión a servicios externos el día de la final.

import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { COLOR_FUERA } from '../colores'

/** Lo que enseña la etiqueta flotante al pasar el ratón por un municipio. */
export interface InfoEtiqueta {
  titulo: string
  linea: string
}

interface Props {
  limites: GeoJSON.FeatureCollection
  /** ine -> color de relleno; los que no estén salen en el color "fuera del reto" */
  colores: Record<string, string>
  /** ine -> texto de la etiqueta flotante */
  etiquetas: Record<string, InfoEtiqueta>
  /** ine de los municipios que van rayados (oportunidad condicionada) */
  rayados: Set<string>
  /** ine de los municipios con los que intercambia gente el seleccionado (reubicación): borde grueso */
  vecinos: string[]
  seleccionado: string | null
  onSeleccionar: (ine: string | null) => void
}

export function Mapa({ limites, colores, etiquetas, rayados, vecinos, seleccionado, onSeleccionar }: Props) {
  const contenedor = useRef<HTMLDivElement>(null)
  const mapa = useRef<maplibregl.Map | null>(null)
  const listo = useRef(false)
  // Refs para que los eventos del mapa lean siempre los datos más recientes
  const alSeleccionar = useRef(onSeleccionar)
  alSeleccionar.current = onSeleccionar
  const textos = useRef(etiquetas)
  textos.current = etiquetas

  // 1. Crear el mapa una sola vez
  useEffect(() => {
    if (!contenedor.current) return
    const m = new maplibregl.Map({
      container: contenedor.current,
      style: { version: 8, sources: {}, layers: [{ id: 'fondo', type: 'background', paint: { 'background-color': '#EEF4FA' } }] },
      bounds: [[-4.58, 39.88], [-3.05, 41.17]], // Comunidad de Madrid
      fitBoundsOptions: { padding: { top: 90, bottom: 30, left: 30, right: 30 } },
      attributionControl: { compact: true, customAttribution: 'Límites: IDEM, Comunidad de Madrid (CC BY 4.0)' },
      dragRotate: false,
    })
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right')

    m.on('load', () => {
      m.addSource('municipios', { type: 'geojson', data: limites, promoteId: 'ine' })
      // Sombra suave bajo la Comunidad para que el mapa "despegue" del fondo
      m.addLayer({
        id: 'sombra', type: 'line', source: 'municipios',
        paint: { 'line-color': '#15233B', 'line-width': 6, 'line-opacity': 0.06, 'line-blur': 4, 'line-translate': [0, 3] },
      })
      m.addLayer({
        id: 'relleno', type: 'fill', source: 'municipios',
        paint: {
          'fill-color': ['coalesce', ['get', 'color'], COLOR_FUERA],
          'fill-opacity': ['case', ['boolean', ['feature-state', 'encima'], false], 0.78, 1],
        },
      })
      // Rayas blancas encima del color: oportunidad condicionada (hospital lejos)
      m.addImage('rayas', rayas(), { pixelRatio: 2 })
      m.addLayer({
        id: 'rayas', type: 'fill', source: 'municipios',
        paint: { 'fill-pattern': 'rayas' },
        filter: ['==', ['get', 'rayado'], true],
      })
      m.addLayer({
        id: 'borde', type: 'line', source: 'municipios',
        paint: { 'line-color': '#FFFFFF', 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 0.6, 11, 1.4] },
      })
      m.addLayer({
        id: 'intercambio', type: 'line', source: 'municipios',
        paint: { 'line-color': '#15233B', 'line-width': 2.5, 'line-dasharray': [2, 1] },
        filter: ['in', ['get', 'ine'], ['literal', []]],
      })
      m.addLayer({
        id: 'seleccion', type: 'line', source: 'municipios',
        paint: { 'line-color': '#15233B', 'line-width': 3 },
        filter: ['==', ['get', 'ine'], ''],
      })
      listo.current = true
      pintar()
      resaltar()
    })

    // Etiqueta flotante al pasar el ratón
    const etiqueta = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 12, className: 'etiqueta-mapa' })
    let encima: string | number | undefined
    m.on('mousemove', 'relleno', (e) => {
      const f = e.features?.[0]
      if (!f) return
      if (encima !== undefined && encima !== f.id) m.setFeatureState({ source: 'municipios', id: encima }, { encima: false })
      encima = f.id
      m.setFeatureState({ source: 'municipios', id: encima! }, { encima: true })
      m.getCanvas().style.cursor = f.properties.universo ? 'pointer' : ''
      const info = textos.current[String(f.properties.ine)]
      const caja = document.createElement('div')
      const t = document.createElement('strong')
      t.textContent = f.properties.nombre
      const l = document.createElement('span')
      l.textContent = info ? info.linea : 'Más de 50.000 habitantes: fuera del reto'
      caja.append(t, l)
      etiqueta.setLngLat(e.lngLat).setDOMContent(caja).addTo(m)
    })
    m.on('mouseleave', 'relleno', () => {
      if (encima !== undefined) m.setFeatureState({ source: 'municipios', id: encima }, { encima: false })
      encima = undefined
      m.getCanvas().style.cursor = ''
      etiqueta.remove()
    })
    m.on('click', (e) => {
      const f = m.queryRenderedFeatures(e.point, { layers: ['relleno'] })[0]
      alSeleccionar.current(f && f.properties.universo ? String(f.properties.ine) : null)
    })

    mapa.current = m
    // Si la columna del mapa cambia de tamaño (o aparece en el móvil), el mapa se reajusta
    const observador = new ResizeObserver(() => m.resize())
    observador.observe(contenedor.current)
    return () => {
      observador.disconnect()
      m.remove()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 2. Repintar cuando cambian los colores (al mover una palanca)
  function pintar() {
    const m = mapa.current
    if (!m || !listo.current) return
    const datos: GeoJSON.FeatureCollection = {
      ...limites,
      features: limites.features.map((f) => ({
        ...f,
        properties: {
          ...f.properties,
          color: colores[String(f.properties?.ine)] ?? null,
          rayado: rayados.has(String(f.properties?.ine)),
        },
      })),
    }
    ;(m.getSource('municipios') as maplibregl.GeoJSONSource).setData(datos)
  }
  useEffect(pintar)

  // 3. Resaltar el municipio seleccionado y, con la reubicación, los pueblos con los que intercambia gente
  const claveVecinos = vecinos.join(',')
  function resaltar() {
    const m = mapa.current
    if (!m || !listo.current) return
    m.setFilter('seleccion', ['==', ['get', 'ine'], seleccionado ?? ''])
    m.setFilter('intercambio', ['in', ['get', 'ine'], ['literal', claveVecinos ? claveVecinos.split(',') : []]])
  }
  useEffect(resaltar, [seleccionado, claveVecinos])

  return <div ref={contenedor} className="mapa" />
}

/** Imagen de rayas diagonales blancas semitransparentes, hecha a mano para no depender de archivos. */
function rayas(): { width: number; height: number; data: Uint8Array } {
  const lado = 12
  const data = new Uint8Array(lado * lado * 4)
  for (let y = 0; y < lado; y++) {
    for (let x = 0; x < lado; x++) {
      if ((x + y) % lado < 3) data.set([255, 255, 255, 200], (y * lado + x) * 4)
    }
  }
  return { width: lado, height: lado, data }
}
