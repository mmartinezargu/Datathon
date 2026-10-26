// De dónde salen los valores por defecto del plan (PARAMETROS_PLAN en motor.ts).
// Los usan la pestaña «Plan» (panel «Parámetros») y «Cómo funciona».

import type { TipoObra } from './tipos'

export const NOMBRE_OBRA: Record<TipoObra, string> = {
  ampliar_primaria: 'Ampliar colegio',
  colegio_primaria: 'Colegio nuevo',
  instituto: 'Instituto',
  centro_salud: 'Centro de salud',
}

/** Qué hace cada obra en el modelo, en una frase. */
export const QUE_HACE_OBRA: Record<TipoObra, string> = {
  ampliar_primaria: 'Suma plazas de primaria a un colegio que ya existe (una línea por colegio).',
  colegio_primaria: 'Suma plazas de primaria con un colegio nuevo.',
  instituto: 'Suma plazas de ESO con un instituto nuevo.',
  centro_salud: 'Suma a su zona de salud las personas que atiende, después de cubrir el exceso que ya tenga.',
}

export interface Enlace { texto: string; url: string }

const NOTA_29_03_2023 = 'https://www.comunidad.madrid/press-releases/download/77639'

export const FUENTES_PLAN: Record<TipoObra, { texto: string; enlaces: Enlace[] }> = {
  ampliar_primaria: {
    texto: 'CEIP María Blanchard (Getafe): 2,8 M€ por 475 plazas, unos 5.900 € por plaza. Una línea son 225 plazas. Plazo: estimación.',
    enlaces: [{ texto: 'Comunidad de Madrid, 29/03/2023', url: NOTA_29_03_2023 }],
  },
  colegio_primaria: {
    texto: 'CEIP Isabel la Católica (Alcorcón): 5,8 M€ por 450 plazas, unos 12.900 € por plaza. ' +
      'Plazo: el CEIPSO de Adelfillas (Colmenar Viejo, 840 plazas) se presentó en noviembre de 2025 y las obras empiezan un año después; ' +
      'costaba 12,2 M€ al presentarlo y 13,3 M€ al autorizar la obra.',
    enlaces: [
      { texto: 'Comunidad de Madrid, 29/03/2023', url: NOTA_29_03_2023 },
      { texto: 'Comunidad de Madrid, 21/11/2025', url: 'https://www.comunidad.madrid/press-releases/download/105000' },
    ],
  },
  instituto: {
    texto: 'IES Los Molinos (Getafe): 880 plazas (20 aulas de ESO y 8 de Bachillerato); más de 13 M€ al anunciarlo y 14,6 M€ al autorizar la obra, ' +
      'entre 14.800 y 16.600 € por plaza, con 15 meses de obra. En septiembre de 2026 se iban a adjudicar las obras.',
    enlaces: [
      { texto: 'Comunidad de Madrid, 20/05/2026', url: 'https://www.comunidad.madrid/node/114439' },
      { texto: 'Comunidad de Madrid, 29/09/2026', url: 'https://www.comunidad.madrid/press-releases/download/119931' },
    ],
  },
  centro_salud: {
    texto: '16 centros de salud por 113,8 M€: 7,1 M€ cada uno, con obras de 12 a 24 meses. ' +
      'Atiende a 23.078 personas: la mediana de las 286 zonas básicas de salud de la Comunidad.',
    enlaces: [{
      texto: 'Comunidad de Madrid, 24/07/2024',
      url: 'https://www.comunidad.madrid/notas-prensa/2024/07/24/comunidad-madrid-aprueba-114-millones-iniciar-este-ano-construccion-16-nuevos-centros-salud-nueve-municipios',
    }],
  },
}

export const FUENTE_ANIO_INICIO = 'Supuesto: el primer año en que podrían empezar las obras de un plan aprobado ahora.'
