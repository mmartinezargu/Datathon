/// <reference types="vite/client" />

interface Window {
  /** Solo en la copia sin internet (scripts/copia-offline.mjs): los datos van dentro del HTML. */
  __DATOS_CABIDA__?: Record<string, unknown>
}
