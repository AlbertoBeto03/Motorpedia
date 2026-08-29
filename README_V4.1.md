# Motorpedia V4.1 — Categorías y subcategorías

## Archivos a subir/reemplazar

- `index.html`
- `classification.js` (nuevo)
- `classification.css` (nuevo)
- `tools/import_excel.py`
- `.github/workflows/update-motorpedia-data.yml`

No reemplaces `app.js`, `styles.css`, logos, fotos ni artículos.

## Después de subir estos archivos

1. Sube a la raíz del repositorio la última base de datos, preferiblemente con el mismo nombre del archivo actual o como `Base_de_Datos.xlsm`.
2. El workflow `Update Motorpedia data` se ejecutará automáticamente al cambiar el Excel/XLSM.
3. También puedes ejecutarlo manualmente desde `Actions → Update Motorpedia data → Run workflow`.
4. Espera al commit automático de `data/vehicles.json`, `data/stats.json` y `data/content-index.csv`.
5. Espera al despliegue de GitHub Pages y recarga con `Ctrl + F5`.

## Qué añade V4.1

- Filtro `Categoría` en el catálogo general.
- Filtro dependiente `Subcategoría`.
- Los filtros se adaptan a tipo de vehículo y marca seleccionados.
- Al entrar en una marca con vehículos categorizados aparece un segundo bloque de filtros.
- La timeline y las tarjetas de modelos de una marca se recalculan según los filtros.
- Al pulsar una generación desde una marca filtrada, se mantienen categoría y subcategoría.
- Cada ficha/tarjeta muestra etiquetas visuales con Categoría y Subcategoría cuando existen.
- El buscador también encuentra coincidencias por Modelo, Generación, Versión, Categoría y Subcategoría.
- El importador V4.1 lee directamente la nueva estructura `ID / Marca / Modelo / Generación / Versión` de las hojas `Coches` y `Motos`.
- En motos importa las columnas `Categoría` y `Subcategoría` como campos de primer nivel.
- Si en el futuro añades `Categoría` y `Subcategoría` también a `Coches`, el importador las leerá automáticamente.

## Nota

La base adjuntada actualmente contiene categorías/subcategorías para las motos. Los coches todavía no tienen esas dos columnas, por lo que las etiquetas y filtros de clasificación solo afectarán a coches cuando esas columnas se añadan a la hoja `Coches`.
