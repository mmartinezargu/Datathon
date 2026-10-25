// Pestaña «Cómo se calcula»: las fórmulas en palabras sencillas, las fuentes y lo que el modelo no sabe.
// Las cifras salen del código (motor.ts, mudanza.ts) y de los datos, no se escriben a mano:
// los supuestos se muestran con el valor que tengan ahora las palancas.

import { ANIO_BASE, COSTE_CENTRO_SALUD, COSTE_COLEGIO, CRECIMIENTO_DECADA, MARGEN_MINIMO, RITMO_ANUAL, TRAMOS_MUNICIPIO, TRAMOS_ZONA } from '../motor'
import { PERFILES } from '../mudanza'
import { ORDEN_TIPOS, TIPOS } from '../colores'
import type { Escenario, Perfil, Recurso } from '../tipos'
import type { DatosValidacion } from './Validacion'
import { miles, millones, pct } from '../formato'

/** Mismo valor que K_SUAVIZADO en etl/preparar.py. */
const K_SUAVIZADO = 5_000

const FUENTES = [
  { nombre: 'Padrón continuo: población por municipio, 2005–2025', quien: 'INE (tabla 2881)', para: 'Cuánta gente vive en cada municipio y cómo ha crecido', url: 'https://www.ine.es/jaxiT3/Tabla.htm?t=2881' },
  { nombre: 'Censo 2021: viviendas principales y no principales', quien: 'INE (tabla 59525)', para: 'Viviendas vacías o de segunda residencia', url: 'https://www.ine.es/jaxi/Tabla.htm?tpx=59525&L=0' },
  { nombre: 'Censo 2021: hogares por tamaño', quien: 'INE (tabla 59543)', para: 'Personas por hogar, para pasar de viviendas a personas', url: 'https://www.ine.es/jaxi/Tabla.htm?tpx=59543&L=0' },
  { nombre: 'Municipios de la Comunidad de Madrid', quien: 'Portal de Datos Abiertos de la Comunidad de Madrid', para: 'Zona estadística y superficie', url: 'https://datos.comunidad.madrid/dataset/0781c37e-bc64-4143-8029-18865bedbc3d' },
  { nombre: 'Centros educativos', quien: 'Portal de Datos Abiertos de la Comunidad de Madrid', para: 'Colegios de primaria e institutos en funcionamiento', url: 'https://datos.comunidad.madrid/dataset/c750856d-3166-4dac-8e80-d1b824c968b5' },
  { nombre: 'Zonas básicas de salud', quien: 'Portal de Datos Abiertos de la Comunidad de Madrid', para: 'A qué centro de salud va cada municipio y cuánta gente atiende', url: 'https://datos.comunidad.madrid/dataset/924044d0-b75e-402c-8c13-96ace11da0ff' },
  { nombre: 'Límites municipales y planeamiento urbanístico refundido 2025', quien: 'IDEM, Comunidad de Madrid', para: 'El mapa y las viviendas previstas en suelo sin desarrollar', url: 'https://idem.comunidad.madrid/' },
]

const NOMBRE_RECURSO: Record<Recurso, string> = { colegios: 'colegios', sanidad: 'centro de salud', vivienda: 'vivienda' }

export function Metodologia({ escenario, validacion }: { escenario: Escenario; validacion: DatosValidacion }) {
  const anios = escenario.anio - ANIO_BASE
  const nuestro = validacion.modelos.at(-1)!
  const tendencia = validacion.modelos.find((m) => m.modelo.startsWith('Extrapolar')) ?? validacion.modelos[1]

  return (
    <div className="metodologia">
      <section className="val-cabeza">
        <h1>Cómo se calcula</h1>
        <p>
          CABIDA hace dos preguntas a cada uno de los 155 municipios de la Comunidad de Madrid con menos de 50.000
          habitantes: <b>¿cuánta gente va a llegar?</b> y <b>¿cuánta cabe sin desbordar sus servicios?</b> Aquí está cómo
          se responde a cada una, de dónde salen los datos y qué no sabe el modelo.
        </p>
      </section>

      <section className="val-tarjeta">
        <h2>1. Cuánta gente llega</h2>
        <p>
          Se parte de cómo ha crecido cada municipio entre 2015 y 2025. Un pueblo muy pequeño puede tener un año raro,
          así que su ritmo se mezcla con el de su zona: cuanto más pequeño, más pesa la zona.
        </p>
        <p className="formula">ritmo = peso × ritmo propio + (1 − peso) × ritmo de su zona, con peso = vecinos ÷ (vecinos + {miles(K_SUAVIZADO)})</p>
        <p>
          Después se reparte el total del escenario según ese ritmo. Por defecto son las {miles(CRECIMIENTO_DECADA)} personas
          que ganaron estos municipios en la última década, unas {miles(RITMO_ANUAL)} al año. Ahora mismo está elegido:
          <b> {miles(escenario.personas)} personas hasta {escenario.anio}</b>.
        </p>
      </section>

      <section className="val-tarjeta">
        <h2>2. Cuánta gente cabe</h2>
        <p>
          Se calculan cuatro límites y <b>manda el más bajo</b>: de nada sirve tener casas si no hay plaza en el colegio.
          Los porcentajes son los supuestos que se pueden cambiar en el mapa, en «Supuestos».
        </p>
        <dl className="limites-metodo">
          <dt>Vivienda</dt>
          <dd>
            <p className="formula">(viviendas vacías o secundarias × {pct(escenario.pctVivienda, 0)} + viviendas previstas en suelo sin desarrollar × {pct(escenario.pctSuelo, 0)}) × personas por hogar</p>
          </dd>
          <dt>Colegios</dt>
          <dd>
            <p>
              Se mira cuántos vecinos atiende cada colegio en los municipios de su mismo tamaño (se agrupan con cortes en{' '}
              {y(TRAMOS_MUNICIPIO.slice(0, -1).map((t) => miles(t)))} habitantes). Un colegio está «lleno»
              cuando atiende a tantos como el {pct(1 - escenario.exigencia, 0)} más cargado de su tamaño.
              Se hace con primaria y con secundaria, y manda la que tiene menos sitio.
            </p>
            <p className="formula">colegios × vecinos por colegio cuando está lleno − vecinos de hoy</p>
            <p className="ayuda">Si no tiene colegio de un nivel, sus alumnos van a otro municipio y ese límite no aplica.</p>
          </dd>
          <dt>Sanidad</dt>
          <dd>
            <p>
              Cada municipio va a una zona básica de salud. Igual que con los colegios, se compara con las zonas de su
              tamaño (cortes en {y(TRAMOS_ZONA.slice(0, -1).map((t) => miles(t)))} personas) para saber
              cuánta gente aguanta antes de saturarse.
            </p>
            <p className="formula">(lo que aguanta la zona − lo que atiende hoy) × la parte de la zona que son vecinos del municipio</p>
          </dd>
          <dt>Ritmo</dt>
          <dd>
            <p>Aunque haya sitio, un municipio no debería crecer más de un {pct(escenario.ritmoMax, 1)} al año sin que se resientan sus calles y servicios.</p>
            <p className="formula">vecinos de hoy × ((1 + {pct(escenario.ritmoMax, 1)})^{anios} − 1)</p>
          </dd>
        </dl>
      </section>

      <section className="val-tarjeta">
        <h2>3. Qué tipo de municipio es</h2>
        <p>Se cruza lo que llega con lo que cabe. Las fronteras son la mediana de los 155: la mitad está por encima y la mitad por debajo.</p>
        <ul className="tipos-metodo">
          {ORDEN_TIPOS.map((t) => (
            <li key={t}>
              <span className="chip" style={{ background: TIPOS[t].color }}>{TIPOS[t].nombre}</span>
              <span>{REGLA[t]}</span>
            </li>
          ))}
        </ul>
        <p className="ayuda">Para no marcar «en tensión» por un puñado de personas, tienen que faltar al menos {MARGEN_MINIMO}.</p>
      </section>

      <section className="val-tarjeta">
        <h2>4. «¿Y si invertimos aquí?» y «¿Dónde me mudo?»</h2>
        <p>
          <b>Invertir.</b> Cada colegio nuevo (unos {millones(COSTE_COLEGIO)}) se suma al nivel con menos sitio. Cada centro de
          salud nuevo (unos {millones(COSTE_CENTRO_SALUD)}) añade, solo para ese municipio, lo que aguanta una zona de salud como
          la suya. Después se recalcula todo: a veces el límite pasa a otro recurso y hace falta invertir en algo más.
        </p>
        <p>
          <b>Dónde mudarse.</b> Se mira cuánto sitio le queda a cada municipio en colegios, centro de salud y vivienda
          <i> después</i> de que llegue la gente prevista, en proporción a sus vecinos. Cada perfil da un peso distinto:
        </p>
        <ul className="perfiles-metodo">
          {(Object.keys(PERFILES) as Perfil[]).map((p) => (
            <li key={p}>
              <b>{PERFILES[p].nombre}:</b>{' '}
              {(Object.entries(PERFILES[p].pesos) as [Recurso, number][]).filter(([, w]) => w > 0)
                .sort((a, b) => b[1] - a[1]).map(([k, w]) => `${NOMBRE_RECURSO[k]} ${pct(w, 0)}`).join(', ')}
            </li>
          ))}
        </ul>
      </section>

      <section className="val-tarjeta">
        <h2>5. ¿Acierta?</h2>
        <p>
          Lo probamos contra el pasado: con los datos hasta {validacion.datos_hasta}, repartimos el crecimiento que hubo de verdad
          entre {validacion.periodo.replace('-', ' y ')}. CABIDA coloca mal <b>{pct(nuestro.wape)}</b> de las personas;
          seguir la tendencia sin más, {pct(tendencia.wape)}. Lo tienes con detalle en la pestaña «Validación».
        </p>
      </section>

      <section className="val-tarjeta">
        <h2>De dónde salen los datos</h2>
        <div className="tabla-scroll">
          <table className="fuentes">
            <thead><tr><th>Dato</th><th>Quién lo publica</th><th>Para qué se usa</th></tr></thead>
            <tbody>
              {FUENTES.map((f) => (
                <tr key={f.nombre}>
                  <td><a href={f.url} target="_blank" rel="noreferrer">{f.nombre}</a></td>
                  <td>{f.quien}</td>
                  <td>{f.para}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="nota">
          Todo son datos abiertos. Los resultados se pueden descargar desde el mapa («Llévate los datos») con licencia CC BY 4.0.
        </p>
      </section>

      <section className="val-tarjeta">
        <h2>Lo que el modelo no sabe</h2>
        <ul className="limitaciones">
          <li><b>El planeamiento no es una licencia.</b> Que un suelo tenga viviendas previstas no quiere decir que se vayan a construir, ni cuándo. Por eso solo se cuenta una parte ({pct(escenario.pctSuelo, 0)}).</li>
          <li><b>«No principal» no es «vacía».</b> El Censo junta las viviendas vacías con las segundas residencias, y muchas no están en venta ni en alquiler. Por eso solo se cuenta un {pct(escenario.pctVivienda, 0)}.</li>
          <li><b>Contamos colegios, no plazas.</b> No sabemos cuántas aulas ni cuántas líneas tiene cada centro, ni cuántos alumnos van a estudiar a otro municipio.</li>
          <li><b>Contamos zonas de salud, no médicos.</b> Cada municipio se asigna a la zona que cubre más superficie suya, y la población de la zona es la del Padrón 2019 actualizada con el crecimiento de su municipio principal.</li>
          <li><b>«Lleno» es una comparación, no una norma.</b> Un colegio o un centro está lleno cuando atiende a tantos vecinos como los más cargados de su tamaño, no según un estándar oficial.</li>
          <li><b>La gente que llega sigue la tendencia.</b> El modelo no anticipa cambios bruscos, como un barrio nuevo o una línea de metro. Por eso se equivoca en un {pct(nuestro.wape)} de las personas.</li>
          <li><b>Faltan datos que también importan</b>: precios de la vivienda, empleo y transporte.</li>
        </ul>
      </section>
    </div>
  )
}

const REGLA: Record<(typeof ORDEN_TIPOS)[number], string> = {
  tension: 'Llega más gente de la que cabe.',
  polo: 'Cabe toda la gente que llega y crece más que la mediana.',
  oportunidad: 'Cabe la que llega, crece menos que la mediana y tiene más sitio que la mediana.',
  consolidacion: 'Cabe la que llega, pero crece poco y tiene poco sitio de sobra.',
}

/** ['1.000', '5.000', '10.000'] -> «1.000, 5.000 y 10.000». */
function y(partes: string[]): string {
  return partes.length < 2 ? partes.join('') : `${partes.slice(0, -1).join(', ')} y ${partes.at(-1)}`
}
