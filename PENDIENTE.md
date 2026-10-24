# Lo que falta para la final (jueves 29/10)

Regla: el **miércoles 28 no se programa**. Ese día solo se ensaya. Todo lo de abajo tiene que estar el **martes 27 por la noche**.

## Ya hecho
Mapa de los 155 municipios con los 4 tipos, cuánta gente llega y cuánta cabe (vivienda, colegios, sanidad, ritmo), palancas y supuestos, ficha con la cuenta, listas y pestaña de validación (error del 44,4 %).

## Pendiente

| # | Tarea | Qué es exactamente | Quién | Para |
|---|---|---|---|---|
| 1 | **Modo «¿y si invertimos aquí?»** | En la ficha: botones «+1 colegio» y «+1 centro de salud». Suma capacidad (el umbral de un colegio o de una zona de salud) y enseña el coste: ~9,5 M€ por colegio y ~8 M€ por centro de salud. El tipo del municipio cambia al momento. | | lun 26 |
| 2 | **Vista ciudadana** | Pestaña nueva «¿Dónde me mudo?». Perfil (familia, teletrabajo, mayor) + filtros (colegio, instituto, sitio libre) -> ranking de municipios con una frase de por qué salen, y comparador de 2–3. | | lun 26 |
| 3 | **Página de metodología** | Pestaña con las fórmulas en palabras sencillas, las fuentes con enlace y las limitaciones (el planeamiento no es licencia, «no principal» no es «vacía», etc.). | | lun 26 |
| 4 | **Descarga de datos** | Botón «Descargar CSV» con el escenario actual (155 filas) y enlace a `data/out/tabla_maestra.csv`. Licencia CC BY 4.0. | | lun 26 |
| 5 | **Publicarla en internet** | Subir `web/` a Vercel o Netlify para tener un enlace que el jurado abra sin instalar nada. Hacer también una copia que funcione sin internet por si falla la wifi. | | mar 27 |
| 6 | **Probarla entera** | Abrirla en portátil y móvil, mover todas las palancas y buscar errores: municipios con cifras raras, textos cortados, botones que no van. Apuntar todo en la PR. | todos | mar 27 |
| 7 | **Diapositivas (10 min)** | Problema -> demo en vivo -> validación -> impacto. Con las cifras nuevas (ver abajo). | | mar 27 |
| 8 | **Guion de la demo** | Qué se pulsa y en qué orden: mapa -> mover personas -> ficha de Arroyomolinos -> añadir colegio -> vista ciudadana -> validación. Quién habla en cada parte. | | mar 27 |

## Extras: solo si todo lo anterior está terminado
- Asistente que escribe los filtros («somos 4 y trabajo en Getafe») con los créditos de Oracle.
- Tiempos en coche y transporte público a sanidad y educación (endpoint SPARQL de la Cátedra).
- Plazas escolares reales del endpoint en vez del umbral de habitantes por colegio.

## Cifras para las diapositivas (escenario por defecto: 2035)
- 155 municipios, 997.059 vecinos; crecieron un 15,6 % en 2015-2025 (la Comunidad, un 10,9 %).
- Llegan **134.426** personas (el ritmo de la última década). Ojo: la maqueta usaba 170.000.
- Con los servicios de hoy caben **53.239**; **81.187** se quedan sin sitio.
- 73 municipios en tensión, 38 polos, 38 oportunidades y 6 en consolidación.
- Validación 2015 -> 2025: error del **44,4 %**, frente al 64 % de seguir la tendencia sin más.

## Cómo arrancarla
Ver `README.md`. En corto: `cd web`, `npm install`, `npm run dev`.
