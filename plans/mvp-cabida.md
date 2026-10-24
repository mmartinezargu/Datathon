# Plan: MVP de CABIDA para la final del 29/10

**Qué:** construir en este repo la app de CABIDA que se enseña el día 29: mapa de los 155 municipios en 4 colores, simulador con palancas, ficha de cada municipio, vista ciudadana, validación 2015 → 2025 y descarga de datos.

**Por qué así:**
- Quedan 5 días y el 28 es para ensayar. Solo entra lo que se vea en la demo.
- La maqueta de Víctor no está en el repo. Construimos sobre datos abiertos reales para no depender de ella; si llega, se aprovecha lo que encaje.
- Dos piezas separadas: **Python** (`etl/`) prepara los datos y la validación; una **web estática en React + TypeScript** (`web/`) los enseña y hace los cálculos de las palancas en el navegador. Sin servidor, así que el día de la final no se cae.
- La validación contra el pasado es la baza de la propuesta: va en el núcleo, no como extra.

**Fuera hasta que el núcleo funcione:** asistente con IA (Oracle), Monte Carlo, perfil de quien llega, transporte y estacionalidad.
