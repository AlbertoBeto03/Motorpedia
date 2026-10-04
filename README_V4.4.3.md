# Motorpedia V4.4.3 — fotos compartidas con "ID Fotos"

La hoja `Coches` tiene una columna **ID Fotos**. Sirve para que varios vehículos usen las mismas fotos sin subirlas varias veces.

## Cómo funciona

- Si **ID Fotos** vale lo mismo que el **ID Motorpedia** del vehículo (o está vacío), el vehículo no comparte nada: usa solo sus fotos propias.
- Si **ID Fotos** tiene un valor distinto (un grupo, por ejemplo `car-BMW-Serie 1-F20`), todos los vehículos con ese mismo valor comparten las fotos del grupo.
- El grupo lo decides tú fila a fila, no depende de la generación. Un M135i F20 puede tener su propio ID Fotos y quedarse fuera del grupo de los 114i, 116i, 118i...

## Dónde se suben las fotos del grupo

Igual que las de un vehículo, usando el valor de ID Fotos como nombre:

| Tipo | Ruta |
|---|---|
| Carga rápida | `assets/vehicles/_quick/<ID Fotos>-1.webp` y `-2.webp` |
| Carpeta | `assets/vehicles/<marca>/<ID Fotos>/1.webp` y `2.webp` |

Ejemplo para el grupo `car-BMW-Serie 1-F20`:

```text
assets/vehicles/_quick/car-BMW-Serie 1-F20-1.webp
assets/vehicles/_quick/car-BMW-Serie 1-F20-2.webp
```

Los espacios del nombre pueden dejarse o cambiarse por guiones. Las reglas de caracteres no permitidos son las de V4.4.2.

## Prioridad

1. Fotos propias del vehículo (por su ID Motorpedia, luego por el ID publicado `car-xxxxx`).
2. Si no tiene ninguna, fotos del grupo.
3. Si tampoco hay, la ficha no muestra fotos.

Las dos fotos de una ficha salen siempre de la misma fuente: no se mezcla una propia con una del grupo. Si un vehículo tiene propias solo la foto 1, no completa la 2 con la del grupo.

Los artículos siguen siendo propios de cada vehículo y no se comparten.

## Comprobar el resultado

`data/content-index.csv` tiene dos columnas nuevas:

- `photo_group`: el grupo de ID Fotos del vehículo (vacío si no comparte).
- `photo_from`: de dónde salen sus fotos: `own` (propias), `group` (del grupo) o vacío (sin fotos).

## Otros cambios

- Motos: la hoja `Motos` no tiene la columna. Si la añades con el nombre **ID Fotos**, funciona igual.
- La versión visible de la web y el cache-busting pasan a V4.4.3.
- El importador elige la fuente de fotos por vehículo (no foto a foto), de forma coherente con lo anterior.
