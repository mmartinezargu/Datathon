# Datos en bruto

Archivos tal cual se descargan de la fuente. No se editan a mano.

## ine_2881_poblacion_*.csv

- **Fuente:** INE, tabla 2881 «Madrid: Población por municipios y sexo» (cifras oficiales del Padrón a 1 de enero): https://www.ine.es/jaxiT3/Tabla.htm?t=2881
- **Descargado:** 14/10/2026. Sexo = Total.
- **Archivos:** 2005–2015 y 2015–2025. El año 2015 está en los dos y coincide.
- **Filas:** 180 × 11 años = 1.980 por archivo (179 municipios + 1 fila `28 Madrid` con el total de la Comunidad).

Cómo leerlos:

- Codificación **latin-1** (ISO-8859-1), no UTF-8.
- Separador `;`. Los números llevan punto de miles (`1.404`). En pandas: `pd.read_csv(ruta, sep=';', encoding='latin-1', thousands='.')`.
- La columna `Municipios` empieza por el código INE de 5 cifras (`28001 Acebeda, La`). Es la clave para cruzar con el resto de datos.
- Quitar la fila `28 Madrid` (es el total, no un municipio).

Primeras cifras (1/1/2025): 155 municipios con menos de 50.000 hab., que suman 997.059 personas. Tres Cantos, Pinto y Colmenar Viejo ya superan los 50.000.
