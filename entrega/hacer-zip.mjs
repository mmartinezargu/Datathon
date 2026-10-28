// Zip para pasar por el grupo el día de la final: la copia sin internet, la presentación, el guion y la propuesta.
// No se sube al repo (CABIDA_final.zip está en .gitignore). Sin dependencias: el zip se escribe a mano con zlib.
//
// Uso (desde la raíz, después de regenerar entrega/offline/):  node entrega/hacer-zip.mjs
// Escribe CABIDA_final.zip en la raíz del repo.

import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { crc32, deflateRawSync } from 'node:zlib'

const RAIZ = new URL('../', import.meta.url)
const SALIDA = new URL('CABIDA_final.zip', RAIZ)

const LEEME = [
  'Plan A: abrir https://cabida.vercel.app en el navegador.',
  'Plan B: si falla la wifi, compartir los datos del móvil con el portátil y abrir la misma dirección.',
  'Plan C: sin internet, doble clic en CABIDA.html (la web entera; deja las carpetas datos y datos-abiertos a su lado).',
  'Diapositivas: doble clic en CABIDA_diapositivas.html y pulsar F (pantalla completa); flecha derecha para avanzar.',
  'Si falla todo: abrir CABIDA_presentacion_final.pdf.',
].join('\r\n') + '\r\n'

/** [ruta dentro del zip, contenido] de una carpeta, con sus subcarpetas. */
function carpeta(origen, destino) {
  return readdirSync(new URL(origen, RAIZ)).sort().flatMap((nombre) => {
    const ruta = `${origen}/${nombre}`
    return statSync(new URL(ruta, RAIZ)).isDirectory() ? carpeta(ruta, `${destino}/${nombre}`) : [[`${destino}/${nombre}`, archivo(ruta)]]
  })
}
const archivo = (ruta) => readFileSync(new URL(ruta, RAIZ))

const entradas = [
  ['CABIDA_diapositivas.html', archivo('entrega/offline/CABIDA_diapositivas.html')],
  ['CABIDA.html', archivo('entrega/offline/CABIDA.html')],
  ...carpeta('entrega/offline/datos', 'datos'),
  ...carpeta('entrega/offline/datos-abiertos', 'datos-abiertos'),
  ['CABIDA_presentacion_final.pdf', archivo('entrega/CABIDA_presentacion_final.pdf')],
  ['GUION.md', archivo('presentacion/GUION.md')],
  ...readdirSync(new URL('entrega/', RAIZ)).filter((f) => /^CABIDA_\d_.*\.pdf$/.test(f)).sort()
    .map((f) => [`propuesta/${f}`, archivo(`entrega/${f}`)]),
  ['LEEME.txt', Buffer.from(LEEME, 'utf8')],
]

// Formato zip (APPNOTE): cabecera local + datos de cada archivo, directorio central y registro final
const ahora = new Date()
const hora = (ahora.getHours() << 11) | (ahora.getMinutes() << 5) | (ahora.getSeconds() >> 1)
const fecha = ((ahora.getFullYear() - 1980) << 9) | ((ahora.getMonth() + 1) << 5) | ahora.getDate()
const UTF8 = 1 << 11 // nombres en UTF-8
const locales = []
const centrales = []
let desplazamiento = 0
for (const [nombre, datos] of entradas) {
  const nombreB = Buffer.from(nombre, 'utf8')
  const comprimido = deflateRawSync(datos, { level: 9 })
  const crc = crc32(datos)
  const local = Buffer.alloc(30)
  local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(UTF8, 6); local.writeUInt16LE(8, 8)
  local.writeUInt16LE(hora, 10); local.writeUInt16LE(fecha, 12); local.writeUInt32LE(crc, 14)
  local.writeUInt32LE(comprimido.length, 18); local.writeUInt32LE(datos.length, 22); local.writeUInt16LE(nombreB.length, 26)
  const central = Buffer.alloc(46)
  central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6); central.writeUInt16LE(UTF8, 8)
  central.writeUInt16LE(8, 10); central.writeUInt16LE(hora, 12); central.writeUInt16LE(fecha, 14); central.writeUInt32LE(crc, 16)
  central.writeUInt32LE(comprimido.length, 20); central.writeUInt32LE(datos.length, 24); central.writeUInt16LE(nombreB.length, 28)
  central.writeUInt32LE(desplazamiento, 42)
  locales.push(local, nombreB, comprimido)
  centrales.push(central, nombreB)
  desplazamiento += local.length + nombreB.length + comprimido.length
}
const directorio = Buffer.concat(centrales)
const fin = Buffer.alloc(22)
fin.writeUInt32LE(0x06054b50, 0); fin.writeUInt16LE(entradas.length, 8); fin.writeUInt16LE(entradas.length, 10)
fin.writeUInt32LE(directorio.length, 12); fin.writeUInt32LE(desplazamiento, 16)
writeFileSync(SALIDA, Buffer.concat([...locales, directorio, fin]))
console.log(`CABIDA_final.zip: ${entradas.length} archivos, ${(statSync(SALIDA).size / 1e6).toFixed(1)} MB`)
