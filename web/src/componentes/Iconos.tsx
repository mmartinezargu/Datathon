// Iconos de CABIDA, dibujados a mano en SVG (sin librerías).
// Todos usan "currentColor": toman el color del texto que los rodea.

import type { ReactNode } from 'react'

export type NombreIcono =
  | 'inicio' | 'mapa' | 'vivir' | 'repartir' | 'fiable' | 'metodo'
  | 'vivienda' | 'colegios' | 'sanidad' | 'ritmo'
  | 'personas' | 'volver' | 'descarga' | 'plegar' | 'desplegar' | 'ojo' | 'plan'

const TRAZOS: Record<NombreIcono, ReactNode> = {
  inicio: <><path d="M4 11.5 12 5l8 6.5" /><path d="M6.5 10v9h11v-9" /><path d="M10 19v-5h4v5" /></>,
  mapa: <><path d="M3.5 6.5 9 4.5l6 2 5.5-2v13l-5.5 2-6-2-5.5 2z" /><path d="M9 4.5v13" /><path d="M15 6.5v13" /></>,
  vivir: <><rect x="5" y="8" width="14" height="11" rx="2" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /><path d="M5 12.5h14" /></>,
  repartir: <><circle cx="5.5" cy="12" r="2" /><path d="M7.5 12h4" /><path d="M11.5 12 18 6" /><path d="M11.5 12H18" /><path d="M11.5 12 18 18" /><circle cx="19" cy="6" r="1.2" /><circle cx="19" cy="12" r="1.2" /><circle cx="19" cy="18" r="1.2" /></>,
  fiable: <><circle cx="12" cy="12" r="8" /><path d="m8.3 12.2 2.6 2.6 5-5.3" /></>,
  metodo: <><path d="M5 5.5h5.5a2 2 0 0 1 2 2V19a1.6 1.6 0 0 0-1.6-1.6H5z" /><path d="M19 5.5h-5.5a2 2 0 0 0-2 2V19a1.6 1.6 0 0 1 1.6-1.6H19z" /></>,
  vivienda: <><path d="M4 11 12 4.5 20 11" /><path d="M6.5 9.5V19h11V9.5" /><rect x="10" y="13" width="4" height="6" /></>,
  colegios: <><path d="m3 9 9-4.5L21 9l-9 4.5z" /><path d="M7 11v4.5c1.4 1.3 3 2 5 2s3.6-.7 5-2V11" /><path d="M21 9v5" /></>,
  sanidad: <><rect x="4.5" y="4.5" width="15" height="15" rx="3.5" /><path d="M12 8.5v7" /><path d="M8.5 12h7" /></>,
  ritmo: <><path d="M4 17 9.5 11.5l3.5 3.5L20 8" /><path d="M15 8h5v5" /></>,
  personas: <><circle cx="9" cy="8.5" r="3" /><path d="M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5" /><circle cx="17" cy="9.5" r="2.4" /><path d="M15.6 14.3c2.4-.3 4.3 1.2 4.9 4.2" /></>,
  volver: <><path d="M19 12H5" /><path d="m11 6-6 6 6 6" /></>,
  descarga: <><path d="M12 4v11" /><path d="m7 10.5 5 5 5-5" /><path d="M5 19.5h14" /></>,
  plegar: <><path d="m14.5 6-6 6 6 6" /></>,
  desplegar: <><path d="m9.5 6 6 6-6 6" /></>,
  plan: <><rect x="5.5" y="4.5" width="13" height="16" rx="2" /><path d="M9.5 4.5V3.5h5v1" /><path d="m8.8 11.5 1.8 1.8 3.6-3.8" /><path d="M9 16.5h6" /></>,
  ojo: <><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="2.8" /></>,
}

export function Icono({ nombre, tamano = 20, className }: { nombre: NombreIcono; tamano?: number; className?: string }) {
  return (
    <svg className={className ? `icono ${className}` : 'icono'} width={tamano} height={tamano} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {TRAZOS[nombre]}
    </svg>
  )
}
