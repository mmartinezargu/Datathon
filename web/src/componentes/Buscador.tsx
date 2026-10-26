// Buscador de municipios del mapa: escribe un nombre y abre su ficha.
// Sin tildes ni mayúsculas: «alamo» encuentra «El Álamo». Las sugerencias son las del navegador (datalist).

import { useState } from 'react'
import { normalizar } from '../mudanza'
import type { Municipio } from '../tipos'

export function Buscador({ municipios, onElegir, texto: indicacion = 'Buscar municipio' }: {
  municipios: Municipio[]; onElegir: (ine: string) => void; texto?: string
}) {
  const [texto, setTexto] = useState('')
  const [noEncontrado, setNoEncontrado] = useState(false)

  // Exacto primero; si no, el primero que empieza así; si no, el primero que lo contiene
  function buscar(valor: string): Municipio | undefined {
    const t = normalizar(valor.trim())
    if (!t) return undefined
    const nombres = municipios.map((m) => ({ m, n: normalizar(m.nombre) }))
    return (nombres.find((x) => x.n === t) ?? nombres.find((x) => x.n.startsWith(t)) ?? nombres.find((x) => x.n.includes(t)))?.m
  }

  function elegir(m: Municipio) {
    onElegir(m.ine)
    setTexto('')
    setNoEncontrado(false)
  }

  return (
    <form className="buscador" role="search" onSubmit={(e) => {
      e.preventDefault()
      const m = buscar(texto)
      if (m) elegir(m)
      else setNoEncontrado(texto.trim() !== '')
    }}>
      <input type="search" list="municipios-buscador" value={texto} placeholder={indicacion}
        aria-label={indicacion} aria-invalid={noEncontrado}
        onChange={(e) => {
          setTexto(e.target.value)
          setNoEncontrado(false)
          // Al elegir una sugerencia, el texto coincide con un nombre: se abre su ficha directamente
          const exacto = municipios.find((m) => m.nombre === e.target.value)
          if (exacto) elegir(exacto)
        }} />
      <datalist id="municipios-buscador">
        {municipios.map((m) => <option key={m.ine} value={m.nombre} />)}
      </datalist>
      {noEncontrado && <span className="buscador-aviso" role="status">No está entre los 155</span>}
    </form>
  )
}
