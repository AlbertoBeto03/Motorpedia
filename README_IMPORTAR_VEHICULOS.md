# Motorpedia V4.2 — Guía para importar nuevas fichas de vehículos

> Guía de uso para añadir coches y motos a Motorpedia sin tocar el código de la web.

## 1. Resumen rápido

La fuente maestra de Motorpedia es el Excel ubicado en la raíz del repositorio.

Actualmente el importador acepta estos nombres, por orden de prioridad:

1. `Base_de_Datos.xlsm`
2. `Base de Datos.xlsm`
3. `Base_de_Datos.xlsx`
4. `Base de Datos.xlsx`

**Recomendación:** mantener únicamente `Base_de_Datos.xlsm` en la raíz del repositorio para evitar cualquier ambigüedad.

El flujo normal es:

```text
Editar Base_de_Datos.xlsm
        ↓
Subir / hacer commit en GitHub
        ↓
GitHub Actions ejecuta tools/import_excel.py
        ↓
Se regeneran automáticamente:
  data/vehicles.json
  data/stats.json
  data/content-index.csv
        ↓
GitHub Pages publica la nueva Motorpedia
```

No debes editar manualmente `vehicles.json` para añadir vehículos.

---

# 2. Añadir un coche

Abre la hoja:

`Coches`

y añade una fila nueva siguiendo exactamente la estructura existente.

## Campos estructurales más importantes

Los campos que determinan dónde aparecerá el coche dentro de Motorpedia son:

| Campo | Uso en Motorpedia |
|---|---|
| `ID Motorpedia` | Identificador estable y único de la ficha |
| `Marca` | Fabricante |
| `Modelo` | Familia/modelo principal |
| `Generación` | Generación dentro del modelo |
| `Versión` | Variante concreta |
| `Inicio` | Primer año |
| `Fin` | Último año |

Ejemplo:

```text
ID Motorpedia: bmw-serie-3-e46-m3
Marca: BMW
Modelo: Serie 3
Generación: E46
Versión: M3
Inicio: 2000
Fin: 2006
```

Motorpedia generará aproximadamente esta jerarquía:

```text
BMW
└── Serie 3
    └── E46
        └── M3
```

## Categoría y subcategoría en coches

El importador ya está preparado para leer:

- `Categoría`
- `Subcategoría`

si estas columnas existen en la hoja `Coches`.

Por tanto, cuando decidas categorizar también los coches, no será necesario modificar el código.

---

# 3. Añadir una moto

Abre la hoja:

`Motos`

y añade una fila nueva.

La clasificación estructural utiliza:

| Campo | Uso |
|---|---|
| `ID Motorpedia` | Identificador estable |
| `Marca` | Fabricante |
| `Categoría` | Categoría general |
| `Subcategoría` | Clasificación específica |
| `Modelo` | Familia principal |
| `Generación` | Generación |
| `Versión` | Variante concreta |
| `Año` | Periodo de producción |

Ejemplo:

```text
ID Motorpedia: moto-aprilia-rsv-rsv4-iii-factory
Marca: Aprilia
Categoría: SPORT
Subcategoría: Superbike
Modelo: RSV
Generación: RSV4 III
Versión: Factory
Año: 2021 - 2024
```

En la web aparecerá como:

```text
Aprilia
└── RSV
    └── RSV4 III
        └── Factory
```

y además tendrá las etiquetas:

```text
SPORT
Superbike
```

---

# 4. Cómo rellenar correctamente `ID Motorpedia`

El ID es muy importante porque sirve para asociar:

- la ficha;
- las fotografías;
- el artículo;
- el registro de `content-index.csv`.

## Regla recomendada

Usa:

```text
tipo-marca-modelo-generacion-version
```

todo en minúsculas y separado por guiones.

Ejemplos:

```text
car-bmw-serie-3-e46-m3
car-porsche-911-997-carrera-s
moto-yamaha-mt-07-gen-4-standard
moto-aprilia-rsv-rsv4-iii-factory
```

Evita:

- espacios;
- tildes;
- `/`;
- paréntesis;
- cambiar el ID una vez añadido.

## ¿Qué ocurre si lo dejo vacío?

El importador puede generar un ID automáticamente a partir de:

- marca;
- modelo;
- generación;
- versión;
- años.

Además intenta conservar IDs antiguos utilizando `data/content-index.csv`.

Aun así, **para fichas definitivas es mejor asignar el ID manualmente**.

---

# 5. Marca, modelo, generación y versión: criterio recomendado

El objetivo es que cada nivel represente una cosa distinta.

## Marca

Fabricante:

```text
BMW
Aprilia
Toyota
Yamaha
```

## Modelo

Familia comercial que agrupa varias generaciones.

Ejemplos:

```text
BMW → Serie 3
Volkswagen → Golf
Aprilia → RSV
Triumph → Street Triple
```

No uses el nombre completo de la versión como modelo.

Mal:

```text
Modelo = RSV4 Factory 1100
```

Bien:

```text
Modelo = RSV
Generación = RSV4 IV
Versión = Factory 1100
```

## Generación

Una evolución importante del mismo modelo.

Ejemplos:

```text
BMW Serie 3 → E30 / E36 / E46
Volkswagen Golf → I / II / III / IV...
Yamaha MT-07 → 1ª generación / 2ª generación / 3ª generación...
```

## Versión

La variante concreta de esa generación:

```text
M3
330i
GTI
Factory
SP
ABS
Travel Pack
```

---

# 6. Categorías y subcategorías

En motos, ambas columnas forman parte directa de `vehicles.json`.

Ejemplo:

```text
Categoría: ADVENTURE
Subcategoría: Gran Adventure
```

La V4.2 las utiliza exclusivamente en contextos donde tienen sentido para motos:

- en el **Explorador de motos**;
- dentro de una marca cuando se selecciona la gama **Motos**;
- en el buscador de motos;
- y como etiquetas informativas en las fichas.

El Explorador de coches no muestra categorías de moto.

## Antes de crear una nueva subcategoría

Comprueba primero la hoja de categorías del Excel.

Crea una nueva solo cuando exista un grupo suficientemente diferenciado como para justificarlo.

Evita crear subcategorías para una sola versión si puede encajar correctamente en una ya existente.

---

# 7. Fotografías de una versión

La guía específica y más actualizada está en:

`README_FOTOS_VEHICULOS.md`

V4.2 admite tanto la estructura ordenada por carpetas como una carga rápida en `assets/vehicles/_quick/`.

## Estructura ordenada

Motorpedia admite hasta **2 fotografías locales por ficha**.

Primero localiza el ID del vehículo.

Ejemplo:

```text
moto-yamaha-mt-07-gen-4-standard
```

La carpeta debe ser:

```text
assets/
└── vehicles/
    └── yamaha/
        └── moto-yamaha-mt-07-gen-4-standard/
            ├── 1.webp
            └── 2.webp
```

## Prioridad de formatos

Motorpedia busca:

1. `.webp`
2. `.png`
3. `.jpg`
4. `.jpeg`

### Recomendación

Usa:

```text
1.webp
2.webp
```

La imagen `1` se utiliza como portada en las tarjetas.

Las imágenes `1` y `2` aparecen en la galería de la ficha.

No debes indicar las rutas manualmente en el Excel.

---

# 8. Añadir un artículo

Los artículos se guardan en Markdown y se cargan únicamente cuando el usuario pulsa `Leer`.

Para un vehículo con ID:

```text
car-bmw-serie-3-e46-m3
```

crea:

```text
content/articles/bmw/car-bmw-serie-3-e46-m3.md
```

Puedes partir de:

```text
content/articles/ARTICLE_TEMPLATE.md
```

## Estructura recomendada

```markdown
# Historia y contexto

Introducción de la versión.

## Desarrollo y evolución

Origen, cambios y contexto histórico.

## Técnica y sensaciones

Motor, comportamiento, carácter, puntos fuertes y débiles.

## Mercado y legado

Recepción, rivales, mercado usado y relevancia histórica.

## Fuentes / notas

- Referencia 1
- Referencia 2
```

No hace falta repetir en el artículo:

- potencia;
- peso;
- años;
- marca;
- precio;

porque esos datos proceden del Excel.

---

# 9. Qué hace GitHub automáticamente

El workflow se encuentra en:

```text
.github/workflows/update-motorpedia-data.yml
```

Se activa cuando cambia:

```text
Base de Datos.xlsx
Base de Datos.xlsm
Base_de_Datos.xlsx
Base_de_Datos.xlsm
assets/vehicles/**
content/articles/**
```

También se puede lanzar manualmente:

```text
GitHub
→ Actions
→ Update Motorpedia data
→ Run workflow
```

El workflow ejecuta:

```bash
python tools/import_excel.py
```

y después hace commit de:

```text
data/vehicles.json
data/stats.json
data/content-index.csv
```

---

# 10. Cómo comprobar que una importación ha funcionado

Después de subir el Excel:

1. entra en **GitHub → Actions**;
2. abre `Update Motorpedia data`;
3. espera a que aparezca el icono verde;
4. comprueba que se ha creado un commit automático:
   `chore: rebuild Motorpedia data`;
5. abre `data/content-index.csv`;
6. busca la ficha nueva;
7. espera al despliegue de GitHub Pages;
8. recarga Motorpedia con `Ctrl + F5`.

---

# 11. `content-index.csv`: el índice maestro

Este archivo se genera automáticamente y sirve para localizar contenido.

Entre sus campos están:

```text
signature
id
id_source
type
brand
category
subcategory
model
generation
version
name
photo_folder
photo_1
photo_2
article_file
article_exists
```

Es especialmente útil para encontrar:

- el ID real de una ficha;
- dónde subir las fotos;
- dónde crear el artículo;
- si ya existe contenido editorial.

No lo edites manualmente como fuente principal: el workflow puede volver a generarlo.

---

# 12. Errores frecuentes

## El vehículo no aparece

Comprueba:

- que `Marca` no esté vacía;
- que `Modelo` no esté vacío;
- que la fila esté en `Coches` o `Motos`;
- que el workflow haya terminado correctamente.

## Aparece en una generación equivocada

Ahora la clasificación principal viene directamente del Excel.

Corrige:

```text
Modelo
Generación
Versión
```

y vuelve a subir el Excel.

## Dos vehículos tienen el mismo ID

Cada ficha debe tener un `ID Motorpedia` único.

Cambia uno de ellos.

## La foto no aparece

Comprueba:

- slug de la marca;
- ID exacto;
- nombre `1.webp` o `2.webp`;
- que el workflow se haya ejecutado después de subir la foto.

## El artículo no aparece

La ruta tiene que ser exactamente:

```text
content/articles/<marca>/<ID>.md
```

y el workflow debe volver a generar `vehicles.json`.

## El workflow utiliza el Excel equivocado

Mantén **una única base de datos principal** en la raíz.

Recomendación:

```text
Base_de_Datos.xlsm
```

---

# 13. Checklist para añadir una nueva ficha

```text
[ ] Añadir fila al Excel
[ ] Rellenar ID Motorpedia
[ ] Rellenar Marca
[ ] Rellenar Modelo
[ ] Rellenar Generación
[ ] Rellenar Versión
[ ] Rellenar años
[ ] Rellenar Categoría/Subcategoría si corresponde
[ ] Añadir especificaciones disponibles
[ ] Guardar Excel
[ ] Subir Base_de_Datos.xlsm
[ ] Comprobar GitHub Actions
[ ] Comprobar content-index.csv
[ ] Añadir foto 1.webp
[ ] Añadir foto 2.webp opcional
[ ] Añadir artículo .md opcional
[ ] Verificar la ficha en Motorpedia
```

---

# 14. Regla fundamental

La arquitectura está pensada para que:

```text
EXCEL = datos maestros
JSON = datos generados
GitHub = automatización y almacenamiento
HTML/CSS/JS = interfaz
```

Por tanto, para añadir o corregir vehículos:

**modifica el Excel, no `vehicles.json`.**


---

# 15. Navegación V4.2

La portada separa cuatro accesos: **Coches / Motos / Marcas / Comparador**.

- Las nuevas fichas de coche aparecen automáticamente en el Explorador de coches.
- Las nuevas fichas de moto aparecen automáticamente en el Explorador de motos.
- Categoría/Subcategoría se aplican solo al explorador de motos.
- En marcas mixtas (por ejemplo BMW o Honda), primero se puede elegir Todo/Coches/Motos; los filtros de categoría aparecen solo al elegir Motos.
- Ambos exploradores permiten filtrar fichas con foto o artículo.
