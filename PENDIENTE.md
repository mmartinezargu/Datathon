# Lo que falta para la final (jueves 29/10)

Regla: **congelación hoy, miércoles 28, a las 18:00**. Lo que no esté fusionado en `main` a esa hora no entra. Después, solo ensayos y textos de diapositivas. La final es el jueves 29 a las 10:00 (llegada 9:15).

## Decisiones del martes 27 (tomadas)

| # | Decisión | Qué se decidió | Estado |
|---|---|---|---|
| 1 | Cifras de coste de «Plan» para las diapositivas | Las de la web (ver «Cifras para las diapositivas»). En minutos, que es lo que abre la web: **97,1 M€** reubicando a 30 min y **261,0 M€** sin reubicar. En km: 79,4 M€ y 261,0 M€ (costes = mediana de obras reales de la Comunidad, 28/10; antes 103,0 / 281,8 y 81,3 / 281,8). Las de la presentación antigua (213 y 546 M€) no se usan | ✅ Decidido |
| 2 | Medida por defecto de la web y de la demo | **Minutos en coche** (sin tráfico, OSRM). Se mantiene también «Km en línea recta» con el interruptor «Medir en»; la web queda como está | ✅ Decidido |
| 3 | Hospitales fuera de la Comunidad de Madrid | **No se incluyen**. Queda dicho en «Cómo funciona» (limitaciones) y en `data/out/README.md`, con los 6 pueblos afectados. Solo cambiaría de lado Ribatejada | ✅ Decidido |
| 4 | Licencia de las columnas de minutos (OpenStreetMap, ODbL) frente a CC BY 4.0 | `data/out` sigue en CC BY 4.0, salvo `hospital_min`, `hospital_min_municipio` y `vecinos_min`, que son ODbL 1.0 y piden citar a OpenStreetMap. Escrito en `data/out/README.md`, `THIRD_PARTY.md`, el diccionario y junto a la descarga de la web | ✅ Hecho |
| 5 | Revisión de la PR #12 y prueba en móvil | PR #12 revisada y fusionada. La prueba en móvil entra en la tarea 6 | ✅ Revisada |

## Decisiones del miércoles 28 (tomadas)

| # | Decisión | Qué se decidió |
|---|---|---|
| 6 | Licencia de los minutos | Se quedan los de OSRM sobre OpenStreetMap, con la excepción ODbL ya escrita. No se rehacen con otra fuente: las bases solo limitan lo que digan las licencias de los datasets usados, y cambiarlos hoy movería las cifras del plan, la reubicación y las condicionadas |
| 7 | Transporte público (GTFS del CRTM) | Fuera hasta después de la final. Si sale en preguntas: «siguiente paso» |
| 8 | Oracle | No se usa. Respuesta preparada en R8 |
| 9 | «Vivienda vacía que se ocupa» | Se queda en **15 %** |
| 10 | «Plan óptimo» | Pasa a **«Plan recomendado»** (R1) |
| 11 | «Atraer» | Se queda al final de «Plan» (#24). Se arregla lo de mayores y colegios (R3) |

## Remates del 28/10 (antes de las 18:00)

Salen de revisar la web publicada (`main` 5aeb014, 11:45). Una rama y una PR por tarea; que otra persona la mire antes de fusionar. Por orden de prioridad: si algo no da tiempo, se queda fuera.

**Cifras de control.** Con el escenario por defecto (2035, minutos, exigencia media) NO deben cambiar: caben **56.796**, sin sitio **77.630**; reubicando a 30 min, **26.346** reubicadas y **51.284** sin sitio. Si alguna cambia, parar y avisar.

| # | Tarea | Quién | Hecho |
|---|---|---|---|
| R1 | Plan: «Plan recomendado», poda y «pasan a caber» sin ceros | | ✅ 28/10 (rama `mejora/plan-recomendado`) |
| R2 | Textos de «Supuestos del cálculo», de la ficha y del deslizador de personas | | |
| R3 | «Atraer»: mayores y teletrabajo no ocupan plazas de colegio | | |
| R4 | «Dónde vivir»: hospital cerca por defecto para familias y frase con lo más justo | | |
| R5 | Datasets nuevos en `data/out` | | |
| R6 | Diapositivas y guion con las cifras finales (después de R1) | | |
| R7 | Prueba completa en portátil y móvil, y copia offline en 2 portátiles y un USB, probada sin red | | |
| R8 | Guion: respuesta sobre Oracle y reparto de voces | | |

### R1. Plan: de «Plan óptimo» a «Plan recomendado»
- Hoy el plan incluye el **instituto de Colmenarejo: 11,1 M€ y «pasan a caber» 0**. También el centro de salud de Torrelodones (6,7 M€ para 183 personas, 36.538 € por persona). Es lo primero que vería el jurado.
- Causa: «pasan a caber» se calcula en el orden de la tabla (colegios antes que centros), no en el orden en que se eligieron. O la obra sobra, o solo rinde junto a otra que se cuenta después.
- Renombrar «Plan óptimo» a «Plan recomendado» en la web, `Metodologia.tsx`, este archivo, `README.md` y el diccionario. La función interna puede seguir llamándose `planOptimo`.
- **Poda** después del voraz: probar a quitar cada obra, de la más cara a la más barata; si la gente sin sitio no sube, se quita. Repetir hasta que no salga ninguna. Tiene que tardar menos de 1 s en el navegador.
- «Pasan a caber» de cada fila = cuánta gente se queda sin sitio de más **si se quita solo esa obra**, con las demás puestas. Cambiar la nota bajo la tabla y avisar de que la suma de las filas no tiene por qué dar el total.
- Comprobación fuera de la web (test o script): en el escenario por defecto, en minutos y en km, cambiar cada obra por cualquier otra posible (otro tipo u otro municipio). Quedarse con los cambios que bajan el coste sin subir la gente sin sitio, hasta que no quede ninguno. Si encuentra mejoras y tarda menos de 1 s, meterlo en la web; si no, solo apuntar aquí lo que encuentra.
- «Cómo funciona», en 2 frases: añade la obra con más personas por euro y luego quita las que sobran; se llama «recomendado» porque no se prueban todas las combinaciones. Si la comprobación no encuentra nada: «Comprobado en el escenario por defecto: quitar o cambiar una obra no lo abarata».
- Tests: ninguna obra del plan con «pasan a caber» 0; la poda nunca sube la gente sin sitio.
- Al acabar, apuntar aquí las cifras nuevas del plan (coste, obras, pasan a caber, sin sitio), en minutos y en km. Hoy: 97,1 M€ y 17 obras en minutos; 79,4 M€ en km.
- **Hecho (28/10).** «Plan recomendado» en la web y en «Cómo funciona»; poda después del voraz (`podarPlan`); «pasan a caber» = lo que sube la gente sin sitio al quitar solo esa obra, con nota bajo la tabla; tests (ninguna obra con 0 en minutos y en km, también con presupuesto; la poda).
  - **Las cifras no cambian**: la poda no quita ninguna obra del plan por defecto. Minutos: 17 obras (7 ampliaciones, 3 institutos, 7 centros) en 17 municipios, **97,1 M€**, pasan a caber **42.663**, siguen sin sitio **8.621**. Km: 15 obras, **79,4 M€**, 41.455 y 9.319. Sin reubicar: 47 obras, 261,0 M€, sin sitio 23.874.
  - **Colmenarejo**: el instituto pasa de 0 a **1.050** personas (antes se contaba antes de los centros de salud de los que depende). La obra que menos rinde ahora es el centro de Torrelodones: 183 personas (36.538 € por persona); se queda porque sin él 183 más se quedan sin sitio.
  - **Comprobación de cambios de obra (script, no está en la web: tarda 8 s).** Cambiar una obra por otra más barata, de otro tipo o municipio, SÍ abarata el plan. En minutos, 6 cambios: de 97,1 a **67,1 M€** y de 8.621 a **4.986** sin sitio (p. ej. el instituto de Colmenarejo por ampliar el colegio de El Álamo: −8,6 M€ y 251 menos sin sitio; los centros de San Agustín del Guadalix y Torrelodones por ampliar colegios en Arroyomolinos y Becerril). En km, 4 cambios: de 79,4 a **58,0 M€** y de 9.319 a **6.673**. Por eso en «Cómo funciona» NO se dice «comprobado: no se abarata».
  - **Por qué**: el voraz solo propone obras donde falta sitio. Reubicando, ampliar un colegio en un municipio cercano con casas y hospital cerca (El Álamo, El Escorial, Becerril) hace caber a los que llegan de los vecinos. Probado dejar que el voraz mire también esos municipios: en minutos sale **22 obras, 122,2 M€, sin sitio 1.322** (49.962 pasan a caber); en km, 23 obras, 112,0 M€, sin sitio 761. **No está metido**: cambia todas las cifras del plan de las diapositivas y del guion. Decidir antes de las 18:00; si no, respuesta para preguntas: «el plan es recomendado, no óptimo: ya sabemos que reubicando sale más barato construir también donde llega la gente de los vecinos».

### R2. Textos
- «Hasta dónde se cargan colegios y centros de salud» → título **«¿Cuándo damos por lleno un colegio o un centro de salud?»**. Ayuda, con los números que da el motor para la opción elegida:
  > Un colegio está lleno cuando tiene más alumnos que {9 de cada 10} municipios de tamaño parecido: en uno de 5.000 vecinos, unos {X} alumnos por colegio de primaria. Un centro de salud, cuando su zona pasa de {Y} vecinos, más que {9 de cada 10} zonas de la Comunidad. No hay datos abiertos de plazas por colegio; por eso comparamos.

  Estricta = «3 de cada 4»; Media = «9 de cada 10»; Flexible = «97 de cada 100».
- «Crecimiento máximo al año» → título **«Lo máximo que crece un municipio al año»**. Ayuda dinámica (con el valor y el año elegidos):
  > Ningún municipio gana más de un {3,0 %} de vecinos al año, aunque tenga casas y servicios. Hasta {2035}, como mucho un {34 %} más: uno de 10.000 vecinos, hasta {3.439} personas. Con este techo, el modelo acierta 77 de cada 100 personas en 2015-2025. Si lo subes, mandan las casas, los colegios o la sanidad.
- «de su tamaño» → «de municipios de tamaño parecido» en todos los textos: `Palancas.tsx`, `Metodologia.tsx` (también la limitación «"Lleno" es una comparación») y `OrigenVaso.tsx`. Hoy se lee como si fuera el tamaño del colegio.
- Ficha, «Al límite hoy» (`textoAlLimite` en `Ficha.tsx`): quitar «(un X % por encima)», que exagera porque el límite no es una capacidad. Colegios:
  > Al límite hoy: su colegio de primaria ya tiene unos 356 alumnos; 9 de cada 10 municipios de tamaño parecido tienen menos de 271 por colegio. Cualquier llegada necesita ampliar.

  Sanidad, igual: «9 de cada 10 zonas de la Comunidad atienden a menos de …». El «9 de cada 10» sale de la exigencia elegida.
- «Ver la cuenta» de sanidad: «Quedan 816 plazas en la zona» → «La zona tiene sitio para 816 personas más».
- Deslizador de personas: la pista dice «Por defecto, 134.000»; tiene que decir la cifra exacta (134.426). Además, que encaje en el valor por defecto al pasar cerca (±500) y que salga un enlace «Volver a 134.426» cuando el valor sea otro. Así desaparece la trampa del guion.

### R3. «Atraer»: mayores y colegios
- En `web/src/reparto.ts`, `hueco()` usa `caben`, que incluye el límite de colegios, para todos los grupos. Un municipio lleno de colegios no recibe jubilados aunque tenga casas y centro de salud.
- Llevar por municipio lo que queda de cada límite (vivienda, colegios, sanidad y ritmo). Las familias gastan los cuatro; mayores y teletrabajo, todos menos colegios.
- Test: un municipio con colegios a 0 y sitio en casas y sanidad recibe mayores y no familias.

### R4. «Dónde vivir»
- Marcar por defecto «Con hospital a menos de 30 min» también para «Familia con hijos». Hoy los primeros son Rascafría (hospital a 49 min) y Cenicientos (a 65). Teletrabajo sigue sin marcar, para que funcione el ejemplo de la Sierra Norte. Comprobar que los 3 ejemplos siguen dando resultados y que el de Getafe sigue sacando Humanes de Madrid, como en el guion.
- En la frase de cada municipio, nombrar también lo que va más justo. Rascafría: casa solo para unas 254 personas.

### R5. Datasets nuevos en `data/out`
Generados con el motor TS para que cuadren con la web. Licencia CC BY 4.0, salvo las columnas de minutos (ODbL, como las demás).
- `resultados_2035.csv`: escenario por defecto, una fila por municipio (llegan, caben, sin sitio, tipo, qué limita, reubicación).
- `plan_recomendado.csv`: las obras del plan por defecto (municipio, tipo, plazas o personas que atiende, coste, año, pasan a caber).
- `zonas_salud.csv`: las 286 zonas (población, límite, municipios).
- Añadirlos a `data/out/README.md`, al diccionario y a «Llévate los datos».

### R6. Diapositivas y guion (cuando R1 dé las cifras)
- Diapositiva 9: «unos 282 millones frente a unos 103» → **261** frente a **97,1** (o lo que dé R1); «Plan óptimo» → «Plan recomendado»; «pueblos» → «municipios» en todas las diapositivas. Regenerar `entrega/CABIDA_presentacion_final.pdf`.
- `presentacion/GUION.md`: lo mismo. Además, el paso 8 («el plan óptimo elige, una a una…») y la nota de 103 M€; la respuesta sobre costes (ahora son 28 obras reales y la mediana de cada tipo, en la tabla «Lo que vale cada obra del plan»); quitar la trampa del deslizador cuando esté R2.

### R7. Prueba completa y copia offline
- Portátil y móvil, todas las palancas, «Plan», «Atraer» y «Dónde vivir». Los fallos, en la PR correspondiente.
- `npm run offline` en `web/`; abrir `web/offline/CABIDA.html` con el wifi apagado en 2 portátiles y desde un USB, y hacer la demo entera.

### R8. Guion: Oracle y voces
- Añadir a «Preguntas que pueden hacernos»: **¿Por qué no Oracle?** → «Lo probamos para el asistente, pero en la región de Madrid de la cuenta no había modelos disponibles; por eso Groq, que es gratis. Los datos están listos para servirse desde Oracle como siguiente paso.»
- Cerrar quién es cada voz y quién es el piloto.
- Duración: las bases dicen 15 min + preguntas; el guion es de 10. Se queda en 10, con margen.

## Ya hecho
Revisión del 28/10 (rama `mejora/revision-28`): texto de entrada con la previsión de la Comunidad, vaso sin textos dentro y con nota del sitio libre, mapa coloreado después de reubicar, «Ver todos» en las listas, «sin colegio» / «sin instituto» en la ficha, costes del plan con la mediana de obras reales (`data/out/obras_referencia.csv`), plan en dos tablas, «Vaciar lista», centros de salud en el municipio más poblado de su zona, columnas `plan_obras` y `plan_apertura` en el CSV del escenario (ya no hay CSV del plan aparte), «Dónde vivir» siempre sin el plan, validación «por comarcas», fuera «Dónde más se equivoca» y «municipio(s)» en vez de «pueblo(s)».

Fusionado en `main` el 26-27/10: «Repartir» pasa a **«Atraer»** (#13, #15) y el menú junta «Plan» y «Atraer» antes de «Dónde vivir» (#16); **minutos en coche** (#12); y en «Plan», los botones **«Con este presupuesto» y «Añadir a mano» pasan a «A tu medida»** (#14), con «Plan óptimo» y «A tu medida» marcados en azul según cuál esté elegido.

Publicada en **https://cabida.vercel.app** (se actualiza sola al fusionar en `main`). Cada pestaña tiene su enlace: `#mapa`, `#vivir`, `#como`; `#fiable` baja a «¿Acierta?», al final de «Cómo funciona».

Mapa de los 155 municipios con los 4 tipos, cuánta gente llega y cuánta cabe (vivienda, colegios, sanidad, ritmo), palancas y supuestos, ficha con la cuenta, listas y pestaña de validación (error del 44,4 %).

Añadido el 26/10 (PR «Hospital, reequilibrio, plazo y datasets entregables»):
- ✅ **Oportunidad condicionada**: oportunidad con el hospital general público más cercano a más de 25 km en línea recta (unos 30 min en coche [est.]). Sale rayada en el mapa, y la ficha dice el hospital más cercano.
- ✅ **Reubicar en pueblos cercanos**: interruptor en el escenario, con un deslizador para la distancia (10–50 km; por defecto 25). Lo que no cabe va al pueblo con sitio más cercano (y con el hospital cerca). Se ve en las cifras de cabecera, el vaso, un bloque con los 5 traslados más grandes, la ficha («Envía… a» o «Recibe… de»), el mapa (borde discontinuo en los municipios con los que intercambia gente) y el CSV. Desde el 28/10, el mapa colorea con lo que falta después de reubicar (en minutos: 49 en tensión, 51 polos, 30 oportunidades y 25 en consolidación; en km: 47 / 51 / 32 / 25).
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
| 7 | ✅ **Diapositivas (10 min)** | Problema -> demo en vivo -> validación -> impacto. 11 diapositivas en `presentacion/` y `entrega/CABIDA_presentacion_final.pdf`, con las cifras de abajo. | | mar 27 |
| 8 | ✅ **Guion de la demo** | Borrador en `presentacion/GUION.md`: qué se pulsa y en qué orden (mapa -> año/reubicar -> ficha de Arroyomolinos -> «Planificar aquí» -> «Plan óptimo» -> «Ver en el mapa» -> «Dónde vivir» -> validación), con frases, tiempos y plan B. Falta cerrar quién habla en cada parte y ensayarlo con cronómetro. | | mar 27 |

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
- Validación 2015 -> 2025: acierta dónde va **77 de cada 100 personas** (89 si se mira por comarcas: las 10 zonas estadísticas de la Comunidad, como Sierra Norte o Sur Metropolitano); la tendencia sola, 67. Es decir, coloca en otro municipio al 22,6 % (11,4 % en otra comarca; la tendencia sola, 32,7 % y 20,3 %).
- El WAPE (44,4 %, frente al 64,1 % de la tendencia) cuenta dos veces a cada persona mal colocada: una donde sobra y otra donde falta. Se enseña igual en la web.
- **Pestaña «Plan»** (`#plan`, 26/10, rama `funcionalidad/plan`): lista de obras editable con 2 maneras de rellenarla: «Plan óptimo» y «A tu medida» (repartir un presupuesto o añadir obras a mano). El motor TS es la única fuente (`planOptimo` y `evaluarPlan` en `web/src/motor.ts`, con tests). Valores por defecto: el coste es la **mediana de obras reales de la Comunidad (2023–2026)**, en `data/out/obras_referencia.csv` (`etl/obras_referencia.py`, una noticia de comunidad.madrid por obra): ampliar colegio 225 plazas a **10.936 €/plaza** (mediana de 10 ampliaciones y terminaciones; 2 años), colegio nuevo 450 a **18.583 €** (solo 2 colegios nuevos con plazas y coste en su noticia; 3 años), instituto 880 a **12.562 €** (5 institutos; 3 años), centro de salud **6,67 M€** (7 centros) que atiende a 23.078 personas (mediana de las 286 zonas; 3 años); obras desde 2027 [supuesto]. Un centro de salud nuevo va al municipio más poblado de su zona (no cambia ni coste ni personas).
  - Un centro de salud sirve a **toda su zona básica** (capacidad de la zona = límite + centros × 23.078; cada municipio se lleva su parte por población). Lo que gana una obra se mide en los 155 (con la reubicación), no solo en su pueblo.
  - **En minutos (lo que abre la web)**, plan óptimo reubicando a 30 min: **7 ampliaciones, 3 institutos y 7 centros de salud** en 17 municipios, **97,1 M€**; lo último abre en 2030. Pasan a caber **42.663**, a 2.275 € por persona; siguen sin sitio **8.621** (de 51.284), todos por vivienda.
  - En km, reubicando a 25 km: **7 ampliaciones, 2 institutos y 6 centros de salud** en 15 municipios, **79,4 M€**; lo último abre en 2030. Pasan a caber **41.455**, a 1.914 € por persona; siguen sin sitio **9.319** (de 50.774), todos por vivienda.
  - Cada municipio con lo suyo (sin reubicar; igual en minutos y en km): **26 ampliaciones, 13 institutos y 8 centros** en 41 municipios, **261,0 M€**; lo último abre en 2030. Pasan a caber 53.755 (4.856 € por persona); siguen sin sitio **23.874** (de 77.630), casi todos por vivienda.
  - Con el plan cargado, el mapa colorea por lo que falta después de reubicar y con las obras. En minutos: 16 en tensión, 71 polos, 40 oportunidades y 28 en consolidación; en km: 15 / 71 / 41 / 28 (sin plan ni reubicar, 78 / 37 / 33 / 7).
  - Nota bajo el vaso (en minutos): «Otros municipios tienen sitio para **29.731** personas más. Reubicando a menos de 30 min en coche se aprovechan **26.346**; el resto está lejos o sin hospital cerca».
  - **Para las diapositivas (en minutos, lo que abre la web):** la de impacto compara 17 obras frente a 47 y 8.621 frente a 23.874 personas sin sitio; los 97,1 M€ frente a 261,0 M€ salen solo como «coste estimado» en una nota. Desde el 28/10 los costes son la mediana de obras reales de la Comunidad (`data/out/obras_referencia.csv`), pero siguen saliendo de pocas obras (2 colegios nuevos, 5 institutos, 7 centros de salud), así que son estimaciones.
- Antes de la pestaña «Plan» (colegio a 9,5 M€ y centro a 8 M€; ya no se pueden recalcular):
  - Sin reubicar: **39 colegios y 22 centros de salud** en 49 municipios, **546 M€**; lo último abre en 2030. Siguen sin sitio **23.897** (de 77.630), casi todos por vivienda.
  - Reubicando a 25 km: **14 colegios y 10 centros** en 20 municipios, **213 M€**; lo último abre en 2030. Siguen sin sitio **11.709** (de 50.774), casi todos por vivienda.
  - Ojo: la pestaña «Plan» no da estas cifras (da las de arriba), porque usa otros costes y otro método. **Para las diapositivas valen las de la web** (decidido el 27/10).
- Población de las zonas de salud frente al Censo 2021 (IECM): se aparta un 2,6 % de media en las 286 zonas (1,9 % en las 45 de los pueblos del reto); correlación 0,997.

## Cómo arrancarla
Ver `README.md`. En corto: `cd web`, `npm install`, `npm run dev`.
