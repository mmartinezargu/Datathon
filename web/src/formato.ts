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
