// Pestaña de validación: el "examen con soluciones" de 2015 a 2025.
// Los datos los calcula etl/validacion.py y los deja en datos/validacion.json.

import { miles, pct } from '../formato'

export interface DatosValidacion {
  periodo: string
  datos_hasta: number
  municipios: number
  crecimiento_real_total: number
  modelos: { modelo: string; wape: number; aciertos_top20: number; spearman: number }[]
  mayores_errores: { ine: string; nombre: string; crecimiento_real: number; crecimiento_previsto: number }[]
}

export function Validacion({ datos }: { datos: DatosValidacion }) {
  const peor = Math.max(...datos.modelos.map((m) => m.wape))
  const nuestro = datos.modelos.at(-1)!

  return (
    <div className="validacion">
      <section className="val-cabeza">
        <h1>¿Acierta el modelo? Lo probamos contra el pasado</h1>
        <p>
          Hacemos como si estuviéramos en {datos.datos_hasta}. Con los datos que había entonces, cada modelo
          reparte entre los {datos.municipios} municipios las {miles(datos.crecimiento_real_total)} personas
          que ganaron de verdad entre {datos.periodo.replace('-', ' y ')}. Después lo comparamos con lo que pasó.
        </p>
      </section>

      <section className="val-tarjeta">
        <h2>Error de reparto: de cada 100 personas, cuántas colocó en el municipio equivocado</h2>
        <div className="barras">
          {datos.modelos.map((m) => {
            const esNuestro = m === nuestro
            return (
              <div key={m.modelo} className={`barra-fila${esNuestro ? ' nuestro' : ''}`}>
                <span className="barra-nombre">{m.modelo}{esNuestro && <em>CABIDA</em>}</span>
                <span className="barra-pista">
                  <span className="barra-relleno" style={{ width: `${(m.wape / peor) * 100}%` }} />
                </span>
                <span className="barra-valor">{pct(m.wape)}</span>
              </div>
            )
          })}
        </div>
        <p className="nota">
          Menos es mejor. Poner un techo a lo que cada municipio puede absorber baja el error del{' '}
          {pct(datos.modelos[1].wape, 0)} al {pct(nuestro.wape, 0)}: la capacidad importa, que es justo la idea
          de CABIDA. El ritmo de cada municipio aún se predice regular (Spearman {nuestro.spearman.toFixed(2).replace('.', ',')});
          el modelo completo añade los límites de vivienda, suelo y servicios.
        </p>
      </section>

      <section className="val-tarjeta">
        <h2>Dónde más se equivoca</h2>
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
        <p className="nota">Datos: Padrón continuo del INE, tabla 2881. Se publican aunque el resultado no sea perfecto.</p>
      </section>
    </div>
  )
}
