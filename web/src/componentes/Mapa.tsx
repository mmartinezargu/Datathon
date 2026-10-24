// Mapa de los municipios con MapLibre (librería de mapas web, libre y gratuita).
// No usa mapa de fondo de terceros: solo los contornos oficiales del IDEM.
// Así funciona sin conexión a servicios externos el día de la final.

import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

interface Props {
  limites: GeoJSON.FeatureCollection
  /** ine -> color de relleno; los que no estén salen en gris claro */
  colores: Record<string, string>
  seleccionado: string | null
  onSeleccionar: (ine: string | null) => void
}

const GRIS_FUERA = '#E3E8EC' // municipios fuera del reto (más de 50.000 hab.)

export function Mapa({ limites, colores, seleccionado, onSeleccionar }: Props) {
  const contenedor = useRef<HTMLDivElement>(null)
  const mapa = useRef<maplibregl.Map | null>(null)
  const listo = useRef(false)
  // Guardamos el callback en una ref para no recrear el mapa cuando cambie
  const alSeleccionar = useRef(onSeleccionar)
  alSeleccionar.current = onSeleccionar

  // 1. Crear el mapa una sola vez
  useEffect(() => {
    if (!contenedor.current) return
    const m = new maplibregl.Map({
      container: contenedor.current,
      style: { version: 8, sources: {}, layers: [{ id: 'fondo', type: 'background', paint: { 'background-color': '#F7F9FB' } }] },
      bounds: [[-4.58, 39.88], [-3.05, 41.17]], // Comunidad de Madrid
      fitBoundsOptions: { padding: 20 },
      attributionControl: { compact: true, customAttribution: 'Límites: IDEM, Comunidad de Madrid (CC BY 4.0)' },
      dragRotate: false,
    })
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-left')

    m.on('load', () => {
      m.addSource('municipios', { type: 'geojson', data: limites, promoteId: 'ine' })
      m.addLayer({
        id: 'relleno', type: 'fill', source: 'municipios',
        paint: { 'fill-color': ['coalesce', ['get', 'color'], GRIS_FUERA], 'fill-opacity': 0.92 },
      })
      m.addLayer({
        id: 'borde', type: 'line', source: 'municipios',
        paint: { 'line-color': '#FFFFFF', 'line-width': 0.7 },
      })
      m.addLayer({
        id: 'seleccion', type: 'line', source: 'municipios',
        paint: { 'line-color': '#16232E', 'line-width': 2.4 },
        filter: ['==', ['get', 'ine'], ''],
      })
      listo.current = true
      pintar()
    })

    // Etiqueta flotante con el nombre al pasar el ratón
    const etiqueta = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 8 })
    m.on('mousemove', 'relleno', (e) => {
      const f = e.features?.[0]
      if (!f) return
      m.getCanvas().style.cursor = f.properties.universo ? 'pointer' : ''
      etiqueta.setLngLat(e.lngLat).setText(f.properties.nombre).addTo(m)
    })
    m.on('mouseleave', 'relleno', () => {
      m.getCanvas().style.cursor = ''
      etiqueta.remove()
    })
    m.on('click', (e) => {
      const f = m.queryRenderedFeatures(e.point, { layers: ['relleno'] })[0]
      alSeleccionar.current(f && f.properties.universo ? String(f.properties.ine) : null)
    })

    mapa.current = m
    return () => m.remove()
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
        properties: { ...f.properties, color: colores[String(f.properties?.ine)] ?? null },
      })),
    }
    ;(m.getSource('municipios') as maplibregl.GeoJSONSource).setData(datos)
  }
  useEffect(pintar)

  // 3. Resaltar el municipio seleccionado
  useEffect(() => {
    const m = mapa.current
    if (!m || !listo.current) return
    m.setFilter('seleccion', ['==', ['get', 'ine'], seleccionado ?? ''])
  }, [seleccionado])

  return <div ref={contenedor} className="mapa" />
}
