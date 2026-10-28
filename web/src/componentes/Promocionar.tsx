// «Dónde promocionar a cada grupo»: los municipios que más reciben de cada tipo de vecino al repartir (reparto.ts).
// Lo usan «Atraer» y el final de «Plan» (para que el gestor vea, junto a qué construir, a dónde atraer a cada uno).

import { useMemo } from 'react'
import { ORDEN_REPARTO, llegadasPorPerfil, repartir } from '../reparto'
import { hospitalCercano } from '../medida'
import { miles } from '../formato'
import type { Escenario, FiltrosReparto, Medida, Municipio, Perfil, Reparto, ResultadoMunicipio } from '../tipos'

const MAX_PROMOCIONAR = 5

/** A quién se dirige la promoción de cada grupo. */
const PARA_QUIEN: Record<Perfil, string> = {
  familia: 'familias con hijos',
  mayor: 'personas mayores',
  teletrabajo: 'quien teletrabaja',
}

interface PropsGrupos {
  reparto: Reparto
  llegan: Record<Perfil, number>
  resultados: ResultadoMunicipio[]
  porIne: Map<string, Municipio>
  medida: Medida
  onVerEnMapa: (ine: string) => void
}

/** Las tres columnas (familias, mayores, teletrabajo) con los 5 municipios donde más conviene promocionar a cada grupo. */
export function GruposPromocion({ reparto, llegan, resultados, porIne, medida, onVerEnMapa }: PropsGrupos) {
  const porIneRes = useMemo(() => new Map(resultados.map((r) => [r.ine, r])), [resultados])
  // Para cada grupo, los municipios que más reciben de él: ahí es donde conviene promocionar
  const promocionar = ORDEN_REPARTO.filter((p) => llegan[p] > 0).map((p) => ({
    perfil: p,
    pueblos: reparto.pueblos.filter((f) => f.porPerfil[p] > 0).sort((a, b) => b.porPerfil[p] - a.porPerfil[p]).slice(0, MAX_PROMOCIONAR),
  }))
  return (
    <div className="atraer-grupos">
      {promocionar.map(({ perfil, pueblos }) => (
        <div key={perfil} className="atraer-grupo">
          <h3>A {PARA_QUIEN[perfil]}</h3>
          {pueblos.length === 0 ? <p className="ayuda">Ningún municipio con sitio cumple lo que pides.</p> : (
            <ol>
              {pueblos.map((f) => (
                <li key={f.ine}>
                  <button className="enlace" onClick={() => onVerEnMapa(f.ine)}>{porIne.get(f.ine)!.nombre}</button>
                  <span>atraer a unas {miles(f.porPerfil[perfil])}</span>
                  <small>{porQue(perfil, porIneRes.get(f.ine)!, porIne.get(f.ine)!, medida)}</small>
                </li>
              ))}
            </ol>
          )}
        </div>
      ))}
    </div>
  )
}

interface PropsPlan {
  resultados: ResultadoMunicipio[] // con las obras del plan
  porIne: Map<string, Municipio>
  escenario: Escenario
  mezcla: Record<Perfil, number>
  filtros: FiltrosReparto
  onAjustar: () => void
  onVerEnMapa: (ine: string) => void
}

/** Al final de «Plan»: además de construir, a qué municipios merece la pena atraer a cada grupo (con las obras ya contadas). */
export function PromocionarEnPlan({ resultados, porIne, escenario, mezcla, filtros, onAjustar, onVerEnMapa }: PropsPlan) {
  const llegan = useMemo(() => llegadasPorPerfil(escenario.personas, mezcla), [escenario.personas, mezcla])
  const reparto = useMemo(() => repartir(resultados, porIne, llegan, filtros, escenario.medida),
    [resultados, porIne, llegan, filtros, escenario.medida])
  return (
    <section className="val-tarjeta promocionar-plan">
      <h2>Dónde merece la pena promocionar</h2>
      <p className="ayuda">
        Construir es una palanca; la otra es atraer a cada uno a donde hay sitio para él (con campañas, ayudas al alquiler o
        teletrabajo rural). Contando las obras del plan, estos son los municipios donde más conviene promocionar a cada grupo.{' '}
        <button className="enlace" onClick={onAjustar}>Cambiar quiénes llegan y a dónde</button>
      </p>
      <GruposPromocion reparto={reparto} llegan={llegan} resultados={resultados} porIne={porIne} medida={escenario.medida}
        onVerEnMapa={onVerEnMapa} />
    </section>
  )
}

/** Por qué conviene promocionar este municipio entre ese grupo: el sitio que tiene en lo que más le importa. */
function porQue(perfil: Perfil, r: ResultadoMunicipio, m: Municipio, medida: Medida): string {
  const { colegios, sanidad, vivienda } = r.limites
  const partes = perfil === 'familia'
    ? [colegios !== null ? `colegios con sitio para ${miles(colegios)}` : '', vivienda !== null ? `casas para ${miles(vivienda)}` : '']
    : perfil === 'mayor'
      ? [sanidad !== null ? `centro de salud con sitio para ${miles(sanidad)}` : '', `hospital a ${hospitalCercano(m, medida).distancia}`]
      : [vivienda !== null ? `casas para ${miles(vivienda)}` : '', sanidad !== null ? `centro de salud para ${miles(sanidad)}` : '']
  return partes.filter(Boolean).join(' · ')
}
