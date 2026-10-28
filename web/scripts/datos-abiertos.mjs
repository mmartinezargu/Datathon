// Página de datos abiertos (https://cabida.vercel.app/datos-abiertos/): HTML suelto, fuera de la app de React.
// Copia los CSV de data/out a public/datos-abiertos/ y rellena la plantilla scripts/datos-abiertos.html con
// las filas y el tamaño de cada archivo (contados en los propios CSV) y la tabla de fuentes de data/out/README.md.
// Nada de esa carpeta se edita a mano.
//
// Uso (desde web/):  npm run datos-abiertos     (también va al final de npm run datasets)

import { copyFileSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'

const OUT = new URL('../../data/out/', import.meta.url)
const SALIDA = new URL('../public/datos-abiertos/', import.meta.url)
const PLANTILLA = new URL('datos-abiertos.html', import.meta.url)

// En el orden de la página: primero lo que calcula CABIDA, después los datos de partida y el diccionario
export const ARCHIVOS = [
  ['resultados_2035.csv', 'Lo que calcula CABIDA para cada municipio en 2035: cuánta gente llega, cuánta cabe, qué lo limita y de qué tipo es.'],
  ['plan_recomendado.csv', 'Las obras del plan recomendado: dónde, cuántas plazas, cuánto cuestan, cuándo abren y cuánta gente pasa a caber.'],
  ['zonas_salud.csv', 'Las zonas básicas de salud: población, límite, sitio libre y municipios del reto de cada una.'],
  ['tabla_maestra.csv', 'Los datos de partida de cada municipio: población 2005–2025, vivienda, planeamiento, colegios y sanidad.'],
  ['validacion_municipios.csv', 'La prueba contra el pasado: lo que el modelo preveía en 2015 frente a lo que creció cada municipio hasta 2025.'],
  ['obras_referencia.csv', 'Obras reales de la Comunidad de Madrid (2023–2026) con su coste por plaza: dan los costes del plan.'],
  ['diccionario.csv', 'Qué significa cada columna de los demás archivos, en qué unidad va y de qué fuente sale.'],
]
const COLUMNAS_ODBL = ['hospital_min', 'hospital_min_municipio', 'vecinos_min']

/** Filas de un CSV (sin la cabecera), respetando los saltos de línea dentro de comillas. */
export function filasCsv(texto) {
  let filas = 0
  let entreComillas = false
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i]
    if (c === '"') entreComillas = !entreComillas
    else if (c === '\n' && !entreComillas) filas++
  }
  if (texto.length && !texto.endsWith('\n')) filas++
  return filas - 1
}

// Como formato.ts (Intl en español no pone punto en los números de 4 cifras)
const miles = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
const tamano = (bytes) => (bytes < 1e6 ? `${miles(bytes / 1e3)} KB` : `${(bytes / 1e6).toFixed(1).replace('.', ',')} MB`)
const html = (t) => t.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
const enLinea = (t) => html(t).replace(/`([^`]+)`/g, '<code>$1</code>')

/** La tabla «## Fuentes» de data/out/README.md: [dato, quién lo publica, url]. */
function fuentes() {
  const readme = readFileSync(new URL('README.md', OUT), 'utf8')
  const seccion = readme.split('\n## Fuentes')[1].split('\n## ')[0]
  return seccion.split('\n')
    .filter((l) => l.startsWith('|') && !l.startsWith('|---') && !l.startsWith('| Dato '))
    .map((l) => l.split('|').slice(1, -1).map((c) => c.trim()))
}

function main() {
  mkdirSync(SALIDA, { recursive: true })
  const tarjetas = ARCHIVOS.map(([archivo, que]) => {
    const origen = new URL(archivo, OUT)
    const texto = readFileSync(origen, 'utf8')
    copyFileSync(origen, new URL(archivo, SALIDA))
    const filas = filasCsv(texto)
    const odbl = texto.slice(0, texto.indexOf('\n')).split(',').some((c) => COLUMNAS_ODBL.includes(c))
    console.log(`  datos-abiertos/${archivo}: ${filas} filas`)
    return `      <article class="tarjeta">
        <h3>${archivo}</h3>
        <p>${html(que)}</p>
        <div class="meta"><span><b>${miles(filas)}</b> filas</span><span>${tamano(statSync(origen).size)}</span>${odbl ? '<span class="etiqueta">Minutos en coche: ODbL</span>' : ''}</div>
        <a class="boton" href="${archivo}" download>Descargar CSV <span aria-hidden="true">↓</span></a>
      </article>`
  })
  const filasFuentes = fuentes().map(([dato, quien, url]) =>
    `          <tr><td>${enLinea(dato)}</td><td>${enLinea(quien)}</td><td><a href="${html(url)}" target="_blank" rel="noreferrer">${html(new URL(url).hostname)} ↗</a></td></tr>`)
  const pagina = readFileSync(PLANTILLA, 'utf8')
    .replace(/<!-- Plantilla[\s\S]*?-->\n/, '<!-- Generado por web/scripts/datos-abiertos.mjs con datos-abiertos.html: no se edita a mano -->\n')
    .replace('{{ARCHIVOS}}', () => tarjetas.join('\n'))
    .replace('{{FUENTES}}', () => filasFuentes.join('\n'))
  writeFileSync(new URL('index.html', SALIDA), pagina)
  console.log(`  datos-abiertos/index.html: ${ARCHIVOS.length} archivos y ${filasFuentes.length} fuentes`)
}

if (import.meta.url === `file://${process.argv[1]}`) main()
