// De dónde sale el coste por defecto de cada obra del plan: la mediana de obras reales de la Comunidad de Madrid,
// con la lista desplegable y el enlace a la noticia de cada una (datos/obras_referencia.json, de etl/obras_referencia.py).
// Lo usan la pestaña «Plan» (Parámetros) y «Cómo funciona».

import { obrasDe, resumenMediana } from '../fuentesPlan'
import { miles, millones } from '../formato'
import type { TipoObra } from '../tipos'

export function ObrasReferencia({ tipo }: { tipo: TipoObra }) {
  const obras = obrasDe(tipo)
  const centro = tipo === 'centro_salud'
  return (
    <div className="obras-ref">
      <p className="obras-ref-resumen">{resumenMediana(tipo)}.</p>
      <details>
        <summary>Ver las obras</summary>
        <ul>
          {obras.map((o) => (
            <li key={o.nombre + o.fecha} className={o.obra_plan ? undefined : 'fuera'}>
              <b>{o.nombre}</b> ({o.municipio}):{' '}
              {millones(o.coste_eur)}
              {o.plazas !== null && <>{centro ? ' para ' : ' por '}{miles(o.plazas)} {centro ? 'vecinos' : 'plazas'}</>}
              {!centro && o.eur_por_plaza !== null && <>, {miles(o.eur_por_plaza)} €/plaza</>}.{' '}
              <a href={o.url} target="_blank" rel="noreferrer">{o.fuente}</a>
              {o.nota && <span className="ayuda"> {o.nota}.</span>}
            </li>
          ))}
        </ul>
      </details>
    </div>
  )
}
