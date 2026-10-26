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
| 8 | **Guion de la demo** | Qué se pulsa y en qué orden: mapa -> mover personas -> ficha de Arroyomolinos -> «Planificar aquí» -> «Plan óptimo» -> «Ver en el mapa» -> vista ciudadana -> validación. Quién habla en cada parte. | | mar 27 |

## Extras: solo si todo lo anterior está terminado
- ~~Asistente que escribe los filtros («somos 4 y trabajo en Getafe»)~~ **Hecho**: con IA de Groq, gratis (función de Vercel `web/api/asistente.ts`) y, si falla o no hay internet, con palabras clave en el navegador. Oracle no se pudo usar: en la región de la cuenta (Madrid) no hay modelos que funcionen. Ya funciona en la web publicada (`GROQ_API_KEY` puesta en Vercel).
- Tiempos en coche y transporte público a sanidad y educación (endpoint SPARQL de la Cátedra).
- Plazas escolares reales del endpoint en vez del límite de niños por colegio.

## Cifras para las diapositivas (escenario por defecto: 2035)
- 155 municipios, 997.059 vecinos; crecieron un 15,6 % en 2015-2025 (la Comunidad, un 10,9 %).
- Llegan **134.426** personas (el ritmo de la última década). Ojo: la maqueta usaba 170.000.
- Datos de partida (26/10, rama `mejora/datos-exactos`): viviendas **vacías** reales del INE (consumo eléctrico; en los 44 pueblos sin dato, estimadas con su zona) y **alumnos matriculados** de ALMUDENA para las plazas libres (las plazas se pasan a personas con los niños que viven en cada municipio). El suelo residencial pendiente sin cifra de viviendas se estima con la densidad de los ámbitos que sí la traen: **52.652 viviendas** más en 49 municipios. Ningún pueblo con el hospital a más de 25 km recibe gente al reubicar.
- Caben sin ampliar servicios **56.796**; **77.630** se quedan sin sitio.
- 78 municipios en tensión, 37 polos, 33 oportunidades y 7 en consolidación. Limita la vivienda en 77, colegios en 38, sanidad en 21 y el ritmo en 19.
- «Vivienda vacía que se ocupa» (15 %) es un supuesto sin dato oficial: al 30 % caben 60.286 (71 en tensión); al 50 %, 63.277 (66 en tensión). Tabla completa en `AUDITORIA.md`. **Decidir el valor por defecto.**
- De las 33 oportunidades, **17 están condicionadas**: tienen el hospital a más de 25 km en línea recta. Sitio libre en las oportunidades (caben − llegan): 20.300 personas; sin las condicionadas, 19.172.
- Con «Reubicar en pueblos cercanos» a 25 km, se reubican **26.856** personas en 37 municipios, de media a 9 km. Siguen sin sitio **50.774**. A 50 km sale lo mismo: a 25 km ya se llenan todos los pueblos con sitio y el hospital cerca.
- 31 municipios no tienen sitio para nadie sin ampliar (18 por colegios y 13 por sanidad); solo 4 están a menos de un 5 % de su límite.
- Validación 2015 -> 2025: acierta dónde va **77 de cada 100 personas** (89 por zonas); la tendencia sola, 67. Es decir, coloca en otro municipio al 22,6 % (11,4 % en otra zona; la tendencia sola, 32,7 % y 20,3 %).
- El WAPE (44,4 %, frente al 64,1 % de la tendencia) cuenta dos veces a cada persona mal colocada: una donde sobra y otra donde falta. Se enseña igual en la web.
- **Pestaña «Plan»** (`#plan`, 26/10, rama `funcionalidad/plan`): lista de obras editable con 3 maneras de rellenarla (plan óptimo, con presupuesto, a mano). El motor TS es la única fuente (`planOptimo` y `evaluarPlan` en `web/src/motor.ts`, con tests); `etl/plan_inversion.py` se ha borrado. Valores por defecto con su fuente: ampliar colegio 225 plazas a 6.000 €/plaza (2 años), colegio nuevo 450 a 12.900 € (3 años), instituto 880 a 16.600 € (3 años), centro de salud 7,1 M€ que atiende a 23.078 personas (mediana de las 286 zonas; 3 años); obras desde 2027 [supuesto].
  - Plan óptimo reubicando a 25 km: **10 ampliaciones de colegio, 3 institutos y 10 centros de salud** en 20 municipios, **128,3 M€**; lo último abre en 2030. Pasan a caber **38.592**; siguen sin sitio **12.181** (de 50.774): 12.159 por vivienda. Se reubican 35.294 personas, a 8,6 km de media.
  - Cada pueblo con lo suyo (sin reubicar): **26 ampliaciones, 13 institutos y 22 centros** en 49 municipios, **381,2 M€**; lo último abre en 2030. Siguen sin sitio **23.897** (de 77.630), casi todos por vivienda.
- Antes (con `plan_inversion.py`, ya borrado; colegio a 9,5 M€ y centro a 8 M€):
  - Sin reubicar: **39 colegios y 22 centros de salud** en 49 municipios, **546 M€**; lo último abre en 2030. Siguen sin sitio **23.897** (de 77.630), casi todos por vivienda.
  - Reubicando a 25 km: **14 colegios y 10 centros** en 20 municipios, **213 M€**; lo último abre en 2030. Siguen sin sitio **11.709** (de 50.774), casi todos por vivienda.
- Población de las zonas de salud frente al Censo 2021 (IECM): se aparta un 2,6 % de media en las 286 zonas (1,9 % en las 45 de los pueblos del reto); correlación 0,997.

## Cómo arrancarla
Ver `README.md`. En corto: `cd web`, `npm install`, `npm run dev`.
