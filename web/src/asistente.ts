// Asistente de «¿Dónde me mudo?»: primero pregunta a la IA (api/asistente.ts, Groq) y, si no hay
// internet, la función no está (npm run dev, copia sin internet) o tarda, usa el de palabras clave.

import { interpretarFrase, lecturaDeIA, zonasConCandidatos } from './mudanza'
import type { FiltrosMudanza, LecturaFrase, Medida, Municipio } from './tipos'

const ESPERA_MAX_MS = 8000 // la función puede probar dos modelos de hasta 3,5 s

export async function leerFrase(frase: string, municipios: Municipio[], actual: FiltrosMudanza, medida: Medida): Promise<LecturaFrase> {
  const sinRed = !navigator.onLine || window.__DATOS_CABIDA__ !== undefined || location.protocol === 'file:'
  if (!sinRed) {
    try {
      const r = await fetch('/api/asistente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frase, zonas: zonasConCandidatos(municipios) }),
        signal: AbortSignal.timeout(ESPERA_MAX_MS),
      })
      const lectura = r.ok ? lecturaDeIA(await r.json(), municipios, actual, medida) : null
      if (lectura) return lectura
    } catch {
      // Sin conexión o se ha pasado de tiempo: seguimos con las palabras clave
    }
  }
  return interpretarFrase(frase, municipios, actual, medida)
}
