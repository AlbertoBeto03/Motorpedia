# Motorpedia V4.4.4 — sin ID internos y valor en las tarjetas

## ID fuera de las fichas

`ID Motorpedia` e `ID publicado` ya no aparecen en la ficha detallada ni en el comparador. Tampoco se publican dentro de `data/vehicles.json`: el importador ya no los escribe en `specs`.

Siguen existiendo donde hacen falta:

- En el Excel (columnas `ID Motorpedia` e `ID Fotos`), que es de donde salen los nombres de fotos y artículos.
- En `data/content-index.csv` (columnas `id` y `excel_id`), que usa el importador para conservar los ID publicados.
- Como `id` de cada vehículo en `vehicles.json`, necesario para abrir fichas y comparar.

Si en el futuro un `vehicles.json` antiguo incluyera esos campos, la web también los oculta.

## Valor en la vista previa

Cada tarjeta muestra ahora el valor entre las tres mini-métricas y los botones:

| Datos | Se muestra |
|---|---|
| Precio min y max distintos | `Valor 3.500 - 4.500 €` |
| min = max, o solo uno | `Valor 3.500 €` |
| Coche sin intervalo, con precio original | `Precio original 21.750 €` |
| Ningún precio | no se muestra bloque |

El criterio es el mismo que el del banner de la ficha, que ahora comparte la función `priceBandParts()` con la tarjeta.

## Otros cambios

- `vehicles.json` baja de 3077 KB a 2855 KB (de 296 KB a 272 KB comprimido).
- `content-index.csv` cambia en todas las filas porque la columna `spec_count` baja en 2 (ya no cuenta los ID).
- Versión visible y cache-busting pasan a V4.4.4.
