# Motorpedia V4.4.1

## Precio como intervalo

La base de datos usa ahora dos columnas de precio, tanto en `Coches` como en `Motos`:

```text
Precio min | Precio max
```

La ficha y el comparador las fusionan en una sola fila **Precio** (bloque *Mercado y valor*) y en la banda **Valor** de la cabecera:

| Datos en el Excel | Se muestra |
|---|---|
| min y max distintos | `3.500 - 4.500 €` |
| min = max | `3.500 €` |
| solo min o solo max | `3.500 €` |
| vacío o texto (p. ej. `TBC`) | no se muestra precio |

Si min > max, se ordenan automáticamente. Los miles siempre llevan punto (`3.500`, no `3500`).

En el JSON, los coches ya no tienen `Precio actual`: tienen `Precio mínimo` y `Precio máximo` dentro de `specs`, igual que las motos. El campo `price` de nivel superior (usado por filtros y orden) toma el valor de `Precio min`. `Precio Original España` se mantiene como referencia aparte.

## Base de datos única

La fuente maestra es ahora **`Base_de_Datos.xlsm`**. El `.xlsx` se elimina del repositorio.

## Arreglo del workflow

`update-motorpedia-data.yml` vigilaba `Base de Datos.xlsx` (con espacios), un nombre que no existe, así que editar el Excel no regeneraba los datos. Ahora vigila `Base_de_Datos.xlsm`.

## Cambios técnicos

- `tools/import_excel.py`: lee `Precio min` / `Precio max` (acepta `Precio Actual` como alias de bases antiguas) y prioriza el `.xlsm`.
- `app.js`: `priceRangeText()` para coches y motos, `formatPriceNumber()` para el separador de miles.
- `specs.js`: fila única `Precio` en ficha y comparador.
- `index.html`: versión V4.4.1 y cache-busting actualizado.
