// Sección «¿Acierta?», al final de «Cómo funciona»: el "examen con soluciones" de 2015 a 2025.
// Los datos los calcula etl/validacion.py y los deja en datos/validacion.json.
// El enlace #fiable lleva directamente aquí.

import { miles, pct } from '../formato'
import { deCada100, modelosClave } from '../validacion'
import type { DatosValidacion } from '../tipos'

export function Validacion({ datos }: { datos: DatosValidacion }) {
  const peor = Math.max(...datos.modelos.map((m) => m.fuera_municipio))
  const { nuestro, tendencia } = modelosClave(datos)

  return (
    <section id="acierta" className="validacion">
      <div className="val-cabeza">
        <h2 className="val-titulo">¿Acierta? Lo probamos contra el pasado</h2>
        <p className="val-titular">
          Acierta dónde va <b>{deCada100(nuestro.fuera_municipio)} de cada 100 personas</b> ({deCada100(nuestro.fuera_zona)} por
          zonas); la tendencia sola, {deCada100(tendencia.fuera_municipio)}.
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
                  <small>Otra zona: {pct(m.fuera_zona)} · WAPE: {pct(m.wape)}</small>
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
        <p className="nota">
          El error que se suele dar (WAPE) es del {pct(nuestro.wape)}: suma lo que sobra en unos municipios y lo que falta en otros,
          así que cuenta dos veces a cada persona mal colocada.
        </p>
      </div>

      <div className="val-tarjeta">
        <h3>Dónde más se equivoca</h3>
        <div className="tabla-scroll">
          <table>
            <thead>
              <tr><th>Municipio</th><th className="num">Creció de verdad</th><th className="num">Previsto</th><th className="num">Diferencia</th></tr>
            </thead>
            <tbody>
              {datos.mayores_errores.map((e) => {
                const dif = e.crecimiento_previsto - e.crecimiento_real
                return (
                  <tr key={e.ine}>
                    <td>{e.nombre}</td>
                    <td className="num">{miles(e.crecimiento_real)}</td>
                    <td className="num">{miles(e.crecimiento_previsto)}</td>
                    <td className={`num ${dif > 0 ? 'sobra' : 'falta'}`}>{dif > 0 ? '+' : ''}{miles(dif)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="nota">Datos: Padrón continuo del INE, tabla 2881. Se publican aunque el resultado no sea perfecto.</p>
      </div>
    </section>
  )
}
