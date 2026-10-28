// La página de datos abiertos (public/datos-abiertos/) debe estar al día con data/out:
// si falla, ejecuta «npm run datos-abiertos» (o «npm run datasets») desde web/.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const OUT = new URL('../../data/out/', import.meta.url)
const PAGINA = new URL('../public/datos-abiertos/', import.meta.url)
const indice = readFileSync(new URL('index.html', PAGINA), 'utf8')
const archivos = [...indice.matchAll(/<h3>([\w]+\.csv)<\/h3>[\s\S]*?<b>([\d.]+)<\/b> filas/g)]

describe('página de datos abiertos', () => {
  it('ofrece los 7 CSV', () => {
    expect(archivos.map((a) => a[1]).sort()).toEqual([
      'diccionario.csv', 'obras_referencia.csv', 'plan_recomendado.csv', 'resultados_2035.csv',
      'tabla_maestra.csv', 'validacion_municipios.csv', 'zonas_salud.csv',
    ])
  })

  it.each(archivos.map((a) => [a[1], a[2]]))('%s es igual que en data/out y tiene las filas que dice', (archivo, filas) => {
    const texto = readFileSync(new URL(archivo, OUT), 'utf8')
    expect(readFileSync(new URL(archivo, PAGINA), 'utf8')).toBe(texto)
    // Filas sin la cabecera, sin contar los saltos de línea entre comillas
    const lineas = texto.replace(/"[^"]*"/g, '').split('\n').filter((l) => l !== '').length - 1
    expect(filas.replaceAll('.', '')).toBe(String(lineas))
  })
})
