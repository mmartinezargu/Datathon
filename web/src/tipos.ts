// Tipos compartidos por toda la app.
// Un "tipo" en TypeScript es como un molde: dice qué campos tiene cada objeto.

/** Ingredientes de la capacidad que deja preparados Python (etl/capacidad.py). */
export interface IngredientesCapacidad {
  viv_principales: number
  viv_no_principales: number // vacías o de segunda residencia (Censo 2021)
  viv_vacias: number // vacías según el consumo eléctrico (Censo 2021, INE 59531); sin ese dato, estimadas con su zona
  viv_vacias_sin_dato: boolean // el INE no da las vacías del municipio: viv_vacias es una estimación con su zona estadística
  personas_hogar: number
  viv_previstas: number // viviendas previstas en suelo aún sin desarrollar (planeamiento 2025), con las estimadas
  viv_previstas_estimadas: number // parte de viv_previstas estimada: suelo residencial sin cifra × densidad de los ámbitos con cifra
  viv_previstas_con_estimacion: boolean // tiene suelo residencial sin cifra de viviendas en el planeamiento
  suelo_pendiente_ha: number
  colegios_primaria: number
  colegios_secundaria: number
  ninos_primaria: number // niños de 6 a 11 años en 2025 [est.], a partir de grupos de 5 años del Censo anual: pasan plazas de colegio a personas
  ninos_secundaria: number // de 12 a 17 años [est.]
  alumnos_primaria: number // alumnos matriculados en primaria en los colegios del municipio (ALMUDENA, IECM)
  alumnos_secundaria: number // en ESO
  alumnos_estimados: boolean // tiene colegio pero ALMUDENA no le da alumnos: ese nivel sale de los niños estimados
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
  hospital_min: number // minutos en coche, sin tráfico (OSRM), al hospital general público al que se llega antes (puede ser otro)
  hospital_min_municipio: string // municipio de ese hospital
  vecinos_min: Record<string, number> // ine -> minutos en coche desde este núcleo hasta el de otro pueblo del reto (≤ 60 min); vacío si no es del reto
  capacidad: IngredientesCapacidad | null
}

/** Cómo se mide lo lejos que queda algo: minutos en coche, sin tráfico (OSRM), o km en línea recta. */
export type Medida = 'min' | 'km'

/** Las palancas que mueve el usuario. */
export interface Escenario {
  anio: number // horizonte: 2030, 2035 o 2039
  personas: number // personas que absorben los 155 municipios hasta ese año
  pctSuelo: number // parte del suelo previsto que llega a construirse (0-1)
  pctVivienda: number // parte de la vivienda vacía que se ocupa (0-1)
  ritmoMax: number // crecimiento máximo prudente al año (0.03 = 3 %)
  exigencia: number // hasta qué percentil se pueden cargar colegios y centros (0.75 = como el 25 % más cargado)
  reequilibrio: boolean // reubicar lo que no cabe en pueblos cercanos con sitio
  medida: Medida // decide qué hospital queda lejos y qué radio se usa al reubicar
  radioKm: number // con medida 'km': hasta qué distancia se busca sitio (línea recta entre núcleos)
  radioMin: number // con medida 'min': hasta cuántos minutos en coche se busca sitio (entre núcleos)
}

/** Lo que el plan construye en un municipio, sumando sus obras (inversionesDe en motor.ts). */
export interface Inversion {
  plazasPrimaria: number // plazas de primaria nuevas (ampliaciones y colegios)
  plazasSecundaria: number // plazas de ESO nuevas (institutos)
  centros: number // centros de salud nuevos
  personasSanidad: number // personas que atienden entre todos
}

/** Inversiones del plan, por código INE. */
export type Inversiones = Record<string, Inversion>

export type TipoObra = 'ampliar_primaria' | 'colegio_primaria' | 'instituto' | 'centro_salud'

/** Lo que vale cada tipo de obra. En un centro de salud, «plazas» son las personas que atiende y «eurosPorPlaza», lo que cuesta el centro. */
export interface ValoresObra {
  plazas: number
  eurosPorPlaza: number
  anios: number // de que empiezan las obras a que abre
}

/** Una fila del plan de la pestaña «Plan». */
export interface Obra extends ValoresObra {
  ine: string
  tipo: TipoObra
  inicio: number // año en que empiezan las obras
}

/** Una obra real de la Comunidad de Madrid (web/public/datos/obras_referencia.json, de etl/obras_referencia.py). */
export interface ObraReferencia {
  tipo: string // «ampliación de colegio», «colegio nuevo», «instituto nuevo», «ampliación de instituto», «centro de salud nuevo»
  obra_plan: TipoObra | '' // la obra del plan cuyo valor por defecto sale de su mediana; '' = de referencia, no entra
  nombre: string
  municipio: string
  fecha: string // AAAA-MM-DD
  plazas: number | null // plazas escolares o, en un centro de salud, vecinos que atiende
  coste_eur: number
  eur_por_plaza: number | null
  fuente: string
  url: string
  nota: string
}

/** Las obras de referencia y, por obra del plan, la mediana (€/plaza; en un centro de salud, € por centro), el mínimo y el máximo. */
export interface DatosObrasReferencia {
  obras: ObraReferencia[]
  medianas: Record<TipoObra, { n: number; mediana: number; min: number; max: number }>
}

/** Valores por defecto del plan: todos editables, con su fuente en «Cómo funciona». */
export interface ParametrosPlan {
  obras: Record<TipoObra, ValoresObra>
  anioInicio: number // año en que pueden empezar las obras
}

/** Con qué se rellena el plan recomendado. Sin presupuesto ni municipios: todo lo que haga falta, en los 155. */
export interface OpcionesPlan {
  presupuestoTotal?: number // euros
  presupuestoAnual?: number // euros al año: las obras se escalonan para no pasarse
  soloMunicipios?: string[] // ine
}

/** Lo que consigue un plan (evaluarPlan en motor.ts). */
export interface ResultadoPlan {
  resultados: ResultadoMunicipio[] // con el plan
  coste: number // euros
  obras: Record<TipoObra, number> // cuántas de cada tipo
  municipios: number // en cuántos municipios se construye
  sinSitioAntes: number // sin el plan
  sinSitio: number // con el plan
  sinSitioPor: Record<Limite, number> // lo que sigue sin sitio, según el recurso que limita
  pasanACaber: number // sinSitioAntes − sinSitio
  reubicadas: number // con el plan, personas que van a un pueblo cercano
  ultimaApertura: number | null
  calendario: { anio: number; personas: number }[] // personas que pasan a caber cada año, según abren las obras
  ganaPorObra: number[] // cuánta gente se quedaría sin sitio de más en los 155 si se quita solo esa obra (no tienen por qué sumar pasanACaber)
}

/** Curva de alumnos por colegio según el tamaño: log(límite) = a + b · log(población) + ajuste. */
export interface CurvaColegio {
  a: number
  b: number
  ajuste: number // percentil «exigencia» de lo que se aparta cada municipio de la recta
}

/** Límites de saturación calculados con la exigencia elegida. */
export interface Umbrales {
  primaria: CurvaColegio // alumnos por colegio de primaria según el tamaño del municipio
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
  min: number | null // en coche, sin tráfico, de núcleo a núcleo (null = más de 60 min)
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
  hospitalCerca: boolean // que el hospital general público más cercano no quede lejos (hospitalLejos de motor.ts, con la medida del escenario)
  zona: string | null // zona estadística; null = cualquiera
  tamano: Tamano
}

/** Lo que se entiende de una frase como «somos 4 y trabajo en Getafe». */
export interface LecturaFrase {
  filtros: FiltrosMudanza
  entendido: string[] // lo que hemos sacado de la frase, en palabras sencillas (vacío = no hemos entendido nada)
  origen: 'ia' | 'palabras' // la IA (api/asistente.ts) o el asistente de palabras clave (sin internet)
  perfilDicho: boolean // la frase dice quién es (si no, el perfil de `filtros` es el que ya había)
  mezcla: Partial<Record<Perfil, number>> | null // % de quién llega que dice la frase («30 % familias»); null si no dice ninguno
}

/** Un municipio en el ranking de «¿Dónde me mudo?». */
export interface Candidato {
  ine: string
  puntos: number // 0-100: lo bien que encaja con el perfil, comparado con los demás que pasan los filtros
  sitio: Record<Recurso, number | null> // personas que aún caben en cada recurso después de que llegue la gente prevista (null = no aplica)
  razones: Recurso[] // los recursos que más le suben en el ranking, de más a menos
}

/** Validación 2015→2025 (etl/validacion.py → datos/validacion.json). */
export interface DatosValidacion {
  periodo: string
  datos_hasta: number
  municipios: number
  crecimiento_real_total: number
  modelos: {
    modelo: string
    wape: number
    fuera_municipio: number // parte del total colocada en otro municipio: sum|previsto − real| ÷ 2 ÷ total
    fuera_zona: number // lo mismo, sumando por zona
    aciertos_top20: number
    spearman: number
  }[]
  mayores_errores: { ine: string; nombre: string; crecimiento_real: number; crecimiento_previsto: number }[]
  /** Población de las zonas de salud (nuestro método, llevado a 2021) frente al Censo 2021 por zona (IECM, T21SALUD01). */
  zonas_salud: {
    todas: ResumenZonas
    del_reto: ResumenZonas // solo las zonas a las que va algún municipio del reto
    mas_se_apartan: { codigo: string; nombre: string; estimada_2021: number; censo_2021: number; dif: number; del_reto: boolean }[]
  }
}

export interface ResumenZonas {
  zonas: number
  correlacion: number
  dif_media: number // media de (estimada ÷ censo − 1): positivo = nos pasamos
  dif_abs_media: number
  dif_abs_mediana: number
}

/** Pestaña «Atraer»: dónde se puede llevar a la gente (se aplica a todos los perfiles). */
export interface FiltrosReparto {
  zona: string | null // zona estadística; null = cualquiera
  tamano: Tamano
  hospitalCerca: boolean // todos con el hospital cerca (las personas mayores, siempre)
  instituto: boolean // las familias, solo a pueblos con instituto
}

/** Pestaña «Atraer»: cómo se reparten los que llegan entre los pueblos, según quiénes son. */
export interface Reparto {
  pueblos: { ine: string; porPerfil: Record<Perfil, number>; total: number; lleno: boolean }[] // de más a menos recibidos
  colocados: number
  sinSitio: Record<Perfil, number>
}
