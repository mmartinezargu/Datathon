// Portada: la pregunta del reto, el vaso de los 155 municipios y tres puertas para entrar.

import { Icono, type NombreIcono } from './Iconos'
import { Vaso } from './Vaso'
import { OrigenTodos } from './OrigenVaso'
import { miles, pct } from '../formato'

export interface Totales {
  municipios: number
  vecinos: number
  crecimientoPequenos: number // crecimiento 2015-2025 de los municipios del reto
  crecimientoComunidad: number // crecimiento 2015-2025 de toda la Comunidad
  anio: number
  capacidad: number // suma de lo que cabe en los 155
  dentro: number // de lo que llega, lo que cabe
  fuera: number // de lo que llega, lo que no cabe
  reequilibrio: boolean // si se reubica lo que no cabe en pueblos cercanos con sitio
}

export type Destino = 'mapa' | 'mudanza' | 'reparto' | 'acierta' | 'metodologia'

const PUERTAS: { destino: Destino; icono: NombreIcono; quien: string; que: string; boton: string }[] = [
  { destino: 'mapa', icono: 'mapa', quien: 'Soy gestor público', que: 'Qué municipios se desbordan, por qué, y qué pasa si se construye un colegio o un centro de salud.', boton: 'Abrir el mapa' },
  { destino: 'mudanza', icono: 'vivir', quien: 'Busco dónde vivir', que: 'Dinos quién eres y qué necesitas, y te enseñamos dónde habrá sitio para ti.', boton: 'Buscar municipio' },
  { destino: 'acierta', icono: 'fiable', quien: '¿Es fiable?', que: 'Lo probamos contra el pasado: con datos hasta 2015 predijimos 2015-2025 y lo comparamos con lo que pasó.', boton: 'Ver la prueba' },
]

export function Inicio({ totales, onIr }: { totales: Totales; onIr: (d: Destino) => void }) {
  const t = totales
  return (
    <div className="inicio">
      <section className="inicio-portada">
        <div className="inicio-texto">
          <h1>¿Dónde cabe la nueva población de Madrid?</h1>
          <p className="inicio-lead">
            La Comunidad de Madrid ganará más de un millón de habitantes hasta 2039. CABIDA calcula, pueblo a pueblo,
            cuánta gente llegará y cuánta cabe sin desbordar casas, colegios ni centros de salud.
          </p>
          <div className="inicio-datos">
            <div><b>{t.municipios}</b><span>municipios de menos de 50.000 habitantes</span></div>
            <div><b>{miles(t.vecinos)}</b><span>vecinos hoy</span></div>
            <div><b>+{pct(t.crecimientoPequenos)}</b><span>crecieron en 2015-2025, frente al +{pct(t.crecimientoComunidad)} de la Comunidad</span></div>
          </div>
        </div>
        <div className="inicio-vaso">
          <p className="inicio-vaso-titulo">Si sigue el ritmo actual, hasta {t.anio}, con los colegios y centros de salud de hoy:</p>
          <Vaso capacidad={t.capacidad} dentro={t.dentro} fuera={t.fuera} notaLibre="pero en municipios a los que no va la gente."
            origen={<OrigenTodos llegan={t.dentro + t.fuera} anio={t.anio} reequilibrio={t.reequilibrio} />} />
        </div>
      </section>

      <section className="puertas" aria-label="Por dónde empezar">
        {PUERTAS.map((p) => (
          <button key={p.destino} className="puerta" onClick={() => onIr(p.destino)}>
            <span className="puerta-icono"><Icono nombre={p.icono} tamano={28} /></span>
            <span className="puerta-quien">{p.quien}</span>
            <span className="puerta-que">{p.que}</span>
            <span className="puerta-boton">{p.boton}</span>
          </button>
        ))}
      </section>

      <p className="inicio-pie">
        Todo sale de datos abiertos del INE, el Portal de Datos Abiertos de la Comunidad de Madrid y el IDEM.{' '}
        <button className="enlace" onClick={() => onIr('metodologia')}>Cómo funciona</button>
      </p>
    </div>
  )
}
