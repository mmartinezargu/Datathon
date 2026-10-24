import { createRoot } from 'react-dom/client'
import App from './App.tsx'

// Sin <StrictMode>: en desarrollo React monta cada componente dos veces para
// detectar fallos, y al borrar el primer mapa MapLibre se queda sin terminar
// de cargar el segundo (el mapa sale en blanco). En producción no pasa.
createRoot(document.getElementById('root')!).render(<App />)
