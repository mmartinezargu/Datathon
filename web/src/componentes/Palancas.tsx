// Las palancas del escenario: lo que el gestor mueve para ver qué pasa.
// Arriba, el escenario (año y personas). Debajo, los supuestos discutibles:
// en vez de esconderlos, se convierten en controles.

import { useState, type ReactNode } from 'react'
import { ANIO_BASE, PREVISION_CM, RITMO_ANUAL, escenarioPorDefecto, limiteColegio, segunPrevision } from '../motor'
import type { Escenario, Medida, Umbrales } from '../tipos'
import { deCada, miles, pct } from '../formato'
import { MEDIDAS, radioReubicacion, umbralHospital } from '../medida'

interface Props {
  escenario: Escenario
  umbrales: Umbrales // con la exigencia elegida: para dar los números en la ayuda
  onCambiar: (e: Escenario) => void
}

const ANIOS = [2030, 2035, 2039]
/** Para el texto de la previsión: «entre 118.000 y 128.000». */
const redondeo = (n: number) => Math.round(n / 1000) * 1000
const EXIGENCIAS = [
  { valor: 0.75, texto: 'Estricta' },
  { valor: 0.9, texto: 'Media' },
  { valor: 0.97, texto: 'Flexible' },
]
/** Para la ayuda de la exigencia: un municipio de este tamaño. */
const VECINOS_EJEMPLO = 5_000
/** Para la ayuda del ritmo: un municipio de este tamaño. */
const VECINOS_EJEMPLO_RITMO = 10_000
/** Personas por defecto al pasar cerca (se encaja en el valor exacto, 134.426 en 2035). */
const ENCAJE = 500

export function Palancas({ escenario, umbrales, onCambiar }: Props) {
  const [abierto, setAbierto] = useState(false)
  const anios = escenario.anio - ANIO_BASE
  const maximo = Math.round(RITMO_ANUAL * anios * 2.5) // hasta 2,5 veces el ritmo actual
  const cambiar = (parcial: Partial<Escenario>) => onCambiar({ ...escenario, ...parcial })
  const exigencia = EXIGENCIAS.find((e) => e.valor === escenario.exigencia) ?? EXIGENCIAS[1]
  const prevision = segunPrevision(escenario.anio)
  const porDefecto = Math.round(RITMO_ANUAL * anios)
  const deCadaTexto = deCada(exigencia.valor)
  const ritmoPorDefecto = escenarioPorDefecto().ritmoMax
  const techo = (1 + escenario.ritmoMax) ** anios - 1

  function cambiarAnio(anio: number) {
    // Al cambiar el año se mantiene el ritmo anual elegido
    const ritmo = escenario.personas / anios
    cambiar({ anio, personas: Math.round(ritmo * (anio - ANIO_BASE)) })
  }

  return (
    <div className="palancas">
      <div className="control">
        <div className="etiqueta">
          <span>Año horizonte</span>
          <Segmentos opciones={ANIOS.map((a) => ({ valor: a, texto: String(a) }))} valor={escenario.anio} onCambiar={cambiarAnio} nombre="Año horizonte" />
        </div>
      </div>
      <Deslizador etiqueta="Personas que absorben los 155 municipios" valor={escenario.personas}
        texto={miles(escenario.personas)} min={0} max={maximo} paso={1000}
        pista={`Por defecto, ${miles(porDefecto)} personas hasta ${escenario.anio}: lo que ganaron estos 155 municipios ` +
          `entre 2015 y 2025, el ${pct(prevision.parte, 0)} de lo que creció la Comunidad. La Comunidad prevé llegar a 8 millones en ${PREVISION_CM.anio}; ` +
          `con esa previsión les tocarían algo menos, entre ${miles(redondeo(prevision.minimo))} y ${miles(redondeo(prevision.maximo))}.`}
        // Al pasar cerca del valor por defecto, encaja en él (el deslizador va de mil en mil)
        onCambiar={(v) => cambiar({ personas: Math.abs(v - porDefecto) <= ENCAJE ? porDefecto : v })}
        volver={escenario.personas !== porDefecto
          ? <button className="enlace" onClick={() => cambiar({ personas: porDefecto })}>Volver a {miles(porDefecto)}</button> : undefined} />
      <div className="control">
        <div className="etiqueta"><span>Medir en</span></div>
        <Segmentos opciones={(['min', 'km'] as Medida[]).map((m) => ({ valor: m, texto: MEDIDAS[m].nombre }))} valor={escenario.medida}
          onCambiar={(medida) => cambiar({ medida })} nombre="Medir las distancias en" ancho />
        <div className="pista">
          {escenario.medida === 'min'
            ? 'Por carretera, sin tráfico (OpenStreetMap). '
            : 'En línea recta, sin contar carreteras. '}
          El hospital queda lejos a más de {umbralHospital(escenario.medida)}{escenario.medida === 'min' ? ' en coche' : ''}.
        </div>
      </div>
      <label className="control interruptor">
        <input type="checkbox" role="switch" checked={escenario.reequilibrio} onChange={(e) => cambiar({ reequilibrio: e.target.checked })} />
        <span className="interruptor-texto">
          <b>Reubicar en municipios cercanos con sitio</b>
          <span className="pista">
            Quien no cabe en su municipio va al municipio con sitio más cercano, a menos de {radioReubicacion(escenario)} y con hospital cerca.
            Si no hay ninguno, se queda sin sitio. El mapa colorea con lo que falta después de reubicar.
          </span>
        </span>
      </label>
      {escenario.reequilibrio && (escenario.medida === 'min' ? (
        <Deslizador etiqueta="Tiempo máximo" valor={escenario.radioMin} texto={`${escenario.radioMin} min`}
          min={10} max={45} paso={5} pista="En coche, sin tráfico, entre los centros de los municipios."
          onCambiar={(v) => cambiar({ radioMin: v })} />
      ) : (
        <Deslizador etiqueta="Distancia máxima" valor={escenario.radioKm} texto={`${escenario.radioKm} km`}
          min={10} max={50} paso={5} pista="En línea recta entre los centros de los municipios."
          onCambiar={(v) => cambiar({ radioKm: v })} />
      ))}

      <button className="desplegar" aria-expanded={abierto} onClick={() => setAbierto(!abierto)}>
        <span>Supuestos del cálculo</span>
        <span className="flecha" aria-hidden="true">{abierto ? '−' : '+'}</span>
      </button>
      {abierto && (
        <div className="supuestos">
          <div className="control">
            <div className="etiqueta">
              <span>¿Cuándo damos por lleno un colegio o un centro de salud?</span>
            </div>
            <Segmentos opciones={EXIGENCIAS.map((e) => ({ valor: e.valor, texto: e.texto }))} valor={exigencia.valor}
              onCambiar={(v) => cambiar({ exigencia: v })} nombre="Exigencia con los servicios" ancho />
            <div className="pista">
              Un colegio está lleno cuando tiene más alumnos que {deCadaTexto} municipios de tamaño parecido: en uno de {miles(VECINOS_EJEMPLO)} vecinos,
              unos {miles(limiteColegio(umbrales.primaria, VECINOS_EJEMPLO))} alumnos por colegio de primaria. Un centro de salud, cuando su zona pasa
              de {miles(umbrales.zonaSalud)} vecinos, más que {deCadaTexto} zonas de la Comunidad. No hay datos abiertos de plazas por colegio; por eso comparamos.
            </div>
          </div>
          <Deslizador etiqueta="Suelo previsto que llega a construirse" valor={escenario.pctSuelo} texto={pct(escenario.pctSuelo, 0)}
            min={0} max={1} paso={0.05} pista="Del suelo urbanizable que el planeamiento deja pendiente."
            onCambiar={(v) => cambiar({ pctSuelo: v })} />
          <Deslizador etiqueta="Vivienda vacía que se ocupa" valor={escenario.pctVivienda} texto={pct(escenario.pctVivienda, 0)}
            min={0} max={0.5} paso={0.05} pista="Es un supuesto: no hay dato oficial de cuántas vacías llegan a ocuparse. Las vacías salen del Censo 2021, según su consumo de luz. Muévelo para ver qué cambia."
            onCambiar={(v) => cambiar({ pctVivienda: v })} />
          <Deslizador etiqueta="Lo máximo que crece un municipio al año" valor={escenario.ritmoMax} texto={pct(escenario.ritmoMax, 1)}
            min={0.01} max={0.06} paso={0.005}
            pista={`Ningún municipio gana más de un ${pct(escenario.ritmoMax, 1)} de vecinos al año, aunque tenga casas y servicios. ` +
              `Hasta ${escenario.anio}, como mucho un ${pct(techo, 0)} más: uno de ${miles(VECINOS_EJEMPLO_RITMO)} vecinos, hasta ${miles(VECINOS_EJEMPLO_RITMO * techo)} personas. ` +
              (escenario.ritmoMax === ritmoPorDefecto
                ? 'Con este techo, el modelo acierta 77 de cada 100 personas en 2015-2025. '
                : `Con el ${pct(ritmoPorDefecto, 1)} de CABIDA, el modelo acierta 77 de cada 100 personas en 2015-2025. `) +
              'Si lo subes, mandan las casas, los colegios o la sanidad.'}
            onCambiar={(v) => cambiar({ ritmoMax: v })} />
        </div>
      )}
    </div>
  )
}

function Deslizador({ etiqueta, valor, texto, min, max, paso, pista, onCambiar, volver }: {
  etiqueta: string; valor: number; texto: string; min: number; max: number; paso: number; pista: string
  onCambiar: (v: number) => void
  volver?: ReactNode // enlace «Volver a …» cuando el valor no es el de por defecto
}) {
  return (
    <div className="control">
      <label>
        <div className="etiqueta"><span>{etiqueta}</span><b>{texto}</b></div>
        <input type="range" min={min} max={max} step={paso} value={valor} onChange={(e) => onCambiar(Number(e.target.value))} />
      </label>
      <div className="pista">{pista}{volver && <> {volver}</>}</div>
    </div>
  )
}

function Segmentos<T extends number | string>({ opciones, valor, onCambiar, nombre, ancho }: {
  opciones: { valor: T; texto: string }[]; valor: T; onCambiar: (v: T) => void; nombre: string; ancho?: boolean
}) {
  return (
    <div className={`segmentos${ancho ? ' ancho' : ''}`} role="radiogroup" aria-label={nombre}>
      {opciones.map((o) => (
        <button key={o.valor} role="radio" aria-checked={o.valor === valor}
          className={o.valor === valor ? 'activo' : ''} onClick={() => onCambiar(o.valor)}>
          {o.texto}
        </button>
      ))}
    </div>
  )
}
