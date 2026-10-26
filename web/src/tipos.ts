// Tipos compartidos por toda la app.
// Un "tipo" en TypeScript es como un molde: dice qué campos tiene cada objeto.

/** Ingredientes de la capacidad que deja preparados Python (etl/capacidad.py). */
export interface IngredientesCapacidad {
  viv_principales: number
  viv_no_principales: number // vacías o de segunda residencia (Censo 2021)
  personas_hogar: number
  viv_previstas: number // viviendas previstas en suelo aún sin desarrollar (planeamiento 2025)
  suelo_pendiente_ha: number
  colegios_primaria: number
  colegios_secundaria: number
  ninos_primaria: number // niños de 6 a 11 años en 2025 [est.], a partir de grupos de 5 años del Censo anual
  ninos_secundaria: number // de 12 a 17 años [est.]
  zbs_codigo: string // zona básica de salud
  zbs_nombre: string
  zbs_poblacion: number
}

/** Zona básica de salud: el área que atiende un centro de salud (web/public/datos/zonas_salud.json). */
export interface ZonaSalud {
  codigo: string
  nombre: string
  poblacion: number
}

/** Lo que Python deja preparado para cada municipio (web/public/datos/municipios.json). */
export interface Municipio {
  ine: string // código INE de 5 cifras, la llave que cruza todos los datos
  nombre: string
  zona: string // zona estadística (NUTS4)
  superficie_km2: number
  universo: boolean // true = menos de 50.000 habitantes en 2025
  poblacion: Record<string, number> // año -> habitantes
  g_propia: number | null // tasa anual 2015-2025 del municipio
  g_zona: number | null // tasa anual de su zona
  g_suavizada: number | null // mezcla de las dos (estimador bayesiano empírico)
  nucleo_x: number // núcleo del municipio (mediana de sus colegios), en km UTM 30N
  nucleo_y: number
  hospital_km: number // en línea recta, del núcleo al hospital general público más cercano
  hospital_municipio: string // municipio de ese hospital
  capacidad: IngredientesCapacidad | null
}

/** Las palancas que mueve el usuario. */
export interface Escenario {
  anio: number // horizonte: 2030, 2035 o 2039
  personas: number // personas que absorben los 155 municipios hasta ese año
  pctSuelo: number // parte del suelo previsto que llega a construirse (0-1)
  pctVivienda: number // parte de la vivienda vacía o secundaria que se ocupa (0-1)
  ritmoMax: number // crecimiento máximo prudente al año (0.03 = 3 %)
  exigencia: number // hasta qué percentil se pueden cargar colegios y centros (0.75 = como el 25 % más cargado)
  reequilibrio: boolean // reubicar lo que no cabe en pueblos cercanos con sitio
  radioKm: number // hasta qué distancia se busca sitio (línea recta entre núcleos)
}

/** Lo que el usuario decide construir en un municipio (modo «¿y si invertimos aquí?»). */
export interface Inversion {
  colegios: number // colegios nuevos (cada uno va al nivel con menos sitio)
  centros: number // centros de salud nuevos
}

/** Inversiones simuladas, por código INE. */
export type Inversiones = Record<string, Inversion>

/** Curva de niños por colegio según el tamaño: log(límite) = a + b · log(población) + ajuste. */
export interface CurvaColegio {
  a: number
  b: number
  ajuste: number // percentil «exigencia» de lo que se aparta cada municipio de la recta
}

/** Límites de saturación calculados con la exigencia elegida. */
export interface Umbrales {
  primaria: CurvaColegio // niños por colegio de primaria según el tamaño del municipio
  secundaria: CurvaColegio
  zonaSalud: number // personas que aguanta una zona básica de salud (el mismo para todas)
}

export type Limite = 'vivienda' | 'colegios' | 'sanidad' | 'ritmo'
export type Tipo = 'tension' | 'polo' | 'oportunidad' | 'consolidacion'

/** Lo que calcula el motor para cada municipio. */
export interface ResultadoMunicipio {
  ine: string
  poblacion: number // habitantes en 2025
  llegan: number // presión: personas que le llegarían
  crecimiento: number // llegan / poblacion
  limites: Record<Limite, number | null> // personas que caben según cada recurso (null = no aplica)
  caben: number // capacidad: el menor de los límites
  limitante: Limite // el recurso que pone el límite
  margen: number // caben - llegan (negativo = no caben)
  tipo: Tipo
  condicionada: boolean // oportunidad con el hospital lejos: hay sitio, pero antes hay que asegurar el acceso
  recibe: number // con reubicación: personas que no caben en pueblos cercanos y vienen aquí
  envia: number // con reubicación: personas que le tocaban, no caben y van a pueblos cercanos
  envios: Traslado[] // a dónde van, de más a menos personas
  llegadas: Traslado[] // de dónde vienen, de más a menos personas
}

/** Personas que no caben en un municipio y se reubican en otro cercano con sitio. */
export interface Traslado {
  origen: string // ine
  destino: string // ine
  personas: number
  km: number // en línea recta entre núcleos
}

/** Vista ciudadana «¿Dónde me mudo?». */
export type Perfil = 'familia' | 'teletrabajo' | 'mayor'
export type Tamano = 'todos' | 'pueblo' | 'mediano' | 'grande'
export type Recurso = 'colegios' | 'sanidad' | 'vivienda'

export interface FiltrosMudanza {
  perfil: Perfil
  colegio: boolean // que tenga colegio de primaria
  instituto: boolean // que tenga instituto (secundaria)
  sitioLibre: boolean // que no se quede sin sitio con la gente que llega
  zona: string | null // zona estadística; null = cualquiera
  tamano: Tamano
}

/** Lo que se entiende de una frase como «somos 4 y trabajo en Getafe». */
export interface LecturaFrase {
  filtros: FiltrosMudanza
  entendido: string[] // lo que hemos sacado de la frase, en palabras sencillas (vacío = no hemos entendido nada)
  origen: 'ia' | 'palabras' // la IA (api/asistente.ts) o el asistente de palabras clave (sin internet)
}

/** Un municipio en el ranking de «¿Dónde me mudo?». */
export interface Candidato {
  ine: string
  puntos: number // 0-100: lo bien que encaja con el perfil, comparado con los demás que pasan los filtros
  sitio: Record<Recurso, number | null> // personas que aún caben en cada recurso después de que llegue la gente prevista (null = no aplica)
  razones: Recurso[] // los recursos que más le suben en el ranking, de más a menos
}
