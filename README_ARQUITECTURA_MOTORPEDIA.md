# Motorpedia — Arquitectura y guía completa del código

> Documento técnico de referencia para entender, mantener, modificar y ampliar Motorpedia.

## 1. Arquitectura general

Motorpedia es una aplicación web estática servida mediante GitHub Pages.

No utiliza:

- servidor backend;
- base de datos SQL;
- framework JavaScript;
- Node.js en producción.

Su arquitectura se divide en cuatro capas:

```text
┌──────────────────────────────────────────────────┐
│                Base_de_Datos.xlsm                │
│            Fuente maestra de vehículos           │
└────────────────────────┬─────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────┐
│              tools/import_excel.py               │
│     Convierte Excel → JSON + índices internos    │
└────────────────────────┬─────────────────────────┘
                         │
            ┌────────────┼────────────┐
            ▼            ▼            ▼
   data/vehicles.json  stats.json  content-index.csv
            │
            ▼
┌──────────────────────────────────────────────────┐
│                  FRONTEND                        │
│                                                  │
│ index.html                                       │
│ styles.css                                       │
│ app.js                                           │
│ classification.js                                │
│ classification.css                               │
└────────────────────────┬─────────────────────────┘
                         │
                         ▼
                   GitHub Pages
```

Los recursos editoriales viven separados:

```text
assets/brand-logos/
assets/vehicles/
content/articles/
```

---

# 2. Estructura recomendada del repositorio

```text
Motorpedia/
│
├── Base_de_Datos.xlsm
│
├── index.html
├── styles.css
├── app.js
├── classification.js
├── classification.css
│
├── data/
│   ├── vehicles.json
│   ├── stats.json
│   ├── content-index.csv
│   ├── brandLogos.json
│   └── motoTaxonomy.json
│
├── assets/
│   ├── brand-logos/
│   └── vehicles/
│
├── content/
│   └── articles/
│
├── tools/
│   └── import_excel.py
│
└── .github/
    └── workflows/
        └── update-motorpedia-data.yml
```

---

# 3. `Base_de_Datos.xlsm`

Es la **fuente de verdad** de las fichas.

Las dos hojas principales son:

```text
Coches
Motos
```

El importador V4.1 utiliza los nombres de las columnas, no posiciones fijas, mediante la clase `RowReader`.

Esto es importante porque permite:

- reorganizar columnas;
- añadir nuevas columnas;
- conservar compatibilidad aunque cambie su posición.

Siempre que el nombre de la cabecera esperado siga existiendo, el importador puede encontrarla.

---

# 4. `tools/import_excel.py`

Es el puente entre Excel y la web.

## Responsabilidades

El script:

1. encuentra el Excel maestro;
2. abre internamente el `.xlsx/.xlsm` como archivo ZIP;
3. lee las hojas `Coches` y `Motos`;
4. convierte cada fila en un objeto Python;
5. crea IDs estables;
6. detecta fotos;
7. detecta artículos;
8. exporta `vehicles.json`;
9. calcula `stats.json`;
10. crea `content-index.csv`.

No necesita Microsoft Excel ni LibreOffice.

## `database_file()`

Busca el archivo en este orden:

```python
Base_de_Datos.xlsm
Base de Datos.xlsm
Base_de_Datos.xlsx
Base de Datos.xlsx
```

Si ninguno existe, busca cualquier `.xlsm/.xlsx` en la raíz.

**Implicación:** es mejor dejar una sola base maestra.

## `read_workbook(path)`

Lee internamente la estructura XML de Excel.

Un archivo XLSX/XLSM es técnicamente un ZIP que contiene XML.

El script utiliza:

```python
zipfile
xml.etree.ElementTree
```

para evitar dependencias externas.

## `RowReader`

Permite solicitar columnas por nombre:

```python
r.get("Marca")
r.get("Generación", "Generacion")
```

Primero intenta coincidencia exacta y después coincidencia normalizada sin tildes ni diferencias de mayúsculas.

Gracias a ello:

```text
Generación
Generacion
```

pueden tratarse como equivalentes.

## `car_record()`

Convierte una fila de `Coches` en un objeto de vehículo.

Estructura aproximada:

```json
{
  "type": "car",
  "brand": "BMW",
  "model": "Serie 3",
  "generation": "E46",
  "version": "M3",
  "name": "BMW Serie 3 M3",
  "yearStart": 2000,
  "yearEnd": 2006,
  "power": 343,
  "torque": 365,
  "weight": 1570,
  "category": null,
  "subcategory": null,
  "specs": {}
}
```

## `moto_record()`

Hace lo mismo para `Motos`, incluyendo:

```json
"category": "SPORT",
"subcategory": "Superbike"
```

y valoraciones específicas de motos.

## `taxonomyLocked`

Actualmente los registros generados desde el nuevo Excel llevan:

```json
"taxonomyLocked": true
```

Esto indica al frontend que:

```text
Marca / Modelo / Generación / Versión
```

ya han sido decididos en el Excel y **no deben ser reinterpretados automáticamente**.

Es especialmente importante en motos porque las versiones antiguas utilizaban `motoTaxonomy.json` para corregir agrupaciones.

---

# 5. Sistema de IDs

## `stable_signature(record)`

Genera un SHA-1 interno a partir de:

```text
type
brand
model
generation
version
yearText
```

Sirve para reconocer una ficha en regeneraciones posteriores.

## `generated_id()`

Si el Excel no incluye ID, genera uno legible + hash.

Ejemplo:

```text
moto-yamaha-mt-07-3a-generacion-standard-2021-2024-a1b2c3d4
```

## ID explícito desde Excel

Si existe `ID Motorpedia`, tiene prioridad.

Por eso se recomienda usarlo como identidad permanente.

---

# 6. Recursos multimedia

## `media_for()`

Para cada vehículo:

1. convierte la marca a slug;
2. busca la carpeta del ID;
3. busca `1` y `2`;
4. busca un artículo Markdown.

Ejemplo:

```text
assets/vehicles/bmw/car-bmw-serie-3-e46-m3/
├── 1.webp
└── 2.webp
```

El objeto generado incluye:

```json
"media": {
  "images": [
    "assets/vehicles/bmw/car-bmw-serie-3-e46-m3/1.webp",
    "assets/vehicles/bmw/car-bmw-serie-3-e46-m3/2.webp"
  ]
}
```

El artículo se guarda como:

```json
"article": "content/articles/bmw/car-bmw-serie-3-e46-m3.md"
```

---

# 7. `data/vehicles.json`

Es la base de datos que consume el navegador.

No debe tratarse como fuente maestra.

Se regenera automáticamente.

## Campos estructurales

```text
id
type
brand
category
subcategory
model
generation
version
name
yearStart
yearEnd
yearText
```

## Campos rápidos

Se duplican algunos datos importantes fuera de `specs` porque se utilizan continuamente:

```text
power
torque
weight
kgcv
price
vmax
```

Esto facilita:

- filtros;
- ordenación;
- tarjetas;
- comparador.

## `specs`

Contiene el resto de especificaciones:

```json
"specs": {
  "Potencia": 343,
  "Par": 365,
  "Peso DIN": 1570,
  "0-100 km/h": 5.1
}
```

---

# 8. `data/stats.json`

Contiene estadísticas globales precalculadas.

Ejemplo:

```json
{
  "total": 3080,
  "cars": 2764,
  "motos": 316,
  "brands": 80
}
```

Se utiliza en el hero de la página para evitar recalcular datos sencillos cada vez.

---

# 9. `data/content-index.csv`

Es un índice administrativo.

Relaciona:

```text
vehículo ↔ ID ↔ fotos ↔ artículo
```

Es útil para mantenimiento humano, no para el renderizado principal de la página.

---

# 10. `index.html`

Es el esqueleto de la interfaz.

Incluye tres vistas principales:

```text
catalogView
brandsView
compareView
```

La navegación no carga páginas nuevas.

JavaScript oculta/muestra estas secciones.

## Orden de scripts

Actualmente:

```html
<script src="app.js?v=4"></script>
<script src="classification.js?v=4.1"></script>
```

Esto es deliberado.

`classification.js` necesita que las funciones globales de `app.js` ya existan para poder extenderlas.

Lo mismo ocurre con CSS:

```html
<link rel="stylesheet" href="styles.css?v=4">
<link rel="stylesheet" href="classification.css?v=4.1">
```

`classification.css` se carga después para poder sobrescribir/añadir reglas.

---

# 11. `app.js`: núcleo de la aplicación

Es el archivo principal del frontend.

## Estado global

Entre otras variables:

```javascript
vehicles
brands
stats
hierarchy
brandLogos
motoTaxonomy

typeFilter
visible
selected
currentResults
timelineMode
```

### `vehicles`

Todos los vehículos cargados desde JSON.

### `hierarchy`

Estructura:

```text
Marca
└── Modelo
    └── Generación
        └── IDs de versiones
```

Se genera en el navegador mediante `buildHierarchyFromVehicles()`.

### `selected`

Set con los IDs incluidos en el comparador.

---

# 12. Carga inicial de datos

`app.js` ejecuta:

```javascript
Promise.all([
  fetch("data/vehicles.json"),
  fetch("data/stats.json"),
  fetch("data/brandLogos.json"),
  fetch("data/motoTaxonomy.json")
])
```

Después:

```text
vehicles = datos
applyMotoTaxonomy()
buildBrandStatsFromVehicles()
buildHierarchyFromVehicles()
populateBrands()
renderBrands()
applyFilters()
```

Con el Excel V4.1, las motos llevan `taxonomyLocked=true`, por lo que la taxonomía antigua no debería sobreescribir la clasificación introducida manualmente.

---

# 13. Jerarquía de marcas

## `buildHierarchyFromVehicles()`

Agrupa todos los registros:

```text
v.brand
→ v.model
→ v.generation
```

Cada generación almacena:

```javascript
{
  name,
  rawName,
  count,
  vehicleIds,
  yearStart,
  yearEnd
}
```

Esto alimenta:

- navegación por fabricante;
- cards de modelos;
- generaciones;
- timeline.

---

# 14. Sistema de logos

Los logos son locales.

La función:

```javascript
logoSources(brand)
```

prueba rutas como:

```text
assets/brand-logos/bmw.svg
assets/brand-logos/bmw.png
assets/brand-logos/bmw.webp
assets/brand-logos/bmw.jpg
```

`brandLogos.json` se utiliza para excepciones.

## Temas

La configuración puede incluir:

```json
"theme": "normal"
```

```json
"theme": "invert"
```

```json
"theme": "light-bg"
```

`invert` es útil para logos negros monocromos.

---

# 15. Filtros generales

La función original de V4 era:

```javascript
applyFilters()
```

V4.1 la reemplaza desde `classification.js`.

El filtro actual evalúa:

```text
tipo
marca
categoría
subcategoría
texto buscado
potencia mínima
año mínimo
```

y después aplica el orden solicitado.

---

# 16. `classification.js`

Este archivo añade la lógica de Categoría/Subcategoría sin reescribir todo `app.js`.

Es una capa de extensión.

Al inicio guarda referencias:

```javascript
const originalCardHtml = cardHtml;
const originalOpenDetail = openDetail;
const originalOpenBrand = openBrand;
const originalOpenGeneration = openGeneration;
```

Después redefine esas funciones globales.

Esta técnica permite añadir funcionalidades encima de V4 conservando el núcleo.

## Ventaja

Cambios pequeños y aislados.

## Inconveniente

Si `app.js` cambia mucho en el futuro, hay que comprobar que los wrappers de `classification.js` siguen siendo compatibles.

A largo plazo podría merecer la pena integrar ambas capas en módulos ES.

---

# 17. Filtros Categoría/Subcategoría en el catálogo

## `ensureCatalogClassificationFilters()`

Crea dinámicamente los dos `<select>`:

```text
Categoría
Subcategoría
```

No están escritos directamente en el HTML principal.

## `syncCatalogClassificationOptions()`

Calcula las opciones disponibles a partir del contexto actual.

Por ejemplo:

```text
Tipo = Motos
Marca = Aprilia
Categoría = ADVENTURE
```

la lista de subcategorías solo muestra las disponibles en esas motos Aprilia Adventure.

## `optionCounts()`

Cuenta cuántos vehículos pertenecen a cada opción.

Por eso el selector puede mostrar:

```text
Superbike (27)
Sport-Touring media (14)
```

---

# 18. Clasificación dentro de una marca

Cuando entras en una marca, `classification.js` crea:

```text
#brandClassificationFilters
```

con:

```text
Categoría
Subcategoría
Limpiar
```

## Funcionamiento

1. obtiene únicamente vehículos de la marca;
2. aplica categoría/subcategoría;
3. construye una nueva jerarquía temporal;
4. vuelve a renderizar:
   - timeline;
   - modelos;
   - generaciones;
   - contadores.

Esto significa que no es un simple `display:none`.

La navegación realmente se reconstruye usando el subconjunto filtrado.

---

# 19. Timeline

La timeline reside principalmente en `app.js`.

Funciones importantes:

```text
modelRange()
brandTimelineData()
timelineTicks()
brandInsights()
generationRange()
renderGenerationRows()
renderBrandTimeline()
bindTimelineInteractions()
```

## Estructura

Cada modelo tiene:

- barra global;
- año inicial/final;
- varias filas de generación.

Las generaciones utilizan exactamente la misma escala temporal.

## Modos

```text
Principales
Todos
```

`curateTimelineModels()` decide qué modelos mostrar en modo `Principales`.

El algoritmo tiene en cuenta:

- número de versiones;
- número de generaciones;
- longevidad;
- representación de épocas antiguas;
- representación de modelos recientes.

---

# 20. Tarjetas de vehículo

`cardHtml(v)` genera cada card.

V4.1 la extiende para añadir:

```text
Categoría
Subcategoría
```

como badges.

Además muestra:

- foto;
- tipo;
- años;
- nombre;
- marca;
- modelo/generación;
- potencia;
- peso;
- kg/CV;
- botones de ficha/comparador.

---

# 21. Ficha detallada

`openDetail(id)` abre:

```html
<dialog id="vehicleDialog">
```

La ficha contiene:

1. cabecera;
2. categoría/subcategoría;
3. especificaciones clave;
4. intervalo de precio en motos;
5. galería;
6. artículo;
7. valoraciones;
8. especificaciones agrupadas.

---

# 22. Grupos de especificaciones

`SPEC_GROUP_DEFS` clasifica los campos.

Actualmente incluye:

```text
Motor y transmisión
Dimensiones y peso
Chasis y parte ciclo
Prestaciones
Eficiencia y aerodinámica
Mercado y valor
Uso y homologación
Otros datos
```

Para mover una especificación basta añadir su nombre al array `keys` de otro grupo.

Ejemplo:

```javascript
{
  id:"engine",
  keys:[
    "Cilindrada",
    "Aspiración",
    "Potencia",
    "Par"
  ]
}
```

Si una especificación no está en ningún grupo, cae automáticamente en:

```text
Otros datos
```

---

# 23. Formateadores

Funciones relevantes:

```text
numericValue()
formatNumber()
formatKgCv()
formatCurrency()
formatDimensions()
formatSpecValue()
```

Centralizan:

- separadores de miles;
- decimales;
- unidades;
- precios.

Ejemplo:

```text
15000 → 15.000 €
1.926315 → 1,93 kg/CV
343 → 343 CV
```

Si añades una nueva especificación con unidad fija, añádela a:

```javascript
SPEC_UNITS
```

---

# 24. Aspiración

La función:

```javascript
aspirationLabel()
```

interpreta códigos:

```text
NA → Atmosférico
T → Turbo
TT → Biturbo
C → Compresor
T+C → Turbo + compresor
E → Eléctrico
```

Si añades un código nuevo, hazlo en el objeto `labels`.

---

# 25. Valoraciones de motos

`ratingHtml(v)` procesa:

```text
Valoración global
Sensaciones
Comodidad
Facilidad
Fiabilidad
Mantenimiento
Sonido
Estética
Ocupante
Carga
```

Las notas se consideran de:

```text
0 a 5
```

y generan una barra visual cuyo ancho es:

```javascript
(value / 5) * 100
```

---

# 26. Precio de motos

`motoPriceRangeText()` une:

```text
Precio mínimo
Precio máximo
```

en:

```text
5.000 – 6.000 €
```

El detalle se muestra con `priceRangeHtml()`.

---

# 27. Fotografías

## `vehicleCoverHtml()`

Muestra la foto 1 en la tarjeta.

## `detailGalleryHtml()`

Muestra una o dos fotografías en la ficha.

## `bindVehicleImages()`

Gestiona errores de carga.

Si una imagen no existe, evita dejar el icono roto.

---

# 28. Artículos Markdown

## `articleSectionHtml()`

Crea el bloque desplegable.

## `bindArticleLoader()`

El artículo **no se carga al abrir Motorpedia**.

Solo se solicita cuando el usuario despliega el `<details>`.

Esto es importante para escalabilidad.

3.000 artículos no implican descargar 3.000 textos en cada visita.

## `markdownToHtml()`

Es un parser Markdown ligero implementado en JavaScript.

Soporta:

```text
# / ## / ###
negrita
cursiva
código inline
listas
citas
enlaces
```

Si en el futuro los artículos se vuelven más complejos, sería mejor sustituirlo por una librería Markdown dedicada.

---

# 29. Comparador

Los IDs seleccionados se guardan en:

```javascript
selected = new Set()
```

Máximo:

```text
4 vehículos
```

`renderCompare()` crea dinámicamente una tabla con todas las especificaciones disponibles.

---

# 30. `styles.css`

Contiene el diseño principal:

- layout;
- cards;
- filtros;
- marcas;
- comparador;
- dialog;
- timeline;
- ficha técnica;
- ratings;
- fotos;
- artículos.

No utiliza framework CSS.

---

# 31. `classification.css`

Añade únicamente estilos de V4.1:

- filtros Categoría/Subcategoría;
- etiquetas;
- filtro de gama dentro de marcas;
- estados sin clasificación.

Está separado deliberadamente de `styles.css`.

---

# 32. GitHub Actions

Archivo:

```text
.github/workflows/update-motorpedia-data.yml
```

Se ejecuta en Ubuntu.

Pasos:

```text
Checkout
↓
Python 3.12
↓
python tools/import_excel.py
↓
git add JSON/CSV generados
↓
commit automático
↓
push
```

Permiso necesario:

```yaml
permissions:
  contents: write
```

Si falla al hacer push:

```text
Settings
→ Actions
→ General
→ Workflow permissions
```

debe permitir escritura.

---

# 33. GitHub Pages

Motorpedia es completamente estática.

GitHub Pages sirve directamente:

```text
index.html
JS
CSS
JSON
imágenes
Markdown
```

Por eso:

- no hay coste de backend;
- no hay servidor que mantener;
- no hay base de datos que administrar.

---

# 34. Cache busting

Las referencias incluyen versiones:

```text
styles.css?v=4
classification.css?v=4.1
app.js?v=4
classification.js?v=4.1
```

Esto fuerza al navegador a descargar archivos nuevos después de una actualización.

Cada actualización importante debería incrementar estas versiones.

---

# 35. Cómo añadir una nueva especificación

Supongamos que añadimos al Excel:

```text
Depósito
```

## Paso 1

Leerla en `import_excel.py`:

```python
"Depósito": r.get("Depósito"),
```

## Paso 2

Si tiene unidad:

```javascript
SPEC_UNITS["Depósito"] = "L";
```

## Paso 3

Añadirla al grupo correspondiente:

```javascript
SPEC_GROUP_DEFS
```

Por ejemplo:

```text
Dimensiones y peso
```

o crear un grupo nuevo.

No es necesario modificar cada card si el dato solo aparece en la ficha.

---

# 36. Cómo añadir un nuevo filtro

Arquitectura recomendada:

1. añadir el dato a `vehicles.json`;
2. crear un `<select>` o `<input>`;
3. leer su valor dentro de `applyFilters()`;
4. añadir una condición al `.filter(v => ...)`;
5. actualizar `clearFilters`;
6. si depende de contexto, crear una función similar a `syncCatalogClassificationOptions()`.

---

# 37. Cómo crear una nueva vista

La aplicación usa:

```javascript
showView(view)
```

Cada vista es una sección:

```html
<section id="xxxxView" class="view">
```

Para añadir una nueva:

1. crear sección en `index.html`;
2. crear botón `.nav[data-view]`;
3. crear renderizador JS;
4. añadir CSS.

No hace falta un router.

---

# 38. Cómo modificar la timeline

Las funciones principales están en este flujo:

```text
openBrand()
↓
renderBrandTimeline()
↓
brandTimelineData()
↓
renderGenerationRows()
↓
bindTimelineInteractions()
```

Los años se calculan usando las versiones reales de cada generación.

Por tanto, para corregir una barra temporal normalmente debes corregir:

```text
Inicio / Fin
```

o:

```text
Año
```

en el Excel, no tocar JS.

---

# 39. Código generado vs código fuente

## Código/datos que sí debes editar

```text
Base_de_Datos.xlsm
index.html
app.js
styles.css
classification.js
classification.css
tools/import_excel.py
motoTaxonomy.json
brandLogos.json
articles
images
```

## Archivos que normalmente NO debes editar manualmente

```text
data/vehicles.json
data/stats.json
data/content-index.csv
```

Son outputs del importador.

---

# 40. Estrategia segura para modificar Motorpedia

Antes de un cambio grande:

```text
1. Crear rama nueva
2. Modificar código
3. Probar localmente
4. Revisar consola del navegador
5. Hacer PR o merge
6. Comprobar GitHub Actions
7. Comprobar GitHub Pages
```

Para cambios pequeños puedes trabajar directamente sobre `main`, pero una rama reduce mucho el riesgo.

---

# 41. Depuración rápida

## La web queda vacía

Abrir:

```text
F12 → Console
```

Buscar errores JavaScript.

Después comprobar:

```text
Network → vehicles.json
```

Debe responder `200`.

## Los datos están antiguos

Hacer:

```text
Ctrl + F5
```

y revisar que los query strings hayan cambiado.

## Un vehículo no aparece

Buscar su ID en:

```text
data/vehicles.json
```

Si no existe, el problema está en el importador/Excel.

Si existe pero no aparece, el problema está en filtros/renderizado.

## Categoría no aparece

Revisar en `vehicles.json`:

```json
"category": "...",
"subcategory": "..."
```

Si están vacíos, revisar Excel/importador.

---

# 42. Riesgos técnicos actuales

Motorpedia funciona bien para su escala actual, pero existen algunas áreas que conviene conocer.

## Variables globales

`app.js` usa muchas variables y funciones globales.

Es sencillo, pero aumenta el acoplamiento.

## `classification.js` sobrescribe funciones

Es práctico para V4.1, pero puede ser frágil si se rehace `app.js`.

## Renderizado completo con `innerHTML`

Muchas vistas se reconstruyen completas.

Con 3.000 vehículos funciona, pero para decenas de miles podría ser conveniente:

- virtualización;
- paginación real;
- índices precalculados.

## Markdown parser casero

Adecuado para artículos simples.

No debe usarse para Markdown extremadamente complejo.

---

# 43. Mejoras arquitectónicas futuras recomendadas

Si Motorpedia sigue creciendo, el siguiente gran salto podría ser:

```text
V5
├── dividir app.js en módulos
├── data layer
├── UI components
├── filters
├── brands/timeline
├── compare
└── articles/media
```

Ejemplo:

```text
js/
├── main.js
├── data.js
├── filters.js
├── cards.js
├── brands.js
├── timeline.js
├── compare.js
└── detail.js
```

También podría convertirse a ES Modules:

```html
<script type="module" src="js/main.js"></script>
```

Sin necesidad de introducir React/Vue.

---

# 44. Principio de diseño que conviene mantener

Motorpedia se ha construido alrededor de estas prioridades:

```text
1. Gratis
2. Excel como fuente maestra
3. Importación masiva
4. Sin backend
5. Datos fáciles de corregir
6. Navegación visual
7. Contenido multimedia escalable
8. Código comprensible
```

Cualquier nueva funcionalidad debería intentar conservarlas.

---

# 45. Mapa mental final

```text
                    Base_de_Datos.xlsm
                            │
                            ▼
                  tools/import_excel.py
                            │
         ┌──────────────────┼─────────────────┐
         ▼                  ▼                 ▼
 vehicles.json          stats.json     content-index.csv
         │
         ▼
       app.js
         │
   ┌─────┼──────────────┬─────────────┐
   ▼     ▼              ▼             ▼
Cards  Marcas        Timeline      Comparador
   │
   └──────────► Ficha detallada ◄────────────┘
                    │
           ┌────────┴────────┐
           ▼                 ▼
      Fotografías        Artículos

classification.js
        │
        ├── filtros categoría/subcategoría
        ├── etiquetas
        └── filtrado dentro de marcas

styles.css
classification.css
        │
        ▼
     Diseño visual

GitHub Actions
        │
        ▼
  Regeneración automática

GitHub Pages
        │
        ▼
     Motorpedia
```

---

# 46. Regla para decidir dónde hacer un cambio

## El dato está mal

Modificar:

```text
Base_de_Datos.xlsm
```

## La clasificación de un vehículo está mal

Modificar:

```text
Marca / Modelo / Generación / Versión /
Categoría / Subcategoría
```

en el Excel.

## El JSON generado está mal

Modificar:

```text
tools/import_excel.py
```

## El filtro no funciona

Modificar:

```text
classification.js
```

o `app.js` si no pertenece a clasificación.

## La ficha se ve mal

Modificar:

```text
app.js
styles.css
classification.css
```

## La automatización falla

Modificar:

```text
.github/workflows/update-motorpedia-data.yml
tools/import_excel.py
```

## Las fotos/artículos no aparecen

Revisar:

```text
ID Motorpedia
rutas de assets
content-index.csv
```

---

# 47. Recomendación final de mantenimiento

Antes de modificar una función importante, identifica su capa:

```text
Excel → Importador → JSON → lógica JS → HTML → CSS
```

y cambia **la capa más cercana al origen del problema**.

Ejemplo:

Si un BMW E46 aparece como E36, no añadas un `if` en JavaScript.

Corrige:

```text
Generación = E46
```

en el Excel.

Esa separación es lo que permitirá seguir ampliando Motorpedia sin convertir el proyecto en una colección de excepciones.
