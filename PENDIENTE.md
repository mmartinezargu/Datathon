# Lo que falta para la final (jueves 29/10)

Regla: el **miércoles 28 no se programa**. Ese día solo se ensaya. Todo lo de abajo tiene que estar el **martes 27 por la noche**.

## Decisiones para el martes 27 (antes de las 14:00)

| # | Decisión | Opciones | Recomendación | Quién decide | Estado |
|---|---|---|---|---|---|
| 1 | Cifras de coste de «Plan» para las diapositivas | Las de la web: **81,3 M€** reubicando a 25 km y **281,8 M€** sin reubicar. O las de la presentación antigua: 213 M€ y 546 M€, del script `plan_inversion.py` (ya borrado; no se pueden recalcular) | Apuntar solo las que salgan en pantalla (las de la web). Ahora mismo no hay cifras de «Plan» en minutos escritas: si se usan, sacarlas de la web | Quien hizo la pestaña «Plan» | Pendiente |
| 2 | Medida por defecto de la web y de la demo | Minutos en coche (sin tráfico, OSRM) o km en línea recta. Tiene que ser la misma en las diapositivas | Minutos | El equipo | Pendiente |
| 3 | Hospitales fuera de la Comunidad de Madrid | Incluirlos o no. Solo cambia de lado Ribatejada (37 min al de la CM, 29 al de Guadalajara), que está en tensión | No incluirlos y decirlo en las limitaciones (en «Cómo funciona» ya pone: «Solo se cuentan hospitales de la Comunidad de Madrid») | El equipo | Pendiente |
| 4 | Licencia de las columnas de minutos (OpenStreetMap, ODbL) frente a CC BY 4.0 | Publicar `data/out` en CC BY 4.0 indicando que `hospital_min`, `hospital_min_municipio` y `vecinos_min` vienen de OpenStreetMap con ODbL (ya está indicado en `data/out/README.md` y en el diccionario), u otra opción | Si hay duda, preguntar a la organización | El equipo | Pendiente |
| 5 | Revisión de la PR #12 y prueba en móvil | Una segunda persona revisa la PR y prueba en el móvil el interruptor «Medir en» y los deslizadores en «Plan», «Atraer» y «Dónde vivir» | Hacerlo con la vista previa de Vercel antes de fusionar | Una segunda persona (no quien hizo la PR) | Pendiente |

## Orden de mañana

1. Revisar la PR #12.
2. Probar la vista previa de Vercel (portátil y móvil).
3. Tomar las decisiones 1 a 4.
4. Actualizar este archivo con las cifras definitivas de la web.
5. Fusionar la PR #12 antes de las 14:00.
6. A partir de entonces, diapositivas y guion de la demo (tareas 7 y 8, que siguen sin responsable).

## Ya hecho
Publicada en **https://cabida.vercel.app** (se actualiza sola al fusionar en `main`). Cada pestaña tiene su enlace: `#mapa`, `#vivir`, `#como`; `#fiable` baja a «¿Acierta?», al final de «Cómo funciona».

Mapa de los 155 municipios con los 4 tipos, cuánta gente llega y cuánta cabe (vivienda, colegios, sanidad, ritmo), palancas y supuestos, ficha con la cuenta, listas y pestaña de validación (error del 44,4 %).

Añadido el 26/10 (PR «Hospital, reequilibrio, plazo y datasets entregables»):
- ✅ **Oportunidad condicionada**: oportunidad con el hospital general público más cercano a más de 25 km en línea recta (unos 30 min en coche [est.]). Sale rayada en el mapa, y la ficha dice el hospital más cercano.
- ✅ **Reubicar en pueblos cercanos**: interruptor en el escenario, con un deslizador para la distancia (10–50 km; por defecto 25). Lo que no cabe va al pueblo con sitio más cercano (y con el hospital cerca). Se ve en las cifras de cabecera, el vaso, un bloque con los 5 traslados más grandes, la ficha («Envía… a» o «Recibe… de»), el mapa (borde discontinuo en los pueblos con los que intercambia gente) y el CSV. Los colores del mapa no cambian.
- ✅ **Plazo** en «¿y si invertimos aquí?»: colegio, unos 2 años; centro de salud, unos 3 (estimación).
- ✅ **Minutos en coche** (rama `feature/tiempos-en-minutos`): interruptor «Medir en: Minutos en coche / Km en línea recta» en el escenario; la web abre en minutos. Minutos sin tráfico con OSRM sobre OpenStreetMap (`etl/tiempos.py`), calculados una vez: la web no llama a OSRM. Con minutos, el hospital queda lejos a más de 30 min (el que queda antes en coche, que en 37 de los 155 no es el de la línea recta) y la reubicación usa un deslizador de 10–45 min (por defecto 30). Con km todo sale igual que antes.
- **Decidir**: hospitales de fuera de la Comunidad. Comprobado con OSRM (sin meterlo en los datos): en 6 pueblos del reto queda antes uno de fuera (Guadalajara: Valdeavero, Ribatejada y Pezuela de las Torres; Ávila: San Martín de Valdeiglesias y Rozas de Puerto Real; Aranda de Duero: Somosierra). Solo cambiaría de lado Ribatejada (37 min al de la CM, 29 al de Guadalajara), que está en tensión: no cambiaría ninguna condicionada ni la reubicación.
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
- Tiempos en transporte público a sanidad y educación (los de coche ya están, con OSRM). El endpoint SPARQL de la Cátedra no se ha usado: si sale en las preguntas, es un siguiente paso, no una fuente.
- Plazas escolares reales del endpoint en vez del límite de niños por colegio.

## Cifras para las diapositivas (escenario por defecto: 2035)
- 155 municipios, 997.059 vecinos; crecieron un 15,6 % en 2015-2025 (la Comunidad, un 10,9 %).
- Llegan **134.426** personas (el ritmo de la última década). Ojo: la maqueta usaba 170.000.
- Datos de partida (26/10, rama `mejora/datos-exactos`): viviendas **vacías** reales del INE (consumo eléctrico; en los 44 pueblos sin dato, estimadas con su zona) y **alumnos matriculados** de ALMUDENA para las plazas libres (las plazas se pasan a personas con los niños que viven en cada municipio). El suelo residencial pendiente sin cifra de viviendas se estima con la densidad de los ámbitos que sí la traen: **52.652 viviendas** más en 49 municipios. Ningún pueblo con el hospital a más de 25 km recibe gente al reubicar.
- Caben sin ampliar servicios **56.796**; **77.630** se quedan sin sitio.
- 78 municipios en tensión, 37 polos, 33 oportunidades y 7 en consolidación. Limita la vivienda en 77, colegios en 38, sanidad en 21 y el ritmo en 19.
- «Vivienda vacía que se ocupa» (15 %) es un supuesto sin dato oficial: al 30 % caben 60.286 (71 en tensión); al 50 %, 63.277 (66 en tensión). Tabla completa en `AUDITORIA.md`. **Decidir el valor por defecto.**
- De las 33 oportunidades, **17 están condicionadas**: tienen el hospital a más de 25 km en línea recta. Sitio libre en las oportunidades (caben − llegan): 20.300 personas; sin las condicionadas, 19.172.
  - **En minutos (lo que abre la web): 18 condicionadas**, con el hospital a más de 30 min en coche, sin tráfico: las 17 de antes y Villar del Olmo (18,8 km, pero 36 min). Sin las condicionadas, 19.055 de sitio libre. Las cuentas de caben, sin sitio y tipos no cambian con la medida.
- Con «Reubicar en pueblos cercanos» a 25 km, se reubican **26.856** personas en 37 municipios, de media a 9 km. Siguen sin sitio **50.774**. A 50 km sale lo mismo: a 25 km ya se llenan todos los pueblos con sitio y el hospital cerca.
  - **En minutos, a 30 min en coche: se reubican 26.346** en 30 municipios, de media a 15 min (10 km en línea recta). Siguen sin sitio **51.284**. A 45 min, 26.524 (siguen sin sitio 51.106); a 20 min, 18.571; a 10 min, 7.304.
- Minutos frente a km (`uv run tiempos.py`): correlación 0,92 al hospital y 0,82 entre pueblos; mediana 26 min al hospital (18,2 km). 57 pueblos tienen el hospital a más de 25 km y 63 a más de 30 min; 11 están lejos solo en minutos (sobre todo el sureste: Valverde de Alcalá, Corpa, Olmeda de las Fuentes…) y 5 solo en km (Venturada, Cabanillas de la Sierra…). Ningún pueblo con el hospital lejos (en la medida elegida) recibe gente al reubicar.
- 31 municipios no tienen sitio para nadie sin ampliar (18 por colegios y 13 por sanidad); solo 4 están a menos de un 5 % de su límite.
- Validación 2015 -> 2025: acierta dónde va **77 de cada 100 personas** (89 por zonas); la tendencia sola, 67. Es decir, coloca en otro municipio al 22,6 % (11,4 % en otra zona; la tendencia sola, 32,7 % y 20,3 %).
- El WAPE (44,4 %, frente al 64,1 % de la tendencia) cuenta dos veces a cada persona mal colocada: una donde sobra y otra donde falta. Se enseña igual en la web.
- **Pestaña «Plan»** (`#plan`, 26/10, rama `funcionalidad/plan`): lista de obras editable con 3 maneras de rellenarla (plan óptimo, con presupuesto, a mano). El motor TS es la única fuente (`planOptimo` y `evaluarPlan` en `web/src/motor.ts`, con tests). Valores por defecto con su fuente: ampliar colegio 225 plazas a 6.000 €/plaza (2 años), colegio nuevo 450 a 12.900 € (3 años), instituto 880 a 16.600 € (3 años), centro de salud 7,1 M€ que atiende a 23.078 personas (mediana de las 286 zonas; 3 años); obras desde 2027 [supuesto].
  - Un centro de salud sirve a **toda su zona básica** (capacidad de la zona = límite + centros × 23.078; cada municipio se lleva su parte por población). Lo que gana una obra se mide en los 155 (con la reubicación), no solo en su pueblo.
  - Plan óptimo reubicando a 25 km: **7 ampliaciones de colegio, 2 institutos y 6 centros de salud** (uno por zona) en 15 municipios, **81,3 M€**; lo último abre en 2030. Pasan a caber **41.455**, a 1.960 € por persona; siguen sin sitio **9.319** (de 50.774), todos por vivienda.
  - Cada pueblo con lo suyo (sin reubicar): **26 ampliaciones, 13 institutos y 8 centros** en 42 municipios, **281,8 M€**; lo último abre en 2030. Pasan a caber 53.755 (5.242 € por persona); siguen sin sitio **23.874** (de 77.630), casi todos por vivienda.
  - Con el plan cargado, el mapa colorea por lo que falta después de reubicar y con las obras: 15 en tensión, 71 polos, 41 oportunidades y 28 en consolidación (sin plan, 78 / 37 / 33 / 7).
- Antes de la pestaña «Plan» (colegio a 9,5 M€ y centro a 8 M€; ya no se pueden recalcular):
  - Sin reubicar: **39 colegios y 22 centros de salud** en 49 municipios, **546 M€**; lo último abre en 2030. Siguen sin sitio **23.897** (de 77.630), casi todos por vivienda.
  - Reubicando a 25 km: **14 colegios y 10 centros** en 20 municipios, **213 M€**; lo último abre en 2030. Siguen sin sitio **11.709** (de 50.774), casi todos por vivienda.
  - Ojo: la pestaña «Plan» con km no da estas cifras (da 281,8 M€ y 81,3 M€, las de arriba), porque usa otros costes y otro método. **Sin cifras de plan en minutos** hasta decidir con cuáles se queda la presentación.
- Población de las zonas de salud frente al Censo 2021 (IECM): se aparta un 2,6 % de media en las 286 zonas (1,9 % en las 45 de los pueblos del reto); correlación 0,997.

## Cómo arrancarla
Ver `README.md`. En corto: `cd web`, `npm install`, `npm run dev`.
