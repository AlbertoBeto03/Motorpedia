# Motorpedia V2

Motorpedia convierte `Base de Datos.xlsx` en una base de datos visual de automoción.

## Novedades V2

- Logos de fabricantes con fallback automático.
- Navegación jerárquica **Marca → Modelo → Generación → Versión**.
- 3058 vehículos clasificados.
- BMW agrupado en familias como Serie 1, Serie 3, Z3, Z4, X3...
- Volkswagen agrupado en Golf, Passat, Polo, Scirocco... y generaciones I/II/III/IV/V/VI/VII/VIII cuando están en el nombre.
- Arquitectura genérica para códigos entre paréntesis: E46, 8P, 997, etc.
- `data/taxonomy_overrides.json` preparado para corregir casos especiales sin modificar el Excel.

## Datos

La clasificación es automática y deliberadamente conservadora. Las excepciones se irán refinando marca por marca en siguientes versiones.

`Base de Datos.xlsx` sigue siendo la fuente maestra.
