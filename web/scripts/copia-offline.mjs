// Copia de CABIDA que funciona sin internet, por si falla la wifi en la final.
//
// Genera offline/CABIDA.html: un único archivo con todo dentro (código, estilos, tipografías
// y datos). Se abre con doble clic, sin servidor y sin conexión. Al lado deja
// offline/datos/tabla_maestra.csv para el enlace de descarga.
//
// Uso (desde web/):  npm run offline     (compila y genera la copia)

import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'

const DIST = new URL('../dist/', import.meta.url)
const SALIDA = new URL('../offline/', import.meta.url)
const DATOS = ['municipios.json', 'zonas_salud.json', 'limites.geojson', 'validacion.json']
// Navegador moderno: así Google Fonts devuelve woff2
const NAVEGADOR = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'

const leer = (ruta) => readFileSync(new URL(ruta, DIST), 'utf8')
let html = leer('index.html')

// 1. Tipografías: se descargan una vez y van dentro del HTML (solo el alfabeto latino)
const enlaceFuentes = html.match(/<link href="(https:\/\/fonts\.googleapis\.com\/[^"]+)" rel="stylesheet" \/>/)
html = html.replace(/\s*<link rel="preconnect"[^>]*>/g, '')
if (enlaceFuentes) {
  const css = await (await fetch(enlaceFuentes[1].replaceAll('&amp;', '&'), { headers: { 'User-Agent': NAVEGADOR } })).text()
  const bloques = [...css.matchAll(/\/\* latin \*\/\s*(@font-face\s*{[^}]+})/g)].map((b) => b[1])
  const embebidos = await Promise.all(bloques.map(async (b) => {
    const url = b.match(/url\((https:[^)]+)\)/)[1]
    const fuente = Buffer.from(await (await fetch(url)).arrayBuffer()).toString('base64')
    return b.replace(url, `data:font/woff2;base64,${fuente}`)
  }))
  html = html.replace(enlaceFuentes[0], `<style>${embebidos.join('\n')}</style>`)
  console.log(`  tipografías: ${embebidos.length} dentro del HTML`)
}

// 2. Estilos y código, dentro del HTML
html = html.replace(/<link rel="stylesheet"[^>]*href="\.\/(assets\/[^"]+\.css)"[^>]*>/, (_, ruta) => `<style>${leer(ruta)}</style>`)
const script = html.match(/<script type="module"[^>]*src="\.\/(assets\/[^"]+\.js)"[^>]*><\/script>/)
html = html.replace(script[0], '')

// 3. Datos, dentro del HTML (App.tsx los lee de window.__DATOS_CABIDA__ en vez de pedirlos)
const datos = Object.fromEntries(DATOS.map((f) => [f, JSON.parse(readFileSync(new URL(`datos/${f}`, DIST), 'utf8'))]))
const sinCierre = (texto) => texto.replaceAll('</script', '<\\/script') // que no corte la etiqueta <script>
html = html.replace('</body>',
  `<script>window.__DATOS_CABIDA__ = ${sinCierre(JSON.stringify(datos))}</script>\n` +
  `<script type="module">${sinCierre(leer(script[1]))}</script>\n</body>`)

mkdirSync(new URL('datos/', SALIDA), { recursive: true })
writeFileSync(new URL('CABIDA.html', SALIDA), html)
copyFileSync(new URL('datos/tabla_maestra.csv', DIST), new URL('datos/tabla_maestra.csv', SALIDA))
console.log(`  offline/CABIDA.html: ${(Buffer.byteLength(html) / 1e6).toFixed(1)} MB`)
