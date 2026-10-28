// Datos abiertos: descargar el escenario que se está viendo y la tabla de partida.

import { csvEscenario, descargar } from '../descarga'
import type { Escenario, Municipio, Obra, ResultadoMunicipio } from '../tipos'

interface Props {
  resultados: ResultadoMunicipio[]
  porIne: Map<string, Municipio>
  escenario: Escenario
  obras: Obra[] // el plan
}

export function Descarga({ resultados, porIne, escenario, obras }: Props) {
  const hayInversion = obras.length > 0
  const alDescargar = () =>
    descargar(`cabida_escenario_${escenario.anio}.csv`, csvEscenario(resultados, porIne, escenario, obras))

  return (
    <section className="descarga">
      <h3>Llévate los datos</h3>
      <p className="ayuda">
        Los {resultados.length} municipios con lo que ves ahora: cuánta gente llega, cuánta cabe y qué la limita
        {hayInversion ? ', contando las obras del plan (qué se construye en cada uno y cuándo abre)' : ''}. Se abre en Excel.
      </p>
      <button className="desplegar" onClick={alDescargar}>
        Descargar CSV del escenario {escenario.anio}<span className="flecha" aria-hidden="true">↓</span>
      </button>
      <p className="ayuda descarga-pie">
        <a href="datos/tabla_maestra.csv" download>Tabla con los datos de partida</a> (población 2005–2025, viviendas,
        colegios y sanidad de cada municipio). Con el escenario por defecto (2035, minutos en coche):{' '}
        <a href="datos/resultados_2035.csv" download>resultados de cada municipio</a>,{' '}
        <a href="datos/plan_recomendado.csv" download>obras del plan recomendado</a> y{' '}
        <a href="datos/zonas_salud.csv" download>las 286 zonas de salud</a>. Licencia{' '}
        <a href="https://creativecommons.org/licenses/by/4.0/deed.es" target="_blank" rel="noreferrer">CC BY 4.0</a>:
        puedes reutilizarlos citando a CABIDA. Los minutos en coche (<code>hospital_min</code>, <code>hospital_min_municipio</code> y{' '}
        <code>vecinos_min</code>) salen de{' '}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>{' '}
        (© colaboradores de OpenStreetMap, licencia ODbL): si los reutilizas, cita también a OpenStreetMap.
      </p>
    </section>
  )
}
