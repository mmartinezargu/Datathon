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

Los saltos entre tramos (punto 5) y los ceros por muy poco (punto 4) se han tratado como errores del método y se han corregido (ver «Decisiones»).

## Decisiones (26/10/2026)

Se aplican los arreglos 1–3 y, además, se corrige el método de los límites de colegios y sanidad: los saltos entre tramos se tratan como errores. En sanidad el límite era circular (cada zona se comparaba con las de su tamaño, y el tamaño es justo lo que se mide), y en colegios saltaba ×4,8 y ×8,4 en el corte de 1.000 habitantes. Ya no hay tramos.

### Qué se ha cambiado

1. **Planeamiento sin repetir** (`etl/capacidad.py`). Se agrupa por municipio, nombre del ámbito y clase de suelo. La capa no trae un código de ámbito: `CD_UNI` es distinto en cada polígono. Si todos los polígonos de un grupo traen la misma cifra de viviendas, se cuenta una vez; la superficie se suma siempre. En las zonas pendientes hay 224 grupos con varios polígonos: 136 traen la misma cifra, 84 no traen ninguna y **4 traen cifras distintas**: «P-1 LAS HUERTAS» y «P-6 CARMONA» (Becerril de la Sierra), «S-1 ENSANCHE» (El Escorial) y «S-R8 LOS HUEROS» (Villalbilla). En esos 4 se suman las cifras distintas, cada una una vez. Si se sumaran todos los polígonos, en Villalbilla las 2.832 viviendas se contarían 3 veces. Viviendas previstas en los 155: 217.761 → **152.527**.
2. **Colegios por tipo exacto** (`TIPO_EXT`, lista cerrada en `capacidad.py`). Quedan fuera educación de adultos, aulas hospitalarias y enseñanzas artísticas. En los 155 solo cambia San Lorenzo de El Escorial (5 → 4 institutos).
3. **`THIRD_PARTY.md`**: `@types/node` 22.20.5 (MIT).
4. **Colegios: niños por colegio, con una curva en lugar de tramos** (`web/src/motor.ts`).
   - **Niños estimados.** De `cm_poblacion_por_edad_censo_anual.csv` (2025; nacionalidad y sexo «Total»): primaria ≈ 0,8 × «5–9» + 0,4 × «10–14»; secundaria ≈ 0,6 × «10–14» + 0,6 × «15–19». Se toma la proporción del Censo anual y se aplica al Padrón 2025, porque el total del Censo anual (7.113.886) no es el del Padrón (7.137.031). Columnas `ninos_primaria` y `ninos_secundaria`, marcadas [est.] en el diccionario.
   - **Límite.** Recta de log(niños por colegio) sobre log(población) con los 155 que tienen colegio de ese nivel, más el percentil «exigencia» de los residuos. Con la exigencia media, el límite de primaria pasa de 137 niños por colegio en un pueblo de 1.000 vecinos a 498 en uno de 10.000; el de secundaria, de 197 a 694.
   - **Plazas libres** = colegios × límite − niños. **Personas que caben** = plazas libres ÷ proporción de niños del municipio. Un colegio nuevo suma «límite» plazas.
5. **Sanidad: un único límite para todas las zonas** (opción C2): el percentil «exigencia» de la población de las 286 zonas (38.891 con la exigencia media).
   - **Por qué no sirvió C1.** El Observatorio de Resultados del SERMAS (`resultados_ap_2024.csv`) trae, por centro de salud, la población asignada y la presión asistencial ajustada de medicina de familia (262 centros). Pero no tiene ningún centro para 12 de las 45 zonas de los 155, entre ellas El Escorial, San Lorenzo de El Escorial, Moralzarzal, Alpedrete, Arroyomolinos, Valdemorillo, Villanueva del Pardillo, Collado Mediano, Daganzo de Arriba, Fuente el Saz, Sevilla la Nueva y Morata de Tajuña. Cubre el **78,1 %** de la población de los 155, por debajo del 95 % pedido.
6. **Fuera `TRAMOS_MUNICIPIO` y `TRAMOS_ZONA`.** Se han actualizado `umbralesDe`, «Ver la cuenta», la metodología, los textos de exigencia, `tipos.ts`, `preparar.py` y el diccionario. `mudanza.ts` no los usaba.
7. **Validación 2015→2025: 44,4 %** (no cambia, porque solo usa la presión).

### Cifras antes y después

«Antes» es `main` (74a1d92); «después», esta rama. Escenario por defecto: 2035, 134.426 personas.

**Exigencia media (por defecto, 0,9)**

| | Antes | Después |
|---|---:|---:|
| Caben sin ampliar servicios | 53.239 | 60.785 |
| Sin sitio | 81.187 | 73.641 |
| En tensión | 73 | 67 |
| Polos | 38 | 41 |
| Oportunidades | 38 | 37 |
| Consolidación | 6 | 10 |
| Oportunidades condicionadas | 25 | 24 |
| Caben = 0 (por recurso) | 33 (19 colegios, 14 sanidad) | 30 (19 colegios, 11 sanidad) |
| … de ellos, a menos de un 5 % de su límite | 18 | 4 |
| Reubicadas a 25 km | 32.161 | 38.010 |
| Traslados | 85 | 93 |
| Municipios que reciben | 45 | 48 |
| Km de media por persona | 9,0 | 10,2 |
| Siguen sin sitio tras reubicar | 49.025 | 35.631 |

**Exigencia flexible (0,97)**

| | Antes | Después |
|---|---:|---:|
| Caben sin ampliar servicios | 88.362 | 79.907 |
| Sin sitio | 46.064 | 54.519 |
| En tensión | 62 | 59 |
| Polos | 44 | 46 |
| Oportunidades | 36 | 33 |
| Consolidación | 13 | 17 |
| Oportunidades condicionadas | 25 | 22 |
| Caben = 0 (por recurso) | 10 (10 colegios, 0 sanidad) | 10 (7 colegios, 3 sanidad) |
| … de ellos, a menos de un 5 % de su límite | 8 | 8 |
| Reubicadas a 25 km | 40.928 | 33.468 |
| Traslados | 105 | 90 |
| Municipios que reciben | 57 | 53 |
| Km de media por persona | 9,2 | 10,2 |
| Siguen sin sitio tras reubicar | 5.137 | 21.051 |

**Exigencia estricta (0,75)**

| | Antes | Después |
|---|---:|---:|
| Caben sin ampliar servicios | 33.372 | 34.535 |
| Sin sitio | 101.054 | 99.891 |
| En tensión | 94 | 89 |
| Polos | 24 | 28 |
| Oportunidades | 36 | 35 |
| Consolidación | 1 | 3 |
| Oportunidades condicionadas | 26 | 25 |
| Caben = 0 (por recurso) | 63 (40 colegios, 23 sanidad) | 53 (37 colegios, 16 sanidad) |
| … de ellos, a menos de un 5 % de su límite | 17 | 4 |
| Reubicadas a 25 km | 20.462 | 12.176 |
| Traslados | 55 | 58 |
| Municipios que reciben | 28 | 37 |
| Km de media por persona | 7,1 | 7,2 |
| Siguen sin sitio tras reubicar | 80.592 | 87.715 |


«A menos de un 5 % de su límite» se mide en el recurso que deja el «caben» en 0. En colegios, el nivel que más se pasa, porque hasta que no baje de su límite no hay sitio.

### Los 10 municipios que más cambian (exigencia media)

| Municipio | Caben antes → después | Manda antes → después | Tipo antes → después | Motivo |
|---|---:|---|---|---|
| Paracuellos de Jarama | 199 → 9.509 (+9.310) | colegios → ritmo | tensión → polo | Colegios 199 → 17.916: antes se contaban vecinos por colegio y salía casi lleno; contando niños tiene sitio. Además, la vivienda baja de 21.110 a 10.358 por el planeamiento sin repetir |
| El Escorial | 0 → 5.855 (+5.855) | colegios → vivienda | tensión → oportunidad | Colegios 0 → 8.229: estaba un 18,9 % por encima del límite del tramo de 10.000 a 20.000, que era más bajo que el del tramo de 5.000 a 10.000 |
| Valdemorillo | 24 → 1.849 (+1.825) | colegios → vivienda | tensión → tensión | Colegios 24 → 5.511, por el salto entre tramos |
| Robledo de Chavela | 0 → 1.470 (+1.470) | colegios → vivienda | tensión → polo | Colegios 0 → 1.917: estaba un 8,6 % por encima del límite de su tramo |
| Humanes de Madrid | 5.740 → 4.525 (−1.215) | vivienda → vivienda | oportunidad → oportunidad | Planeamiento sin repetir |
| Meco | 5.476 → 4.302 (−1.174) | ritmo → vivienda | polo → polo | Planeamiento sin repetir: la vivienda baja de 12.923 a 4.302 |
| Los Molinos | 0 → 1.143 (+1.143) | colegios → vivienda | tensión → oportunidad | Colegios 0 → 2.790: estaba un 7,8 % por encima del límite de su tramo |
| Moraleja de Enmedio | 1.082 → 0 (−1.082) | vivienda → colegios | oportunidad → tensión | Colegios 2.301 → 0: tiene muchos niños para su único colegio (380, con un límite de 359) |
| San Martín de la Vega | 2.265 → 3.255 (+991) | sanidad → vivienda | consolidación → consolidación | Sanidad 2.265 → 17.881: su zona (21.010 personas) ya no se compara con el límite de las de 10.000 a 25.000 (23.275), sino con el de todas (38.891) |
| Becerril de la Sierra | 1.144 → 159 (−985) | colegios → colegios | polo → tensión | Colegios 1.144 → 159: muchos niños por colegio para su tamaño |

En total cambian de tipo 24 municipios, y en 49 cambia el recurso que manda.

## Datos de partida más exactos (26/10/2026, rama `mejora/datos-exactos`)

Cuatro cambios en los datos y uno en la reubicación. Escenario por defecto (2035, 134.426 personas, exigencia media).

### 1. Reubicación: nadie va a un pueblo con el hospital lejos

Antes solo se excluían como destino las oportunidades condicionadas. Un pueblo de otro tipo con el hospital a más de 25 km sí recibía gente: por ejemplo, Bustarviejo, que es polo y tiene el hospital a 34,4 km. Ahora no recibe nadie con `hospital_km > HOSPITAL_LEJOS_KM`, sea del tipo que sea. El mapa no cambia: el rayado sigue solo en las oportunidades. Hay un test con Bustarviejo a 25 y a 50 km.

Efecto solo de este cambio: a 25 km se reubican 36.167 en vez de 38.010.

### 2. Vivienda: viviendas vacías del INE en vez de «no principales»

Antes se usaban las viviendas no principales del Censo 2021 (tabla 59525), que juntan las vacías con las segundas residencias. Ahora se usan las **vacías** según el consumo eléctrico (Censo 2021, tabla 59531, https://www.ine.es/jaxi/Tabla.htm?tpx=59531). La palanca pasa a llamarse «Vivienda vacía que se ocupa» y sigue en el 15 %.

- El INE no publica las vacías de los municipios más pequeños: faltan **44 de los 155**, todos con unos 1.000 habitantes o menos (18.712 vecinos en total). En esos se siguen usando las no principales, y se marcan en la columna `viv_vacias_sin_dato`.
- En los 111 con dato hay 41.212 vacías, frente a 104.506 no principales: un 39 %. En los 155, el modelo cuenta ahora 51.819 viviendas, frente a 115.113.
- Donde más se nota es en los pueblos de segunda residencia de la sierra: por ejemplo, Guadarrama pasa de 3.875 a 660.

### 3. Sanidad: población de las zonas de salud frente al Censo 2021 (solo validación)

La población de cada zona básica de salud sale del Padrón 2019 que trae el mapa de zonas, actualizado con el crecimiento de su municipio principal. Para validarla, se ha llevado a 2021 con el mismo método y se ha comparado con el Censo 2021 por zona básica de salud del IECM (tabla T21SALUD01, https://web.comunidad.madrid/iestadis/fijas/estructu/demograficas/censos/icensos21_zbsal.htm). No se sustituye nada. El cálculo está en `etl/validacion.py`, que lo escribe en `validacion.json`.

| | Zonas | Correlación | Diferencia media | Media en valor absoluto | Mediana en valor absoluto |
|---|---:|---:|---:|---:|---:|
| Las 286 zonas | 286 | 0,997 | +1,3 % | 2,6 % | 2,0 % |
| Zonas de los pueblos del reto | 45 | 0,998 | +1,2 % | 1,9 % | — |

Las 286 zonas cruzan por código con el Censo; los nombres solo cambian en la forma de escribirlos («Dr.» frente a «Doctor», tildes). El +1,3 % se explica en parte porque el Censo deja aparte a 45.916 personas que viven en colectivos (residencias y similares), sin zona asignada.

Las 10 que más se apartan:

| Zona | Nuestra cifra (2021) | Censo 2021 | Diferencia |
|---|---:|---:|---:|
| Virgen del Val | 14.163 | 11.855 | +19,5 % |
| San Lorenzo de El Escorial (del reto) | 24.370 | 21.273 | +14,6 % |
| La Garena | 8.400 | 7.371 | +14,0 % |
| El Naranjo | 21.648 | 25.109 | −13,8 % |
| El Pardo | 3.494 | 3.151 | +10,9 % |
| Rivas - 1º de Mayo | 29.058 | 32.545 | −10,7 % |
| Juan de Austria | 14.778 | 16.396 | −9,9 % |
| La Princesa | 19.882 | 18.172 | +9,4 % |
| Parque Loranca | 30.840 | 28.259 | +9,1 % |
| Colmenar Viejo Norte | 19.019 | 20.912 | −9,0 % |

Veredicto: ✅ La cifra de las zonas es buena. Sale en «¿Acierta?».

### 4. Colegios: alumnos matriculados (ALMUDENA) en vez de niños estimados por edad

ALMUDENA, el banco de datos municipal del IECM, publica los alumnos matriculados por municipio en primaria (tema 501032) y en ESO (tema 501033) de 1994 a 2024 (el último año es provisional). La fuente original es la Consejería de Educación. Están los 155 municipios del reto. Se usa el último año.

Qué cambia:

- **Antes**, la carga de los colegios eran los niños que viven en el municipio, estimados a partir de grupos de 5 años: de 6 a 11 años en primaria y de 12 a 17 en secundaria, que incluye el bachillerato. **Ahora** son los alumnos matriculados en sus centros, vivan donde vivan: lo que de verdad llena el colegio.
- La curva de «alumnos por colegio según el tamaño» se ajusta con datos reales. El límite de cada colegio baja: en un municipio como Paracuellos de Jarama pasa de 881 a 603 en primaria.
- Para pasar plazas a personas se usan los alumnos por vecino del municipio. Si muchos niños estudian fuera, una plaza libre «vale» más personas.
- Hay 4 municipios con colegio en el registro de centros pero sin alumnos en ALMUDENA: Navalafuente en primaria; Navacerrada, Perales de Tajuña y Villamanta en ESO. Ahí se usan los niños estimados por la relación alumnos ÷ niños de los demás (0,98 en primaria y 0,70 en ESO), y se marcan en `alumnos_estimados`.
- ⚠️ Manzanares el Real tiene un instituto con 61 alumnos de ESO. Con tan pocos, su límite de colegios sale enorme y manda la vivienda.

### Antes y después (escenario por defecto)

| | Antes (main) | 1. Hospital | 1 + 2. Vacías | Después (1 + 2 + 4) |
|---|---:|---:|---:|---:|
| Caben sin ampliar servicios | 60.785 | 60.785 | 53.953 | **55.243** |
| Sin sitio | 73.641 | 73.641 | 80.473 | **79.183** |
| Tensión / polo / oportunidad / consolidación | 67 / 41 / 37 / 10 | 67 / 41 / 37 / 10 | 75 / 36 / 37 / 7 | **83 / 33 / 35 / 4** |
| Oportunidades condicionadas | 24 | 24 | 22 | **22** |
| Reubicadas a 25 km (a cuántos municipios) / siguen sin sitio | 38.010 (48) / 35.631 | 36.167 (37) / 37.475 | 30.857 (36) / 49.616 | **22.305 (32) / 56.878** |
| Reubicadas a 50 km / siguen sin sitio | 41.445 / 32.197 | 38.542 / 35.099 | 32.489 / 47.983 | **22.305 / 56.878** |
| Caben = 0 (colegios / sanidad) | 30 (19 / 11) | | | **31 (18 / 13)** |

Después de los cambios, a 25 km ya se llenan los 32 pueblos con sitio y el hospital cerca (22.305 plazas, todas usadas). Por eso a 50 km sale lo mismo.

La validación 2015→2025 no cambia, porque solo usa la presión: 22,6 % en otro municipio, 11,4 % en otra zona y un WAPE del 44,4 %.

Plan de inversión (`uv run plan_inversion.py`):

| | Antes | Después |
|---|---|---|
| Sin reubicar | 34 colegios + 22 centros de salud en 41 municipios, 499 M€; siguen sin sitio 17.706 | 39 colegios + 21 centros en 49 municipios, 538 M€; siguen sin sitio 26.653 |
| Reubicando a 25 km | 6 + 4 en 7 municipios, 89 M€; siguen sin sitio 3.802 | 13 + 11 en 21 municipios, 212 M€; siguen sin sitio 13.184 |

En los dos casos, lo último abriría en 2030 (supuesto: obras desde 2027). Lo que sigue sin sitio es casi todo por vivienda.

### Los 10 municipios que más cambian

| Municipio | Caben antes → después | Manda | Tipo | Por qué |
|---|---:|---|---|---|
| Paracuellos de Jarama | 9.509 → 4.231 (−5.278) | ritmo → colegios | polo → tensión | Primaria: el límite por colegio de su tamaño baja de 881 a 603 alumnos con la matrícula real, y sus colegios tienen 523 |
| El Escorial | 5.855 → 2.468 (−3.387) | vivienda → colegios | oportunidad → oportunidad | Primaria: límite 675 → 488, con 427 alumnos por colegio. La vivienda también baja (5.855 → 4.970), por las vacías reales |
| Cobeña | 2.638 → 305 (−2.333) | ritmo → colegios | oportunidad → tensión | Primaria: 328 alumnos por colegio con un límite de 341 (antes, 301 niños con un límite de 429) |
| Soto del Real | 1.993 → 0 (−1.993) | vivienda → colegios | oportunidad → tensión | Su instituto tiene 509 alumnos de ESO por centro (antes se estimaban 332), por encima del límite de 480: le llegan alumnos de fuera |
| Manzanares el Real | 0 → 1.599 (+1.599) | colegios → vivienda | tensión → oportunidad | Antes su instituto parecía lleno (724 chicos de 12 a 17 años); matriculados en ESO hay 61 |
| Collado Mediano | 0 → 1.570 (+1.570) | colegios → vivienda | tensión → oportunidad | Su colegio tiene 216 alumnos de primaria, no los 449 niños estimados: muchos estudian fuera |
| Guadarrama | 1.620 → 276 (−1.344) | vivienda → vivienda | tensión → tensión | Vivienda: 660 vacías reales frente a 3.875 no principales (muchas segundas residencias) |
| Cercedilla | 1.205 → 54 (−1.151) | vivienda → colegios | consolidación → tensión | Su instituto tiene 443 alumnos con un límite de 446. La vivienda también baja (1.205 → 506) |
| Becerril de la Sierra | 159 → 1.300 (+1.141) | colegios → vivienda | tensión → polo | Primaria: 268 alumnos matriculados frente a 390 niños estimados |
| Guadalix de la Sierra | 0 → 1.053 (+1.053) | colegios → colegios | tensión → oportunidad | Primaria: 284 alumnos matriculados frente a 408 niños estimados |

Cambian de tipo 30 municipios, y en 32 cambia el recurso que manda. Los cambios más frecuentes son de polo a tensión (10) y de oportunidad a tensión (9).
