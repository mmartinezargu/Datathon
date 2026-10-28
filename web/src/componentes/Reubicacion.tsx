// Bloque «Reubicar en municipios cercanos con sitio» de la columna de resultado: qué hace la reubicación
// y los traslados más grandes. Al pulsar uno se abre la ficha del municipio de origen.

import type { Medida, Municipio, Traslado } from '../tipos'
import { decimal, miles } from '../formato'
import { distanciaTraslado } from '../medida'

interface Props {
  resumen: { personas: number; destinos: number; kmMedio: number; minMedio: number; traslados: Traslado[] }
  medida: Medida
  sinSitio: number
  porIne: Map<string, Municipio>
  onElegir: (ine: string) => void
}

export function Reubicacion({ resumen, medida, sinSitio, porIne, onElegir }: Props) {
  const nombre = (ine: string) => porIne.get(ine)?.nombre ?? ine
  return (
    <section className="reubicacion">
      <h2>Reubicar en municipios cercanos</h2>
      {resumen.personas >= 1 ? (
        <p>
          Se reubican <b>{miles(resumen.personas)}</b> personas en <b>{resumen.destinos}</b> municipios cercanos
          {medida === 'min'
            ? <> (de media a {miles(resumen.minMedio)} min en coche, sin tráfico)</>
            : <> (de media a {decimal(resumen.kmMedio)} km)</>}. Siguen sin sitio <b>{miles(sinSitio)}</b>.
        </p>
      ) : (
        <p>Ningún municipio con sitio está lo bastante cerca: siguen sin sitio <b>{miles(sinSitio)}</b> personas.</p>
      )}
      {resumen.traslados.length > 0 && (
        <>
          <p className="ayuda">Los traslados más grandes. Pulsa uno para ver la ficha del municipio de origen.</p>
          <ol className="traslados">
            {resumen.traslados.slice(0, 5).map((t) => (
              <li key={`${t.origen}-${t.destino}`}>
                <button onClick={() => onElegir(t.origen)}>
                  <span className="t-ruta">{nombre(t.origen)} → {nombre(t.destino)}</span>
                  <span className="t-cifra">{miles(t.personas)} personas, {distanciaTraslado(t, medida)}</span>
                </button>
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  )
}
