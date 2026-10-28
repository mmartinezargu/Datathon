// Portada: la pregunta del reto, el vaso de los 155 municipios y tres puertas para entrar.

import { Icono, type NombreIcono } from './Iconos'
import { Vaso } from './Vaso'
import { OrigenTodos } from './OrigenVaso'
import { PREVISION_CM } from '../motor'
import { miles, pct } from '../formato'

export interface Totales {
  municipios: number
  vecinos: number
  crecimientoPequenos: number // crecimiento 2015-2025 de los municipios del reto
  crecimientoComunidad: number // crecimiento 2015-2025 de toda la Comunidad
  anio: number
  personas: number // personas que llegan a los 155 hasta anio (escenario.personas)
  ritmoDecada: boolean // personas es el escenario por defecto: el ritmo de la última década
  capacidad: number // suma de lo que cabe en los 155
  dentro: number // de lo que llega, lo que cabe
  fuera: number // de lo que llega, lo que no cabe
  reequilibrio: boolean // si se reubica lo que no cabe en municipios cercanos con sitio
  nota: string // bajo el vaso: el sitio que queda en otros municipios y cuánto se aprovecha reubicando
}

export type Destino = 'mapa' | 'plan' | 'atraer' | 'mudanza' | 'acierta' | 'metodologia'

const PUERTAS: { destino: Destino; icono: NombreIcono; quien: string; que: string; boton: string }[] = [
  { destino: 'mapa', icono: 'mapa', quien: 'Soy gestor público', que: 'Qué municipios se desbordan y por qué, qué hay que construir y a dónde conviene atraer a la gente.', boton: 'Abrir el mapa' },
  { destino: 'mudanza', icono: 'vivir', quien: 'Busco dónde vivir', que: 'Dinos quién eres y qué necesitas, y te enseñamos dónde habrá sitio para ti.', boton: 'Buscar municipio' },
  { destino: 'acierta', icono: 'fiable', quien: '¿Es fiable?', que: 'Lo probamos contra el pasado: con datos hasta 2015 predijimos 2015-2025 y lo comparamos con lo que pasó.', boton: 'Ver la prueba' },
]

/** La otra herramienta del gestor, además del mapa: el plan (qué construir y, al final, dónde promocionar). */
const ATAJOS: { destino: Destino; icono: NombreIcono; nombre: string; que: string }[] = [
  { destino: 'plan', icono: 'plan', nombre: 'Plan', que: 'Qué construir, cuánto cuesta y a dónde atraer a cada tipo de vecino' },
]

export function Inicio({ totales, onIr }: { totales: Totales; onIr: (d: Destino) => void }) {
  const t = totales
  return (
    <div className="inicio">
      <section className="inicio-portada">
        <div className="inicio-texto">
          <h1>¿Dónde cabe la nueva población de Madrid?</h1>
          <p className="inicio-lead">
            La Comunidad de Madrid prevé llegar a {miles(PREVISION_CM.poblacion / 1e6)} millones de habitantes en {PREVISION_CM.anio}.
            CABIDA mira los {t.municipios} municipios de menos de 50.000:{' '}
            {t.ritmoDecada ? 'si siguen creciendo como en la última década, les llegarán' : 'con el escenario elegido, les llegarán'}{' '}
            {miles(t.personas)} personas hasta {t.anio}. ¿Cuántas caben sin desbordar casas, colegios ni centros de salud?
          </p>
          <div className="inicio-datos">
            <div><b>{t.municipios}</b><span>municipios de menos de 50.000 habitantes</span></div>
            <div><b>{miles(t.vecinos)}</b><span>vecinos hoy</span></div>
            <div><b>+{pct(t.crecimientoPequenos)}</b><span>crecieron en 2015-2025, frente al +{pct(t.crecimientoComunidad)} de la Comunidad</span></div>
          </div>
        </div>
        <div className="inicio-vaso">
          <p className="inicio-vaso-titulo">Si sigue el ritmo actual, hasta {t.anio}, con los colegios y centros de salud de hoy:</p>
          <Vaso capacidad={t.capacidad} dentro={t.dentro} fuera={t.fuera} nota={t.nota}
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

      <section className="atajos" aria-label="También para el gestor">
        <p className="atajos-titulo">También para el gestor</p>
        <div className="atajos-fila">
          {ATAJOS.map((a) => (
            <button key={a.destino} className="atajo" onClick={() => onIr(a.destino)}>
              <span className="atajo-icono"><Icono nombre={a.icono} tamano={22} /></span>
              <span className="atajo-texto"><b>{a.nombre}</b><span>{a.que}</span></span>
              <span className="atajo-flecha" aria-hidden="true">→</span>
            </button>
          ))}
        </div>
      </section>

      <p className="inicio-pie">
        Todo sale de datos abiertos del INE, el Portal de Datos Abiertos de la Comunidad de Madrid y el IDEM.{' '}
        <button className="enlace" onClick={() => onIr('metodologia')}>Cómo funciona</button>
      </p>
    </div>
  )
}
