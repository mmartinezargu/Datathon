import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// Solo con npm run dev: sirve /api/asistente con la misma función que usa Vercel,
// leyendo la clave de .env.local. Así se prueba el asistente con IA sin instalar vercel.
function asistenteLocal(): Plugin {
  return {
    name: 'asistente-local',
    apply: 'serve',
    configureServer(server) {
      Object.assign(process.env, loadEnv('development', process.cwd(), ''))
      server.middlewares.use('/api/asistente', async (req, res) => {
        const trozos: Buffer[] = []
        for await (const t of req) trozos.push(t as Buffer)
        const { POST } = await server.ssrLoadModule('/api/asistente.ts')
        const r: Response = await POST(new Request('http://localhost/api/asistente', { method: 'POST', body: Buffer.concat(trozos) }))
        res.statusCode = r.status
        res.setHeader('Content-Type', 'application/json')
        res.end(await r.text())
      })
    },
  }
}

// base './' para que la web funcione abierta desde cualquier carpeta o subdominio
export default defineConfig({
  plugins: [react(), asistenteLocal()],
  base: './',
})
