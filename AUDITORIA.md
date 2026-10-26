# Auditoría de datos de CABIDA

Revisión de los datos de punta a punta, del 26/10/2026. No cambia el modelo. Las cifras salen de `data/raw`, `data/out`, `web/public/datos` y del motor (`web/src/motor.ts`) con el escenario por defecto (2035, 134.426 personas, exigencia media).

Leyenda: ✅ bien · ❌ mal · ⚠️ dudoso.

## Resumen

| # | Punto | Veredicto |
|---|---|---|
| 1 | Población, municipios, hospitales y zonas de salud cuadran con la fuente | ✅ |
| 1 | **Viviendas previstas del planeamiento contadas varias veces** (un ámbito partido en varios polígonos repite su cifra en cada uno): 217.761 en vez de 152.527 en los 155 (+43 %) | ❌ |
| 1 | 16 centros que no son colegios se cuentan como colegio (filtro «PRI» que coge «PRIV.»); solo 1 está en los 155 y no cambia ninguna cifra | ❌ (sin efecto) |
| 1 | 435 ámbitos pendientes (7.053 ha) sin cifra de viviendas: cuentan como 0 | ⚠️ |
| 2 | Cruces por código INE: ninguno se pierde ni se duplica; sin nulos inesperados | ✅ |
| 3 | Unidades y escalas coherentes | ✅ |
| 4 | Los 33 con «caben = 0»: 22 están a menos de un 6 % por encima de su límite | ⚠️ |
| 5 | Saltos entre tramos de tamaño: afectan a 36 municipios y explican 19 de los 33 «caben = 0» | ⚠️ |
| 6 | 134.426 hasta 2035 es el ritmo real de la última década; la nota de la CM da algo menos (unas 118.000–128.000) y no dice «71.000 al año» | ⚠️ |
| 7 | Datos que no se usan: población por edad (15 MB) y 5 columnas; `THIRD_PARTY.md` no tiene `@types/node` | ⚠️ |

## 1. Totales frente a la fuente

| Qué | Cifra | Contra qué | Veredicto |
|---|---|---|---|
| Población de la CM a 1/1/2025 | 7.137.031 (suma de los 179) | Fila «28 Madrid» del mismo archivo del INE (tabla 2881): 7.137.031. También en 2015: 6.436.996 = 6.436.996 | ✅ |
| Población de los 155 a 1/1/2025 | 997.059 | Suma de los municipios con < 50.000 hab. en el Padrón | ✅ |
| Municipios | 179 en total; 155 con < 50.000 hab. (24 por encima) | Padrón (INE 2881); los 179 de la CM | ✅ |
| Crecimiento 2015–2025 | Los 155: +134.426 (+15,6 %). La CM: +700.035 (+10,9 %). Parte de los 155: **19,2 %** | Padrón | ✅ |
| Centros educativos | 7.757 en el registro, 3.906 en ALTA. Cuentan como colegio 1.725 (1.347 con primaria y 948 con secundaria; 570 con las dos) | Portal de Datos Abiertos, Centros educativos | ✅ en general |
| Centros que no son colegios contados como colegio | 16: 12 «CPRIEPA» (educación de adultos), 1 «A. HOSP. PRIV.» (aula hospitalaria), 2 centros de enseñanzas artísticas y 1 «CPR INF-SEC». El filtro `contains("PRI")` también coge «PRIV.» y «CPRIEPA». En los 155 solo hay uno: el centro de enseñanzas artísticas de San Lorenzo de El Escorial, contado como secundaria (5 en vez de 4) | Columna `TIPO_EXT` del mismo archivo | ❌ Sin efecto: lo he probado y no cambia ninguna cifra |
| Colegios privados | Cuentan igual los públicos (1.159), los concertados (443) y los privados (123) | Columna `TITULARIDAD` | ⚠️ Es una decisión del modelo, no un error. Conviene decirlo en las limitaciones |
| Hospitales generales públicos | 25 (de 59 hospitales generales: 30 privados y 4 de la Iglesia) | Registro de centros sanitarios, sin duplicados por `centro_nro_registro` | ✅ |
| Zonas básicas de salud | 286 en el shapefile y en `zonas_salud.json`. Población estimada a 2025: 7.133.524 | Padrón 2025 de la CM: 7.137.031 (diferencia de un −0,05 %) | ✅ |
| Viviendas del Censo 2021 | 2.956.941 en la CM: 2.546.489 principales y 410.452 no principales | El archivo solo trae el total nacional y los municipios, no el de la CM. Comprobación interna: las principales coinciden con los hogares del Censo (tabla 59543) con menos de un 1 % de diferencia en los 179 | ✅ (sin contraste externo) |
| Viviendas previstas del planeamiento 2025 | En los 155, la app usa **217.761**. Sin repetir, son **152.527** | Capa `VPLA_AMBITOS_REF`: hay 134 ámbitos partidos en varios polígonos (368 en total) y cada polígono repite la cifra de viviendas de todo el ámbito (`NM_VIV_TOT`). Ejemplo: Torrejón de Velasco, «SUNP-1» (4.650 viviendas) en 3 polígonos → se cuentan 13.950. La superficie no se repite, porque cada polígono trae la suya | ❌ |
| Ámbitos pendientes sin cifra de viviendas | 435 de 1.513 en los 155 (7.053 ha de 17.212). Cuentan como 0. Sobre todo en Navalcarnero (850 ha), San Fernando de Henares (584), Bustarviejo (565) y San Martín de la Vega (530) | Misma capa (`NM_VIV_TOT` vacío) | ⚠️ El límite de vivienda se queda corto donde pasa esto |
| Superficie | 8.051,4 km² (suma de los 179) | Portal de la CM (municipios). Los ~8.028 km² que suele dar la CM son una cifra de referencia, no la he contrastado | ⚠️ Diferencia del 0,3 %, sin efecto (la superficie no entra en el modelo) |

**Efecto de las viviendas repetidas** (escenario por defecto), si se arreglara:

| | Ahora | Sin repetir |
|---|---:|---:|
| Caben con los servicios de hoy | 53.239 | 53.239 |
| Sin sitio | 81.187 | 81.187 |
| Tipos (tensión / polo / oportunidad / consolidación) | 73 / 38 / 38 / 6 | 73 / 38 / **37** / **7** |
| Oportunidades condicionadas | 25 | 25 |
| Capacidad total de los 155 | 87.602 | 84.294 |
| Reubicadas (a 25 km) / siguen sin sitio | 32.161 / 49.025 | **28.853 / 52.334** |

Solo cambian 5 municipios: San Lorenzo de El Escorial pasa de oportunidad a consolidación (caben 3.061 → 2.505), y bajan Humanes de Madrid (5.740 → 4.525), Meco (5.476 → 4.302; el límite pasa de ritmo a vivienda), Daganzo de Arriba (1.796 → 1.457) y Miraflores de la Sierra (1.720 → 1.694). En el resto manda otro recurso. La validación no cambia, porque solo usa la presión.

## 2. Cruces por código INE

| Qué | Resultado | Veredicto |
|---|---|---|
| `tabla_maestra.csv`, `municipios.json`, `limites.geojson` | 179 filas y 179 códigos únicos en cada uno; no falta ni sobra ninguno de los 179 del Padrón. `universo` = 155 en los tres | ✅ |
| `validacion_municipios.csv` | 155 filas y 155 únicos | ✅ |
| Centros educativos y planeamiento | Todos sus códigos de municipio están entre los 179. En el planeamiento, el nombre coincide con el del INE en los 157 municipios que tienen ámbitos | ✅ |
| Zona de salud de cada municipio | Todos los `zbs_codigo` existen en `zonas_salud.json`. 69 de las 286 zonas tienen algún municipio asignado; es normal, porque cada municipio va a una sola zona y Madrid capital tiene muchas | ✅ |
| Nulos | Ninguno en los 155. En los 24 de fuera del reto, solo las tasas (`g_*`), que no se calculan para ellos | ✅ |
| San Fernando de Henares | 39.059 vecinos, asignado a la zona Los Alperchines (19.571 personas): el municipio se reparte entre varias zonas y solo se usa la que cubre más superficie | ⚠️ Su límite de sanidad no es fiable |

## 3. Unidades y escalas

| Columna | Unidad | Rango en los 155 | Veredicto |
|---|---|---|---|
| Población, `zbs_poblacion`, llegan, caben | personas | 2.699–47.011 en las zonas | ✅ |
| Viviendas (`viv_*`) | viviendas | 0–31.179 previstas (inflado, ver punto 1) | ✅ unidad / ❌ cifra |
| `personas_hogar` | personas por hogar | 1,58 (Navarredonda y San Mamés) – 3,28 | ✅ Lo bajo son pueblos muy pequeños y envejecidos |
| `suelo_pendiente_ha` | ha (m² ÷ 10.000) | 0–1.230 | ✅ |
| Densidad de lo previsto | viviendas por ha | mediana 10,5; máximo 43,6 (Pezuela de las Torres) | ✅ |
| `superficie_km2`, `hospital_km`, `nucleo_x/y` | km² y km (UTM 30N) | 0,8–64,8 km al hospital | ✅ |
| `g_propia`, `g_zona`, `g_suavizada` | tanto por uno al año | −0,3 % a +5,1 % al año | ✅ |
| Años | Padrón a 1 de enero, 2005–2025; Censo a 2021; zonas de salud a 2019, actualizadas a 2025 | ✅ |
| Porcentajes en la web | `formato.ts` (×100, coma decimal) | ✅ |

## 4. Valores raros

**Capacidades enormes.** Ningún municipio puede recibir más de un +34,4 % de su población hasta 2035: es el tope del ritmo, 3 % al año durante 10 años (1,03¹⁰ − 1). Los 22 que tocan ese tope tienen «caben» = 34 % de sus vecinos. Lo enorme sale solo en el límite de vivienda. En **Torrejón de Velasco** (4.900 vecinos), las 31.179 viviendas previstas dan sitio a unas 45.800 personas, 9,3 veces su población. Sin repetir ámbitos serían 12.455 viviendas, unas 18.400 personas (3,8 veces). Aun así su «caben» es 0, porque su único instituto ya está por encima del límite.

**Llegan = 0.** Solo **San Fernando de Henares**: perdió población entre 2015 y 2025 (40.188 → 39.059). Su tasa suavizada es negativa (−0,16 % al año) y en el reparto los que pierden población no reciben a nadie. Además, caben = 0 (instituto un 0,8 % por encima del límite) y sale como «consolidación». ✅ Es coherente con el modelo.

**Caben = 0 hasta 2035: 33 municipios** (19 por colegios y 14 por sanidad). **22 están a menos de un 6 % por encima de su límite y 6 a menos de un 1 %.** El límite es el percentil 90 de los de su tamaño, así que por construcción un 10 % de cada grupo queda por encima: parte de estos ceros es efecto del método, no un desbordamiento claro. ⚠️

| Municipio | Vecinos | Recurso | Hoy | Límite de su tramo | Por encima |
|---|---:|---|---:|---:|---:|
| Rozas de Puerto Real | 579 | Colegios (secundaria, 1) | 579 vecinos por centro | 579 | +0,0 % |
| Carabaña | 2.451 | Sanidad (zona Perales de Tajuña) | 9.818 personas en la zona | 9.770 | +0,5 % |
| Orusco de Tajuña | 1.531 | Sanidad (zona Perales de Tajuña) | 9.818 personas en la zona | 9.770 | +0,5 % |
| Perales de Tajuña | 3.260 | Sanidad (zona Perales de Tajuña) | 9.818 personas en la zona | 9.770 | +0,5 % |
| Tielmes | 2.964 | Sanidad (zona Perales de Tajuña) | 9.818 personas en la zona | 9.770 | +0,5 % |
| San Fernando de Henares | 39.059 | Colegios (secundaria, 3) | 13.020 vecinos por centro | 12.921 | +0,8 % |
| Torrejón de Velasco | 4.900 | Colegios (secundaria, 1) | 4.900 vecinos por centro | 4.838 | +1,3 % |
| Fuente el Saz de Jarama | 7.413 | Sanidad (zona Fuente el Saz) | 23.614 personas en la zona | 23.275 | +1,5 % |
| Valdeolmos-Alalpardo | 4.626 | Sanidad (zona Fuente el Saz) | 23.614 personas en la zona | 23.275 | +1,5 % |
| Valdepiélagos | 612 | Sanidad (zona Fuente el Saz) | 23.614 personas en la zona | 23.275 | +1,5 % |
| Valdetorres de Jarama | 5.175 | Sanidad (zona Fuente el Saz) | 23.614 personas en la zona | 23.275 | +1,5 % |
| Colmenarejo | 9.640 | Colegios (secundaria, 1) | 9.640 vecinos por centro | 9.387 | +2,7 % |
| Manzanares el Real | 9.648 | Colegios (secundaria, 1) | 9.648 vecinos por centro | 9.387 | +2,8 % |
| Cabanillas de la Sierra | 961 | Colegios (primaria, 1) | 961 vecinos por centro | 933 | +3,0 % |
| Talamanca de Jarama | 4.607 | Colegios (primaria, 1) | 4.607 vecinos por centro | 4.437 | +3,8 % |
| Loeches | 9.261 | Sanidad (zona Mejorada del Campo) | 46.669 personas en la zona | 44.503 | +4,9 % |
| Mejorada del Campo | 25.049 | Sanidad (zona Mejorada del Campo) | 46.669 personas en la zona | 44.503 | +4,9 % |
| Galapagar | 36.758 | Sanidad (zona Galapagar) | 46.704 personas en la zona | 44.503 | +4,9 % |
| Serranillos del Valle | 4.670 | Colegios (primaria, 1) | 4.670 vecinos por centro | 4.437 | +5,3 % |
| El Álamo | 10.594 | Sanidad (zona Navalcarnero) | 47.011 personas en la zona | 44.503 | +5,6 % |
| Navalcarnero | 33.331 | Sanidad (zona Navalcarnero) | 47.011 personas en la zona | 44.503 | +5,6 % |
| Villamanta | 2.899 | Sanidad (zona Navalcarnero) | 47.011 personas en la zona | 44.503 | +5,6 % |
| El Molar | 9.999 | Colegios (secundaria, 1) | 9.999 vecinos por centro | 9.387 | +6,5 % |
| Morata de Tajuña | 8.397 | Colegios (primaria, 1) | 8.397 vecinos por centro | 7.881 | +6,5 % |
| Los Molinos | 4.781 | Colegios (primaria, 1) | 4.781 vecinos por centro | 4.437 | +7,8 % |
| Robledo de Chavela | 4.818 | Colegios (primaria, 1) | 4.818 vecinos por centro | 4.437 | +8,6 % |
| Ajalvir | 4.868 | Colegios (primaria, 1) | 4.868 vecinos por centro | 4.437 | +9,7 % |
| San Agustín del Guadalix | 13.825 | Colegios (secundaria, 1) | 13.825 vecinos por centro | 12.556 | +10,1 % |
| Velilla de San Antonio | 14.468 | Colegios (secundaria, 1) | 14.468 vecinos por centro | 12.556 | +15,2 % |
| Colmenar de Oreja | 9.127 | Colegios (primaria, 1) | 9.127 vecinos por centro | 7.881 | +15,8 % |
| Hoyo de Manzanares | 9.310 | Colegios (primaria, 1) | 9.310 vecinos por centro | 7.881 | +18,1 % |
| Ciempozuelos | 26.350 | Colegios (primaria, 4) | 6.588 vecinos por centro | 5.570 | +18,3 % |
| El Escorial | 17.171 | Colegios (primaria, 2) | 8.586 vecinos por centro | 7.222 | +18,9 % |

## 5. Saltos entre tramos de tamaño

Los límites (vecinos que aguanta un colegio o una zona de salud antes de estar «llena») por tramo, con la exigencia media:

| Tramo | < 1.000 | 1.000–5.000 | 5.000–10.000 | 10.000–20.000 | ≥ 20.000 |
|---|---:|---:|---:|---:|---:|
| Primaria (vecinos por colegio) | 933 | 4.437 | 7.881 | 7.222 | 5.570 |
| Secundaria (vecinos por instituto) | 579 | 4.838 | 9.387 | 12.556 | 12.921 |
| Municipios en el tramo | 42 | 54 | 30 | 16 | 13 |

| Tramo de la zona de salud | < 10.000 | 10.000–25.000 | ≥ 25.000 |
|---|---:|---:|---:|
| Personas que aguanta la zona | 9.770 | 23.275 | 44.503 |
| Zonas en el tramo | 14 | 145 | 127 |

Lo que se ve:
- **Saltos muy grandes en los cortes.** En 1.000 habitantes, el límite de primaria se multiplica por 4,8 (933 → 4.437) y el de secundaria por 8,4 (579 → 4.838). Cabanillas de la Sierra (961 vecinos, 1 colegio) sale con 0 de sitio; con 40 vecinos más tendría sitio para unas 3.500 personas. Santorcaz (1.011) es el caso contrario: 3.426 de sitio, y 0 con 12 vecinos menos.
- **Límites de zona justo por debajo del corte.** El límite de las zonas pequeñas (9.770) se queda a 230 personas del corte de 10.000, y el de las medianas (23.275) a 1.725 del de 25.000. Una zona de 9.900 personas está «llena», y una de 10.100 tiene unas 13.000 plazas libres. Les pasa a las zonas de Perales de Tajuña (9.818) y Fuente el Saz (23.614). Esas dos zonas tienen 9 municipios: 8 salen con caben = 0 por la sanidad, por menos de un 1,5 % (Talamanca de Jarama también sale con 0, pero por los colegios).
- **La primaria no crece con el tamaño:** 7.881 → 7.222 → 5.570. A los municipios más grandes se les exige más por colegio que a los medianos.

**Cuántos municipios afecta: 36.**
- **Colegios (30):** están a menos de un ±20 % de un corte y su límite de colegios cambiaría en más de un 25 % de sus vecinos (o pasaría de 0 a tener sitio, o al revés) si estuvieran al otro lado del corte.
- **Sanidad (9):** están en las dos zonas llenas justo por debajo del corte. Tres municipios están en los dos grupos.
- **Ceros:** estos saltos explican 19 de los 33 municipios con caben = 0.

Los 36: Cabanillas de la Sierra, Ribatejada, Santorcaz, Chinchón, Moraleja de Enmedio, Los Molinos, Quijorna, Ajalvir, Torrejón de Velasco, Torrelaguna, Valdeolmos-Alalpardo, Valdetorres de Jarama, Serranillos del Valle, Talamanca de Jarama, Robledo de Chavela, Casarrubuelos, San Martín de Valdeiglesias, Torrejón de la Calzada, El Molar, Loeches, Brunete, El Boalo, Colmenarejo, Manzanares el Real, Soto del Real, Guadarrama, Humanes de Madrid, San Lorenzo de El Escorial, Villalbilla, Villanueva del Pardillo, Carabaña, Fuente el Saz de Jarama, Orusco de Tajuña, Perales de Tajuña, Tielmes y Valdepiélagos.

## 6. Coherencia de la cifra por defecto

- **La cifra por defecto:** 134.426 personas hasta 2035 es exactamente lo que ganaron los 155 en 2015–2025 (Padrón): el 19,2 % de lo que ganó la Comunidad (700.035, unas 70.000 al año). ✅
- **Lo que dice la nota de la Comunidad** (https://www.comunidad.madrid/node/71411, nota de prensa del 17/02/2025): «un importante crecimiento de más de un millón de habitantes en los próximos 15 años […] registrando una población total de 8 millones de personas en 2039». Parte de 7.001.715 habitantes (2024). No cita la fuente de la proyección.
  - De 7.001.715 (2024) a 8 millones (2039): unas **66.600 personas al año**. El 19,2 % durante 10 años da unas **128.000** hasta 2035.
  - Desde el Padrón de 2025 (7.137.031) hasta 8 millones quedan 862.969 en 14 años: unas **61.600 al año**, que dan unas **118.000** hasta 2035.
  - «71.000 al año» sale de dividir un millón entre 14 años, pero la nota habla de 15 años desde 2024 y de llegar a 8 millones, no de sumar un millón desde 2025. ⚠️
- **Conclusión:** la cifra por defecto es coherente como «seguir el ritmo de la última década», y queda entre un 5 % y un 14 % por encima de lo que daría la previsión de la Comunidad. Propongo cambiar el texto de la parte 2 (ver más abajo) para no decir «71.000».

## 7. Datos descargados que no se usan

| Qué | Dónde | Veredicto |
|---|---|---|
| Población por edad (Censo anual) | `cm_poblacion_por_edad_censo_anual.csv`, 15 MB, en el repo y en `descargar.py` | ⚠️ No lo lee ningún script. Se podría usar para estimar alumnos y mayores, o dejar de descargarlo |
| `viv_principales`, `suelo_pendiente_ha`, `zbs_codigo`, `g_propia`, `g_zona`, `superficie_km2` | `municipios.json` y `tabla_maestra.csv` | ✅ Son informativos; están en la tabla maestra y en el diccionario. El motor no los usa |
| `pob_pad19` de las zonas de salud | Shapefile | ✅ Se usa (base de la población de la zona) |
| `THIRD_PARTY.md` | Raíz | ⚠️ Falta `@types/node` (MIT), que se añadió en la PR #2 |

## Arreglos que propongo (pendientes de tu decisión)

1. **Viviendas del planeamiento sin repetir** (`etl/capacidad.py`, `leer_planeamiento`): contar una sola vez cada ámbito (mismo municipio, nombre, clase de suelo y viviendas) y sumar la superficie de todos sus polígonos. **Cambia cifras de la app:** las viviendas previstas en los 155 bajan de 217.761 a 152.527; 1 oportunidad pasa a consolidación (San Lorenzo de El Escorial); 5 municipios tienen menos sitio; la reubicación a 25 km baja de 32.161 a 28.853 personas. La cabecera (53.239 / 81.187) no cambia, y la validación tampoco.
2. **Filtro de colegios** (`etl/capacidad.py`, `leer_colegios`): no contar educación de adultos, aulas hospitalarias ni centros de enseñanzas artísticas. **No cambia ninguna cifra.**
3. **`THIRD_PARTY.md`**: añadir `@types/node`.
4. **Texto del deslizador** (parte 2, punto 3): en lugar de «más de 1 millón hasta 2039 (unas 71.000 al año)», poner algo que cuadre con la nota. Por ejemplo: «La Comunidad prevé llegar a 8 millones en 2039, más de un millón en 15 años. En la última década estos 155 municipios se llevaron el 19 % de lo que creció la Comunidad: si sigue así, unas 134.000 personas hasta 2035».

Los saltos entre tramos (punto 5) y los ceros por muy poco (punto 4) son del método, no de los datos. Se podrían suavizar, por ejemplo con límites interpolados entre tramos, pero eso cambia el modelo: queda para después de la final si lo decides.
