// Caja «Cuéntanoslo con tus palabras»: lee una frase (IA o palabras clave, asistente.ts) y avisa de lo
// que ha entendido. Quien la usa decide qué hacer con la lectura (rellenar filtros, repartir…).

import { useState } from 'react'
import { leerFrase } from '../asistente'
import type { FiltrosMudanza, LecturaFrase, Medida, Municipio } from '../tipos'

interface Props {
  porIne: Map<string, Municipio>
  actual: FiltrosMudanza // lo que hay ahora, por si la frase no dice quién es
  medida: Medida // para explicar «hospital cerca» en minutos en coche o en km
  ejemplos: string[]
  boton: string
  noEntendido: string // qué probar si no se entiende la frase
  onLectura: (l: LecturaFrase) => void // solo se llama si ha entendido algo
}

export function Asistente({ porIne, actual, medida, ejemplos, boton, noEntendido, onLectura }: Props) {
  const [frase, setFrase] = useState('')
  const [lectura, setLectura] = useState<LecturaFrase | null>(null)
  const [pensando, setPensando] = useState(false)
  const leer = async (texto: string) => {
    if (!texto.trim() || pensando) return
    setPensando(true)
    const l = await leerFrase(texto, [...porIne.values()], actual, medida)
    setPensando(false)
    setLectura(l)
    if (l.entendido.length) onLectura(l)
  }

  return (
    <div className="asistente">
      <h2>Cuéntanoslo con tus palabras</h2>
      <form className="asistente-fila" onSubmit={(e) => { e.preventDefault(); leer(frase) }}>
        <input type="text" value={frase} onChange={(e) => setFrase(e.target.value)}
          placeholder={`Por ejemplo: «${ejemplos[0]}»`} aria-label="Cuéntanos con tus palabras" />
        <button type="submit" disabled={!frase.trim() || pensando}>{pensando ? 'Pensando…' : boton}</button>
      </form>
      <div className="asistente-ejemplos">
        {ejemplos.map((e) => (
          <button key={e} type="button" className="enlace" disabled={pensando} onClick={() => { setFrase(e); leer(e) }}>«{e}»</button>
        ))}
      </div>
      {lectura && (
        lectura.entendido.length ? (
          <div className="asistente-entendido" aria-live="polite">
            <b>Hemos entendido:</b>
            {lectura.origen === 'ia' && <span className="asistente-origen">con IA</span>}
            <ul>{lectura.entendido.map((t) => <li key={t}>{t}</li>)}</ul>
            <p className="ayuda">Si no es así, corrígelo abajo.</p>
          </div>
        ) : (
          <p className="asistente-entendido" aria-live="polite">No lo hemos entendido. {noEntendido}</p>
        )
      )}
    </div>
  )
}
