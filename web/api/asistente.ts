// Función de Vercel: pasa la frase del vecino a una IA y devuelve los filtros de «¿Dónde me mudo?»
// que entiende. La clave vive solo aquí, en el servidor. La web comprueba todo lo que llega;
// si esto falla o tarda, usa el asistente de palabras clave.
//
// Variables de entorno (en Vercel: Settings → Environment Variables). Se usa la primera que exista:
//   GROQ_API_KEY       clave de Groq (gratis, empieza por gsk_). Modelo: GROQ_MODELO (por defecto openai/gpt-oss-120b)
//   OCI_GENAI_API_KEY  clave de OCI Generative AI (empieza por sk-). Región: OCI_REGION (por defecto
//                      eu-frankfurt-1; en Madrid no hay modelos). Modelo: OCI_MODELO (por defecto meta.llama-3.3-70b-instruct)

const MAX_FRASE = 300
const MAX_ZONAS = 20

const INSTRUCCIONES = `Ayudas a decidir dónde vivir, o dónde llevar a la gente que llega, en los pueblos de la Comunidad de Madrid.
La frase puede ser de un vecino que busca casa o de un gestor público que reparte a quienes llegan ("llevadlos a…", "repartid en…").
Lee la frase y responde SOLO con un objeto JSON, sin texto alrededor, con estos campos:
- "perfil": "familia" (hay hijos, un bebé en camino o son 3 o más), "mayor" (jubilado o persona mayor), "teletrabajo" (trabaja desde casa) o null si no se sabe. Si es un gestor que nombra a un solo grupo ("atraed a las familias…", "¿dónde llevamos a los jubilados?"), ese grupo es el perfil.
- "instituto": true si tiene hijos en edad de instituto (12 a 18 años, ESO, bachillerato); si no, false.
- "hospital": true si pide tener un hospital, médico o urgencias cerca, o lo necesita por salud; si no, false.
- "tamano": "pueblo" (quiere algo pequeño, tranquilo, con campo o naturaleza), "mediano", "grande" (quiere ciudad o muchos servicios) o null. Solo si dice cómo quiere que sea el sitio donde va a vivir: trabajar en una ciudad grande no cuenta.
- "municipio": el nombre del municipio donde trabaja o cerca del que quiere vivir, tal como lo escribe, o null.
- "mezcla": si la frase dice qué parte de los que llegan es de cada grupo ("30 % familias", "la mitad jubilados", "un tercio teletrabaja"), el porcentaje de cada grupo: {"familia": 30, "mayor": null, "teletrabajo": null}; null en los grupos que no diga.
- "zona": una de estas zonas, solo si la nombra o la describe claramente; no la deduzcas del municipio; si no, null: {ZONAS}.
No te inventes nada: si la frase no lo dice, pon null o false.`

interface Peticion {
  frase: string
  zonas: string[]
}

function leerPeticion(datos: unknown): Peticion | null {
  if (typeof datos !== 'object' || datos === null) return null
  const { frase, zonas } = datos as Record<string, unknown>
  if (typeof frase !== 'string' || !frase.trim() || frase.length > MAX_FRASE) return null
  if (!Array.isArray(zonas) || zonas.length > MAX_ZONAS || !zonas.every((z) => typeof z === 'string' && z.length < 60)) return null
  return { frase: frase.trim(), zonas }
}

/** El primer objeto JSON del texto (algunos modelos lo envuelven en ```json … ```). */
function sacarJson(texto: string): unknown {
  const desde = texto.indexOf('{')
  const hasta = texto.lastIndexOf('}')
  if (desde < 0 || hasta < desde) return null
  try {
    return JSON.parse(texto.slice(desde, hasta + 1))
  } catch {
    return null
  }
}

function respuesta(datos: unknown, estado = 200): Response {
  return Response.json(datos, { status: estado, headers: { 'Cache-Control': 'no-store' } })
}

interface Proveedor {
  url: string
  clave: string
  modelos: string[] // si uno está saturado (429), se prueba el siguiente: cada modelo tiene su propio límite
  extra: Record<string, unknown> // opciones propias de cada proveedor
}

function proveedor(zonas: string[]): Proveedor | null {
  const env = process.env
  if (env.GROQ_API_KEY) {
    return {
      url: 'https://api.groq.com/openai/v1/chat/completions',
      clave: env.GROQ_API_KEY,
      modelos: [...new Set([env.GROQ_MODELO || 'openai/gpt-oss-120b', 'openai/gpt-oss-20b'])],
      // Groq garantiza que la respuesta sigue este esquema
      extra: { reasoning_effort: 'low', max_tokens: 1000, response_format: { type: 'json_schema', json_schema: { name: 'filtros', strict: true, schema: esquema(zonas) } } },
    }
  }
  if (env.OCI_GENAI_API_KEY) {
    return {
      url: `https://inference.generativeai.${(env.OCI_REGION || 'eu-frankfurt-1').toLowerCase()}.oci.oraclecloud.com/20231130/actions/v1/chat/completions`,
      clave: env.OCI_GENAI_API_KEY,
      modelos: [env.OCI_MODELO || 'meta.llama-3.3-70b-instruct'],
      extra: { max_tokens: 200 },
    }
  }
  return null
}

/** Forma exacta de la respuesta: los mismos campos que pide INSTRUCCIONES. */
function esquema(zonas: string[]) {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['perfil', 'instituto', 'hospital', 'mezcla', 'tamano', 'municipio', 'zona'],
    properties: {
      perfil: { type: ['string', 'null'], enum: ['familia', 'mayor', 'teletrabajo', null] },
      instituto: { type: 'boolean' },
      hospital: { type: 'boolean' },
      mezcla: {
        type: 'object',
        additionalProperties: false,
        required: ['familia', 'mayor', 'teletrabajo'],
        properties: { familia: { type: ['number', 'null'] }, mayor: { type: ['number', 'null'] }, teletrabajo: { type: ['number', 'null'] } },
      },
      tamano: { type: ['string', 'null'], enum: ['pueblo', 'mediano', 'grande', null] },
      municipio: { type: ['string', 'null'] },
      zona: { type: ['string', 'null'], enum: [...zonas, null] },
    },
  }
}

export async function POST(req: Request): Promise<Response> {
  const peticion = leerPeticion(await req.json().catch(() => null))
  if (!peticion) return respuesta({ error: 'Petición no válida' }, 400)
  const ia = proveedor(peticion.zonas)
  if (!ia) return respuesta({ error: 'Falta la clave de la IA (GROQ_API_KEY u OCI_GENAI_API_KEY)' }, 503)

  const mensajes = [
    { role: 'system', content: INSTRUCCIONES.replace('{ZONAS}', peticion.zonas.map((z) => `"${z}"`).join(', ')) },
    { role: 'user', content: peticion.frase },
  ]
  let r: Response | null = null
  for (const modelo of ia.modelos) {
    r = await fetch(ia.url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ia.clave}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: modelo, temperature: 0, messages: mensajes, ...ia.extra }),
      signal: AbortSignal.timeout(3500),
    }).catch(() => null)
    if (r?.status !== 429) break
  }

  if (!r?.ok) return respuesta({ error: `La IA no responde (${r?.status ?? 'sin conexión'})` }, 502)
  const datos = await r.json().catch(() => null) as { choices?: { message?: { content?: string } }[] } | null
  const lectura = sacarJson(datos?.choices?.[0]?.message?.content ?? '')
  if (!lectura) return respuesta({ error: 'La IA no ha devuelto JSON' }, 502)
  return respuesta(lectura)
}
