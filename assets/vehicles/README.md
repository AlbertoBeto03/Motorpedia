# Fotografías de vehículos — Motorpedia V4.3

Hay dos formas compatibles de añadir hasta dos fotos por ficha:

## Carga rápida

```text
assets/vehicles/_quick/<ID>-1.webp
assets/vehicles/_quick/<ID>-2.webp
```

Es el método recomendado para cargas masivas.

## Estructura ordenada

```text
assets/vehicles/<marca>/<ID>/1.webp
assets/vehicles/<marca>/<ID>/2.webp
```

La estructura ordenada tiene prioridad si existen ambas.

Consulta la guía completa de la raíz:

`README_FOTOS_VEHICULOS.md`


## Visualización V4.3

- `foto 1`: portada de tarjeta + imagen principal de la ficha.
- `foto 2`: segunda imagen accesible desde la flecha del visor.

No hay que modificar JSON manualmente.
