// Sección «¿Acierta?», al final de «Cómo funciona»: el "examen con soluciones" de 2015 a 2025.
// Los datos los calcula etl/validacion.py y los deja en datos/validacion.json.
// El enlace #fiable lleva directamente aquí.

import { miles, pct } from '../formato'
import { deCada100, modelosClave, porComarcas } from '../validacion'
import type { DatosValidacion } from '../tipos'

export function Validacion({ datos, comarcas }: { datos: DatosValidacion; comarcas: number }) {
  const peor = Math.max(...datos.modelos.map((m) => m.fuera_municipio))
  const { nuestro, tendencia } = modelosClave(datos)
  const zonas = datos.zonas_salud

  return (
    <section id="acierta" className="validacion">
      <div className="val-cabeza">
        <h2 className="val-titulo">¿Acierta? Lo probamos contra el pasado</h2>
        <p className="val-titular">
          Acierta dónde va <b>{deCada100(nuestro.fuera_municipio)} de cada 100 personas</b> ({deCada100(nuestro.fuera_zona)}{' '}
          {porComarcas(comarcas)}); la tendencia sola, {deCada100(tendencia.fuera_municipio)}.
        </p>
        <p>
          Hacemos como si estuviéramos en {datos.datos_hasta}. Con los datos que había entonces, cada modelo
          reparte entre los {datos.municipios} municipios las {miles(datos.crecimiento_real_total)} personas
          que ganaron de verdad entre {datos.periodo.replace('-', ' y ')}. Después lo comparamos con lo que pasó.
        </p>
      </div>

      <div className="val-tarjeta">
        <h3>De cada 100 personas, cuántas puso en otro municipio</h3>
        <div className="barras">
          {datos.modelos.map((m) => {
            const esNuestro = m === nuestro
            return (
              <div key={m.modelo} className={`barra-fila${esNuestro ? ' nuestro' : ''}`}>
                <span className="barra-nombre">
                  {m.modelo}{esNuestro && <em>CABIDA</em>}
                  <small>Otra comarca: {pct(m.fuera_zona)} · WAPE: {pct(m.wape)}</small>
                </span>
                <span className="barra-pista">
                  <span className="barra-relleno" style={{ width: `${(m.fuera_municipio / peor) * 100}%` }} />
                </span>
                <span className="barra-valor">{pct(m.fuera_municipio)}</span>
              </div>
            )
          })}
        </div>
        <p className="nota">
          Menos es mejor. Poner un techo a lo que cada municipio puede absorber baja lo mal colocado del{' '}
          {pct(tendencia.fuera_municipio, 0)} al {pct(nuestro.fuera_municipio, 0)}: la capacidad importa, que es justo la idea
          de CABIDA. El ritmo de cada municipio aún se predice regular (Spearman {nuestro.spearman.toFixed(2).replace('.', ',')});
          el modelo completo añade los límites de vivienda, suelo y servicios.
        </p>
        <p className="nota">Datos: Padrón continuo del INE, tabla 2881. Se publican aunque el resultado no sea perfecto.</p>
        <p className="nota">
          El error que se suele dar (WAPE) es del {pct(nuestro.wape)}: suma lo que sobra en unos municipios y lo que falta en otros,
          así que cuenta dos veces a cada persona mal colocada.
        </p>
      </div>

      <div className="val-tarjeta">
        <h3>¿Cuánta gente atiende cada centro de salud? Lo comparamos con el Censo</h3>
        <p className="val-frase">
          Para el límite de sanidad hace falta saber cuántos vecinos tiene cada zona básica de salud. Usamos el Padrón de 2019
          que viene con el mapa de zonas, actualizado con lo que creció su municipio principal. Llevado a 2021, se aparta del
          Censo 2021 por zona de salud un <b>{pct(zonas.todas.dif_abs_media)} de media</b> en las {zonas.todas.zonas} zonas
          ({pct(zonas.del_reto.dif_abs_media)} en las {zonas.del_reto.zonas} zonas de los municipios del reto), y las dos cifras
          van casi a la par (correlación {zonas.todas.correlacion.toFixed(3).replace('.', ',')}).
        </p>
        <div className="tabla-scroll">
          <table>
            <thead>
              <tr><th>Zona de salud que más se aparta</th><th className="num">Nuestra cifra</th><th className="num">Censo 2021</th><th className="num">Diferencia</th></tr>
            </thead>
            <tbody>
              {zonas.mas_se_apartan.map((z) => (
                <tr key={z.codigo}>
                  <td>{z.nombre}{z.del_reto && <small className="val-reto"> municipio del reto</small>}</td>
                  <td className="num">{miles(z.estimada_2021)}</td>
                  <td className="num">{miles(z.censo_2021)}</td>
                  <td className={`num ${z.dif > 0 ? 'sobra' : 'falta'}`}>{z.dif > 0 ? '+' : ''}{pct(z.dif)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="nota">
          Datos: Censo de Población y Viviendas 2021 por zona básica de salud (Instituto de Estadística de la Comunidad de Madrid,
          tabla T21SALUD01). Es solo una prueba: el modelo sigue usando su cifra. De media nos pasamos un {pct(zonas.todas.dif_media)},
          en parte porque el Censo deja fuera a quien vive en residencias y otros colectivos.
        </p>
      </div>
    </section>
  )
}
