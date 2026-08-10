# Motorpedia

Base de datos interactiva personal de coches y motos.

## Arquitectura

`Base de Datos.xlsx` es la fuente maestra. La web no debe requerir introducir los vehículos manualmente.

```text
Base de Datos.xlsx
        ↓
Importador / normalizador
        ↓
data/
        ↓
Motorpedia
```

## Objetivos

- catálogo de coches y motos;
- búsqueda y filtros avanzados;
- fichas de vehículo;
- comparador;
- marcas, modelos, generaciones y timelines;
- fotografías;
- favoritos;
- rankings y estadísticas;
- despliegue gratuito mediante GitHub Pages.

## Estado

Fase 1 — estructura inicial del repositorio y despliegue.
