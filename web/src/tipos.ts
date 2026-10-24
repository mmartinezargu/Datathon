// Tipos compartidos por toda la app.
// Un "tipo" en TypeScript es como un molde: dice qué campos tiene cada objeto.

/** Lo que Python deja preparado para cada municipio (web/public/datos/municipios.json). */
export interface Municipio {
  ine: string; // código INE de 5 cifras, la llave que cruza todos los datos
  nombre: string;
  zona: string; // zona estadística (NUTS4)
  superficie_km2: number;
  universo: boolean; // true = menos de 50.000 habitantes en 2025
  poblacion: Record<string, number>; // año -> habitantes
  g_propia: number | null; // tasa anual 2015-2025 del municipio
  g_zona: number | null; // tasa anual de su zona
  g_suavizada: number | null; // mezcla de las dos (estimador bayesiano empírico)
}

/** Las palancas que mueve el usuario. */
export interface Escenario {
  anio: number; // horizonte: 2030, 2035 o 2039
  personas: number; // personas que absorben los 155 municipios hasta ese año
}

/** Lo que calcula el motor para cada municipio. */
export interface ResultadoMunicipio {
  ine: string;
  poblacion: number; // habitantes en 2025
  llegan: number; // presión: personas que le llegarían
  crecimiento: number; // llegan / poblacion
}
