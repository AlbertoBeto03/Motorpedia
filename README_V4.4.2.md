# Motorpedia V4.4.2 — fotos y artículos por ID del Excel

Los archivos se nombran con el **ID Motorpedia** de la columna del Excel (por ejemplo `car-BMW-Serie 1-F20-114i`), no con el ID publicado (`car-00684`).

| Qué | Dónde |
|---|---|
| Artículo | `content/articles/<marca>/<ID Excel>.md` |
| Fotos rápidas | `assets/vehicles/_quick/<ID Excel>-1.webp` y `-2.webp` |
| Fotos en carpeta | `assets/vehicles/<marca>/<ID Excel>/1.webp` y `2.webp` |

- La carpeta de marca va en minúsculas y con guiones (`bmw`, `alfa-romeo`).
- Los espacios del ID pueden dejarse o cambiarse por guiones: `car-BMW-Serie 1-F20-114i-1.webp` y `car-BMW-Serie-1-F20-114i-1.webp` valen igual.
- Los caracteres `/ \ : * ? " < > | # %` no se pueden usar en nombres de archivo; escríbelos como `-`.
- Distingue mayúsculas de minúsculas.
- Los nombres antiguos con el ID publicado (`car-00684`) siguen funcionando.

## IDs de Excel repetidos

Hay IDs que comparten varios vehículos (misma versión en años distintos). En ese caso, el primero en el orden de la hoja usa el ID tal cual y los siguientes añaden `__2`, `__3`...

```text
car-Alfa Romeo-147---1.9 JTD     -> 2006–2010 (primero en la hoja)
car-Alfa Romeo-147---1.9 JTD__2  -> 2001–2006
```

Si reordenas filas del Excel, el `__2` puede pasar a otro vehículo. Para esos casos el ID publicado es más estable.

`data/content-index.csv` muestra, para cada vehículo, el nombre de archivo esperado.
