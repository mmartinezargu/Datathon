import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' para que la web funcione abierta desde cualquier carpeta o subdominio
export default defineConfig({
  plugins: [react()],
  base: './',
})
