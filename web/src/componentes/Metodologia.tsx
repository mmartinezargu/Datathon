// Pestaña «Cómo se calcula».
// Arriba, lo que se cuenta en la demo: 4 pasos en lenguaje llano, sin fórmulas.
// Después, de dónde salen los datos y lo que el modelo no sabe.
// Al final, tapado en un desplegable «Ver la cuenta exacta», las fórmulas, por si alguien las pide.
// Las cifras salen del código (motor.ts, mudanza.ts) y de los datos, no se escriben a mano:
// los supuestos se muestran con el valor que tengan ahora las palancas.

import { ANIO_BASE, COSTE_CENTRO_SALUD, COSTE_COLEGIO, CRECIMIENTO_DECADA, CRECIMIENTO_DECADA_CM, HOSPITAL_LEJOS_KM, MARGEN_MINIMO, PLAZO_CENTRO_SALUD_ANIOS, PLAZO_COLEGIO_ANIOS, POBLACION_CM, PREVISION_CM, RITMO_ANUAL, segunPrevision } from '../motor'
import { PERFILES } from '../mudanza'
import { CONDICIONADA, ORDEN_TIPOS, TIPOS } from '../colores'
import type { Escenario, Perfil, Recurso } from '../tipos'
import type { DatosValidacion } from './Validacion'
import { miles, millones, pct } from '../formato'
import { Icono } from './Iconos'

/** Mismo valor que K_SUAVIZADO en etl/preparar.py. */
const K_SUAVIZADO = 5_000

/** Suelo pendiente de desarrollar sin cifra de viviendas en el planeamiento, en los 155 (AUDITORIA.md, punto 1). */
const SUELO_SIN_CIFRA_HA = 7_053

const FUENTES = [
  { nombre: 'Padrón continuo: población por municipio, 2005–2025', quien: 'INE (tabla 2881)', para: 'Cuánta gente vive en cada municipio y cómo ha crecido', url: 'https://www.ine.es/jaxiT3/Tabla.htm?t=2881' },
  { nombre: 'Previsión de población: 8 millones en 2039 (nota de prensa del 17/02/2025)', quien: 'Comunidad de Madrid', para: 'Comparar la cifra por defecto con la previsión de la Comunidad', url: 'https://www.comunidad.madrid/node/71411' },
  { nombre: 'Censo 2021: viviendas principales y no principales', quien: 'INE (tabla 59525)', para: 'Viviendas vacías o de segunda residencia', url: 'https://www.ine.es/jaxi/Tabla.htm?tpx=59525&L=0' },
  { nombre: 'Censo 2021: hogares por tamaño', quien: 'INE (tabla 59543)', para: 'Personas por hogar, para pasar de viviendas a personas', url: 'https://www.ine.es/jaxi/Tabla.htm?tpx=59543&L=0' },
  { nombre: 'Municipios de la Comunidad de Madrid', quien: 'Portal de Datos Abiertos de la Comunidad de Madrid', para: 'Zona estadística y superficie', url: 'https://datos.comunidad.madrid/dataset/0781c37e-bc64-4143-8029-18865bedbc3d' },
  { nombre: 'Centros educativos', quien: 'Portal de Datos Abiertos de la Comunidad de Madrid', para: 'Colegios de primaria e institutos en funcionamiento', url: 'https://datos.comunidad.madrid/dataset/c750856d-3166-4dac-8e80-d1b824c968b5' },
  { nombre: 'Población censada por edad (Censo anual)', quien: 'Portal de Datos Abiertos de la Comunidad de Madrid', para: 'Cuántos niños de edad de primaria y de secundaria hay en cada municipio', url: 'https://datos.comunidad.madrid/dataset/0a14fbfe-783e-4de3-81b1-ff3792bfd402' },
  { nombre: 'Zonas básicas de salud', quien: 'Portal de Datos Abiertos de la Comunidad de Madrid', para: 'A qué centro de salud va cada municipio y cuánta gente atiende', url: 'https://datos.comunidad.madrid/dataset/924044d0-b75e-402c-8c13-96ace11da0ff' },
  { nombre: 'Centros sanitarios', quien: 'Portal de Datos Abiertos de la Comunidad de Madrid', para: 'Dónde están los hospitales generales públicos', url: 'https://datos.comunidad.madrid/dataset/d8a0a444-adf5-4c04-8999-0eac3de52cb7' },
  { nombre: 'Límites municipales y planeamiento urbanístico refundido 2025', quien: 'IDEM, Comunidad de Madrid', para: 'El mapa y las viviendas previstas en suelo sin desarrollar', url: 'https://idem.comunidad.madrid/' },
]

const NOMBRE_RECURSO: Record<Recurso, string> = { colegios: 'colegios', sanidad: 'centro de salud', vivienda: 'vivienda' }

export function Metodologia({ escenario, validacion }: { escenario: Escenario; validacion: DatosValidacion }) {
  const anios = escenario.anio - ANIO_BASE
  const prevision = segunPrevision(escenario.anio)
  const nuestro = validacion.modelos.at(-1)!
  const tendencia = validacion.modelos.find((m) => m.modelo.startsWith('Extrapolar')) ?? validacion.modelos[1]

  return (
    <div className="metodologia">
      <section className="val-cabeza">
        <h1>Cómo se calcula</h1>
        <p>
          En cuatro pasos. A cada uno de los 155 municipios de la Comunidad de Madrid con menos de 50.000 habitantes
          se le hacen dos preguntas: <b>¿cuánta gente va a llegar?</b> y <b>¿cuánta cabe sin desbordar sus servicios?</b>{' '}
          La diferencia dice dónde hay que invertir.
        </p>
      </section>

      <ol className="pasos-simples">
        <li>
          <span className="paso-num">1</span>
          <div>
            <h2>Cuánta gente llega</h2>
            <p>
              Repetimos lo que ya pasó. Entre 2015 y 2025 estos pueblos ganaron <b>{miles(CRECIMIENTO_DECADA)} personas</b>.
              Suponemos que sigue igual y lo repartimos según lo que creció cada pueblo. No es una predicción: es «¿qué pasaría
              si todo sigue como hasta ahora?».
            </p>
          </div>
        </li>
        <li>
          <span className="paso-num">2</span>
          <div>
            <h2>Cuánta gente cabe</h2>
            <p>Miramos cuatro cosas y <b>manda la que se queda más corta</b>, porque de nada sirve tener casas si no hay sitio en el colegio.</p>
            <p>
              «Caben» quiere decir <b>caben sin ampliar servicios</b>: sin construir colegios ni centros de salud. Un 0 quiere decir que
              ese pueblo <b>ya está por encima del límite hoy</b>. Los colegios se comparan con los de municipios de tamaño parecido (con una
              curva que sube poco a poco con el tamaño, sin tramos), y la sanidad, con todas las zonas de salud de la Comunidad.
            </p>
            <ul className="cuatro-cosas">
              <li><Icono nombre="vivienda" tamano={20} />Casas</li>
              <li><Icono nombre="colegios" tamano={20} />Colegios</li>
              <li><Icono nombre="sanidad" tamano={20} />Centro de salud</li>
              <li><Icono nombre="ritmo" tamano={20} />Ritmo de crecimiento</li>
            </ul>
          </div>
        </li>
        <li>
          <span className="paso-num">3</span>
          <div>
            <h2>Qué tipo de pueblo es</h2>
            <p>Comparamos lo que llega con lo que cabe y sale uno de estos cuatro colores:</p>
            <ul className="tipos-simples">
              {ORDEN_TIPOS.map((t) => (
                <li key={t}><span className="chip" style={{ background: TIPOS[t].color }}>{TIPOS[t].nombre}</span><span>{TIPOS[t].que}</span></li>
              ))}
            </ul>
            <p>
              Una oportunidad con el hospital a más de {HOSPITAL_LEJOS_KM} km sale <b>rayada</b>:
              es una <span className="chip" style={{ background: CONDICIONADA.fondo }}>{CONDICIONADA.nombre.toLowerCase()}</span>.
              Hay sitio, pero antes de atraer gente hay que asegurar el acceso.
            </p>
          </div>
        </li>
        <li>
          <span className="paso-num">4</span>
          <div>
            <h2>¿Acierta?</h2>
            <p>
              Lo probamos contra el pasado: con los datos hasta {validacion.datos_hasta} predijimos {validacion.periodo.replace('-', ' a ')} y lo
              comparamos con lo que pasó de verdad. CABIDA coloca mal <b>{pct(nuestro.wape)}</b> de las personas; seguir la
              tendencia sin más, {pct(tendencia.wape)}. El detalle está en la pestaña «¿Es fiable?».
            </p>
          </div>
        </li>
      </ol>

      <section className="val-tarjeta">
        <h2>Y además</h2>
        <p>
          <b>¿Y si invertimos aquí?</b> Al añadir un colegio (unos {millones(COSTE_COLEGIO)}) o un centro de salud (unos {millones(COSTE_CENTRO_SALUD)})
          a un pueblo, se vuelve a calcular todo y se ve cuánta gente más cabe. También se enseña un plazo orientativo hasta que abre:
          unos {PLAZO_COLEGIO_ANIOS} años un colegio y unos {PLAZO_CENTRO_SALUD_ANIOS} un centro de salud. Son estimaciones, no plazos oficiales.
        </p>
        <p>
          <b>Reubicar en pueblos cercanos.</b> Con el interruptor de las palancas, quien no cabe en su pueblo va al pueblo con sitio
          más cercano, a menos de {escenario.radioKm} km en línea recta y con el hospital cerca; se reparte empezando por las parejas
          de pueblos más próximas. Si no hay ninguno a esa distancia, se queda sin sitio, y los colores del mapa no cambian.
        </p>
        <p>
          <b>¿Dónde me mudo?</b> Ordena los pueblos según el sitio que les queda en colegios, centro de salud y casas, y según quién seas.
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
        <h2>Limitaciones: lo que el modelo no sabe</h2>
        <ul className="limitaciones">
          <li><b>El planeamiento no es una licencia.</b> Que un suelo tenga viviendas previstas no quiere decir que se vayan a construir, ni cuándo. Por eso solo se cuenta una parte ({pct(escenario.pctSuelo, 0)}).</li>
          <li><b>«No principal» no es «vacía».</b> El Censo junta las viviendas vacías con las segundas residencias, y muchas no están en venta ni en alquiler. Por eso solo se cuenta un {pct(escenario.pctVivienda, 0)}.</li>
          <li><b>No hay datos abiertos de plazas escolares.</b> No sabemos cuántas aulas ni cuántas líneas tiene cada centro, ni cuántos alumnos van a estudiar a otro municipio: cada municipio se compara con los de tamaño parecido.</li>
          <li><b>Los niños se estiman.</b> Los niños de edad de primaria y de secundaria salen de grupos de 5 años del Censo anual, y se supone que quien llega trae la misma proporción de niños que el municipio.</li>
          <li><b>Todos los colegios cuentan igual:</b> públicos, concertados y privados.</li>
          <li><b>Contamos zonas de salud, no médicos.</b> Cada municipio se asigna a la zona de salud que cubre más superficie de su término, y la población de la zona es la del Padrón 2019 actualizada con el crecimiento de su municipio principal.</li>
          <li><b>Suelo sin cifra de viviendas.</b> El suelo pendiente que no trae cifra de viviendas en el planeamiento cuenta como 0 ({miles(SUELO_SIN_CIFRA_HA)} ha en los 155), así que la capacidad de vivienda es prudente.</li>
          <li><b>Ámbitos partidos.</b> En la capa de planeamiento, un ámbito partido en varios polígonos repite sus viviendas en cada uno; aquí se cuentan una sola vez.</li>
          <li><b>«Lleno» es una comparación, no una norma.</b> Un colegio está lleno cuando tiene tantos niños como los más cargados de su tamaño, y un centro de salud cuando atiende a tanta gente como las zonas más pobladas; no según un estándar oficial.</li>
          <li><b>La gente que llega sigue la tendencia.</b> El modelo no anticipa cambios bruscos, como un barrio nuevo o una línea de metro. Por eso se equivoca en un {pct(nuestro.wape)} de las personas.</li>
          <li><b>La distancia al hospital es en línea recta.</b> No es el tiempo real en coche ni en transporte público. Se mide desde el centro del pueblo (donde están sus colegios). {HOSPITAL_LEJOS_KM} km son unos 30 minutos en coche (estimación).</li>
          <li><b>Solo se cuentan hospitales de la Comunidad de Madrid.</b> Los pueblos de la frontera pueden tener uno más cerca en Guadalajara, Segovia, Ávila o Toledo.</li>
          <li><b>Faltan datos que también importan</b>: precios de la vivienda, empleo y transporte.</li>
        </ul>
      </section>

      <details className="formulas">
        <summary>
          <span><b>Ver la cuenta exacta</b><small>Las fórmulas, por si alguien las quiere comprobar</small></span>
          <span className="mas" aria-hidden="true" />
        </summary>
        <div className="formulas-cuerpo">
          <section>
            <h3>1. Cuánta gente llega</h3>
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
            <p>
              <b>Comparado con la previsión de la Comunidad.</b> En 2015–2025 la Comunidad ganó {miles(CRECIMIENTO_DECADA_CM)} personas
              (Padrón del INE) y estos 155 municipios se llevaron el {pct(prevision.parte, 1)}. La Comunidad prevé pasar de{' '}
              {miles(PREVISION_CM.desdePoblacion)} habitantes en {PREVISION_CM.desdeAnio} a {miles(PREVISION_CM.poblacion)} en {PREVISION_CM.anio}{' '}
              (<a href="https://www.comunidad.madrid/node/71411" target="_blank" rel="noreferrer">nota de prensa del 17/02/2025</a>):
              unas {miles(prevision.alAnioDesdeNota)} personas al año. Contando desde el Padrón de {ANIO_BASE} ({miles(POBLACION_CM)}),
              quedan unas {miles(prevision.alAnioDesdePadron)} al año. Con la misma parte, a estos municipios les tocarían entre{' '}
              {miles(prevision.minimo)} y {miles(prevision.maximo)} personas hasta {escenario.anio}, algo menos que seguir el ritmo de la
              última década ({miles(RITMO_ANUAL * anios)}).
            </p>
            <p className="formula">les toca = {pct(prevision.parte, 1)} × personas al año que gana la Comunidad × {anios} años</p>
          </section>

          <section>
            <h3>2. Cuánta gente cabe</h3>
            <p>
              Se calculan cuatro límites y manda el más bajo. Los porcentajes son los supuestos que se pueden cambiar en el
              mapa, en «Supuestos».
            </p>
            <dl className="limites-metodo">
              <dt>Vivienda</dt>
              <dd>
                <p className="formula">(viviendas vacías o secundarias × {pct(escenario.pctVivienda, 0)} + viviendas previstas en suelo sin desarrollar × {pct(escenario.pctSuelo, 0)}) × personas por hogar</p>
              </dd>
              <dt>Colegios</dt>
              <dd>
                <p>
                  Se mira cuántos niños hay por colegio (de 6 a 11 años en primaria y de 12 a 17 en secundaria) y se compara con
                  municipios de tamaño parecido. No hay tramos: una curva sube poco a poco con el tamaño del municipio, porque los
                  colegios de los pueblos grandes son más grandes. Un colegio está «lleno» cuando tiene tantos niños como el{' '}
                  {pct(1 - escenario.exigencia, 0)} más cargado de su tamaño. Se hace con primaria y con secundaria, y manda la que tiene menos sitio.
                </p>
                <p className="formula">log(niños por colegio) = a + b × log(vecinos), con a y b de una recta ajustada a los 155; el límite es esa recta subida hasta el percentil {pct(escenario.exigencia, 0)} de lo que se aparta cada municipio</p>
                <p className="formula">plazas libres = colegios × límite − niños de hoy; personas que caben = plazas libres ÷ proporción de niños de esa edad en el municipio</p>
                <p className="ayuda">Si no tiene colegio de un nivel, sus alumnos van a otro municipio y ese límite no aplica. Los niños se estiman a partir de grupos de 5 años del Censo anual.</p>
              </dd>
              <dt>Sanidad</dt>
              <dd>
                <p>
                  Cada municipio va a una zona básica de salud. Su población se compara con la de todas las zonas de la Comunidad:
                  una zona está «llena» cuando atiende a tanta gente como el {pct(1 - escenario.exigencia, 0)} de las zonas más pobladas.
                  No se compara por tramos de tamaño, porque el tamaño de la zona es justo lo que se mide.
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

          <section>
            <h3>3. Qué tipo de municipio es</h3>
            <p>Se cruza lo que llega con lo que cabe. Las fronteras son la mediana de los 155: la mitad está por encima y la mitad por debajo.</p>
            <ul className="tipos-metodo">
              {ORDEN_TIPOS.map((t) => (
                <li key={t}>
                  <span className="chip" style={{ background: TIPOS[t].color }}>{TIPOS[t].nombre}</span>
                  <span>{REGLA[t]}</span>
                </li>
              ))}
            </ul>
            <p>
              <b>Reubicar en pueblos cercanos (si se activa).</b> Se forman todas las parejas de un pueblo al que le sobra gente y otro
              con sitio (sin contar las oportunidades condicionadas) a {escenario.radioKm} km o menos entre sus centros, y se ordenan de
              la más cercana a la más lejana. En ese orden, cada pareja traslada lo que pueda:
            </p>
            <p className="formula">personas = mín(lo que aún no cabe en el origen, el sitio que aún le queda al destino)</p>
            <p className="ayuda">El tipo se calcula con lo que llega por tendencia, antes de este paso.</p>
            <p className="ayuda">Para no marcar «en tensión» por un puñado de personas, tienen que faltar al menos {MARGEN_MINIMO}.</p>
            <p>
              <b>Oportunidad condicionada:</b> una oportunidad cuyo hospital general público más cercano está a más de {HOSPITAL_LEJOS_KM} km
              en línea recta, medidos desde la mediana de las coordenadas de sus colegios (si no tiene, desde el centro de su término).
            </p>
          </section>

          <section>
            <h3>4. Invertir y mudarse</h3>
            <p>
              <b>Invertir.</b> Cada colegio nuevo se suma al nivel con menos sitio y añade tantas plazas como el límite de niños por
              colegio de su tamaño. Cada centro de salud nuevo añade, solo para ese municipio, lo que aguanta una zona de salud; si su zona ya se pasa del límite, primero cubre esa parte. Después se recalcula todo: a veces el límite pasa a otro
              recurso y hace falta invertir en algo más.
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
        </div>
      </details>
    </div>
  )
}

const REGLA: Record<(typeof ORDEN_TIPOS)[number], string> = {
  tension: 'Llega más gente de la que cabe.',
  polo: 'Cabe toda la gente que llega y crece más que la mediana.',
  oportunidad: 'Cabe la que llega, crece menos que la mediana y tiene más sitio que la mediana.',
  consolidacion: 'Cabe la que llega, pero crece poco y tiene poco sitio de sobra.',
}
