// Texto del desplegable «¿De dónde sale esto?» que va bajo cada vaso.
// Explica en palabras llanas qué es «llegan», «caben» y «no caben», y avisa de lo que el modelo no sabe.
// Una versión para los 155 municipios juntos y otra para un municipio.

import { CRECIMIENTO_DECADA } from '../motor'
import { LIMITES, TIPOS } from '../colores'
import type { Limite } from '../tipos'
import { miles } from '../formato'

/** Los tres números del vaso, cada uno con su color y su explicación. */
function Filas({ items }: { items: { color: string; titulo: string; texto: string }[] }) {
  return (
    <dl className="origen-lista">
      {items.map((i) => (
        <div key={i.titulo}>
          <dt style={{ color: i.color }}>{i.titulo}</dt>
          <dd>{i.texto}</dd>
        </div>
      ))}
    </dl>
  )
}

const AZUL = TIPOS.oportunidad.color
const ROJO = TIPOS.tension.color
const TINTA = '#15233B'

/** Para el vaso de los 155 municipios juntos (portada y columna de resultado). */
export function OrigenTodos({ llegan, anio, reequilibrio }: { llegan: number; anio: number; reequilibrio: boolean }) {
  return (
    <>
      <Filas items={[
        {
          color: TINTA, titulo: `Llegan (${miles(llegan)})`,
          texto: `Lo que ya pasó, repetido. Entre 2015 y 2025 estos 155 pueblos ganaron ${miles(CRECIMIENTO_DECADA)} personas (Padrón del INE). ` +
            `Por defecto se supone que sigue ese ritmo hasta ${anio}, y se reparte pueblo a pueblo según cuánto creció cada uno. No es una predicción.`,
        },
        {
          color: AZUL, titulo: 'Caben',
          texto: 'En cada pueblo se miran cuatro cosas (casas, colegios, centro de salud y ritmo de crecimiento) y manda la que se queda más corta. ' +
            'Después se suma lo que cabe en cada uno de los 155.',
        },
        {
          color: ROJO, titulo: 'No caben',
          texto: reequilibrio
            ? 'Lo que llega menos lo que cabe, pueblo a pueblo. Esa gente se dirige a los pueblos con sitio libre (menos a los que tienen el hospital lejos). ' +
              'Lo que queda aquí es lo que no cabe en ninguno.'
            : 'Lo que llega menos lo que cabe, pueblo a pueblo. Esa gente no se manda a otro pueblo: el mapa solo dice dónde faltaría sitio.',
        },
      ]} />
      <p className="origen-aviso">
        <b>Ojo:</b> «caben» es una estimación, no una cifra oficial. No tenemos las plazas reales de las aulas ni de los centros de salud.
        Por defecto, un colegio o un centro se considera lleno cuando atiende a tantos vecinos como el 10 % más cargado de los pueblos de su tamaño.
        Ese criterio se cambia en «Supuestos del cálculo».
      </p>
    </>
  )
}

/** Para el vaso de un municipio (en su ficha). */
export function OrigenMunicipio({ anio, limitante }: { anio: number; limitante: Limite }) {
  return (
    <>
      <Filas items={[
        {
          color: TINTA, titulo: 'Llegan',
          texto: `Lo que ha crecido este pueblo entre 2015 y 2025, mezclado con el ritmo de su zona, y llevado hasta ${anio}. ` +
            'Si es muy pequeño, pesa más su zona para que un año raro no lo descuadre.',
        },
        {
          color: AZUL, titulo: 'Caben',
          texto: `El más bajo de cuatro límites: casas, colegios, centro de salud y ritmo de crecimiento. En este pueblo manda: ${LIMITES[limitante].nombre.toLowerCase()}.`,
        },
        {
          color: ROJO, titulo: 'No caben',
          texto: 'Lo que llega menos lo que cabe. Es la gente que se quedaría sin sitio si no se construye nada.',
        },
      ]} />
      <p className="origen-aviso">
        La cuenta exacta está más abajo, en «Ver la cuenta». Recuerda que «caben» compara con pueblos de su tamaño: no es una norma oficial.
      </p>
    </>
  )
}
