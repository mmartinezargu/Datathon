// Formato de números en español: 12345 -> "12.345"; 0.123 -> "12,3 %".
// Se hace a mano porque Intl en español no pone punto en los números de 4 cifras (1234).

export function miles(n: number): string {
  const entero = Math.round(n)
  const signo = entero < 0 ? '−' : ''
  return signo + String(Math.abs(entero)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

export function pct(n: number, decimales = 1): string {
  return (n * 100).toFixed(decimales).replace('.', ',') + ' %'
}

/** Un número con decimales: 12.34 -> "12,3". */
export function decimal(n: number, decimales = 1): string {
  return n.toFixed(decimales).replace('.', ',')
}

/** Personas que caben: 0 se escribe «0 (al límite)», porque quiere decir que ya está por encima del límite hoy. */
export function caben(n: number): string {
  return n < 1 ? '0 (al límite)' : miles(n)
}

/** Euros en millones: 9500000 -> "9,5 M€"; 16000000 -> "16 M€". */
export function millones(n: number): string {
  return (n / 1e6).toFixed(1).replace(/\.0$/, '').replace('.', ',') + ' M€'
}
