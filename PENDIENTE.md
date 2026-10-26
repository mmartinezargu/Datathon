# Lo que falta para la final (jueves 29/10)

Regla: el **miércoles 28 no se programa**. Ese día solo se ensaya. Todo lo de abajo tiene que estar el **martes 27 por la noche**.

## Ya hecho
Publicada en **https://cabida.vercel.app** (se actualiza sola al fusionar en `main`). Cada pestaña tiene su enlace: `#mapa`, `#vivir`, `#como`; `#fiable` baja a «¿Acierta?», al final de «Cómo funciona».

Mapa de los 155 municipios con los 4 tipos, cuánta gente llega y cuánta cabe (vivienda, colegios, sanidad, ritmo), palancas y supuestos, ficha con la cuenta, listas y pestaña de validación (error del 44,4 %).

Añadido el 26/10 (PR «Hospital, reequilibrio, plazo y datasets entregables»):
- ✅ **Oportunidad condicionada**: oportunidad con el hospital general público más cercano a más de 25 km en línea recta (unos 30 min en coche [est.]). Sale rayada en el mapa, y la ficha dice el hospital más cercano.
- ✅ **Reubicar en pueblos cercanos**: interruptor en el escenario, con un deslizador para la distancia (10–50 km; por defecto 25). Lo que no cabe va al pueblo con sitio más cercano (y con el hospital cerca). Se ve en las cifras de cabecera, el vaso, un bloque con los 5 traslados más grandes, la ficha («Envía… a» o «Recibe… de»), el mapa (borde discontinuo en los pueblos con los que intercambia gente) y el CSV. Los colores del mapa no cambian.
- ✅ **Plazo** en «¿y si invertimos aquí?»: colegio, unos 2 años; centro de salud, unos 3 (estimación).
- ✅ **Datasets entregables**: `data/out/diccionario.csv`, `data/out/README.md` (fuentes, CC BY 4.0 y cómo regenerar) y `THIRD_PARTY.md`. Los datos de partida de menos de 25 MB están en `data/raw/` (solo se descarga el planeamiento).

## Pendiente

| # | Tarea | Qué es exactamente | Quién | Para |
|---|---|---|---|---|
| 1 | ✅ **Modo «¿y si invertimos aquí?»** | En la ficha: botones «+1 colegio» y «+1 centro de salud». Suma capacidad (las plazas de un colegio o lo que aguanta una zona de salud) y enseña el coste: ~9,5 M€ por colegio y ~8 M€ por centro de salud. El tipo del municipio cambia al momento. | | lun 26 |
| 2 | ✅ **Vista ciudadana** | Pestaña nueva «¿Dónde me mudo?». Perfil (familia, teletrabajo, mayor) + filtros (colegio, instituto, sitio libre) -> ranking de municipios con una frase de por qué salen, y comparador de 2–3. | | lun 26 |
| 3 | ✅ **Página de metodología** | Pestaña con las fórmulas en palabras sencillas, las fuentes con enlace y las limitaciones (el planeamiento no es licencia, «no principal» no es «vacía», etc.). | | lun 26 |
| 4 | ✅ **Descarga de datos** | Botón «Descargar CSV» con el escenario actual (155 filas) y enlace a `data/out/tabla_maestra.csv`. Licencia CC BY 4.0. | | lun 26 |
| 5 | ✅ **Publicarla en internet** | Subir `web/` a Vercel o Netlify para tener un enlace que el jurado abra sin instalar nada. Hacer también una copia que funcione sin internet por si falla la wifi. | | mar 27 |
| 6 | **Probarla entera** | Abrirla en portátil y móvil, mover todas las palancas y buscar errores: municipios con cifras raras, textos cortados, botones que no van. Apuntar todo en la PR. | todos | mar 27 |
| 7 | **Diapositivas (10 min)** | Problema -> demo en vivo -> validación -> impacto. Con las cifras nuevas (ver abajo). | | mar 27 |
| 8 | **Guion de la demo** | Qué se pulsa y en qué orden: mapa -> mover personas -> ficha de Arroyomolinos -> añadir colegio -> vista ciudadana -> validación. Quién habla en cada parte. | | mar 27 |

## Extras: solo si todo lo anterior está terminado
- ~~Asistente que escribe los filtros («somos 4 y trabajo en Getafe»)~~ **Hecho**: con IA de Groq, gratis (función de Vercel `web/api/asistente.ts`) y, si falla o no hay internet, con palabras clave en el navegador. Oracle no se pudo usar: en la región de la cuenta (Madrid) no hay modelos que funcionen. Ya funciona en la web publicada (`GROQ_API_KEY` puesta en Vercel).
- Tiempos en coche y transporte público a sanidad y educación (endpoint SPARQL de la Cátedra).
- Plazas escolares reales del endpoint en vez del límite de niños por colegio.

## Cifras para las diapositivas (escenario por defecto: 2035)
- 155 municipios, 997.059 vecinos; crecieron un 15,6 % en 2015-2025 (la Comunidad, un 10,9 %).
- Llegan **134.426** personas (el ritmo de la última década). Ojo: la maqueta usaba 170.000.
- Caben sin ampliar servicios **60.785**; **73.641** se quedan sin sitio.
- 67 municipios en tensión, 41 polos, 37 oportunidades y 10 en consolidación.
- De las 37 oportunidades, **24 están condicionadas**: tienen el hospital a más de 25 km en línea recta. Sin contar esas, el sitio libre es de 42.036 personas (44.259 en total).
- Con «Reubicar en pueblos cercanos» a 25 km, se reubican **38.010** personas en 48 municipios, de media a 10 km. Siguen sin sitio **35.631**. A 50 km se reubican 41.445 y quedan 32.197 sin sitio.
- 30 municipios no tienen sitio para nadie sin ampliar (19 por colegios y 11 por sanidad); solo 4 están a menos de un 5 % de su límite.
- Validación 2015 -> 2025: acierta dónde va **77 de cada 100 personas** (89 por zonas); la tendencia sola, 67. Es decir, coloca en otro municipio al 22,6 % (11,4 % en otra zona; la tendencia sola, 32,7 % y 20,3 %).
- El WAPE (44,4 %, frente al 64,1 % de la tendencia) cuenta dos veces a cada persona mal colocada: una donde sobra y otra donde falta. Se enseña igual en la web.
- Plan de inversión (`uv run plan_inversion.py`; colegio o centro de salud donde limitan, hasta que manda la vivienda o el ritmo; obras desde 2027 [supuesto]):
  - Sin reubicar: **34 colegios y 22 centros de salud** en 41 municipios, **499 M€**; lo último abre en 2030. Siguen sin sitio **17.706** (de 73.641), casi todos por vivienda.
  - Reubicando a 25 km: **6 colegios y 4 centros** en 7 municipios, **89 M€**; lo último abre en 2030. Siguen sin sitio **3.802** (de 35.631), todos por vivienda.

## Cómo arrancarla
Ver `README.md`. En corto: `cd web`, `npm install`, `npm run dev`.
