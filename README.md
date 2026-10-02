# Motorpedia V4.4.1

Motorpedia es una enciclopedia estática de coches y motos construida sobre GitHub Pages.

La fuente maestra es:

```text
Base_de_Datos.xlsm
```

El Excel se transforma automáticamente en JSON mediante `tools/import_excel.py`. La web no usa backend ni base de datos SQL.

## Navegación

La portada separa cuatro áreas:

- **Coches**
- **Motos**
- **Marcas**
- **Comparador**

Los exploradores de coches y motos son independientes, por lo que las categorías específicas de moto no aparecen en coches.

## V4.4 — ficha técnica completa

La principal novedad de V4.4 es que la ficha ya no muestra una selección reducida de datos: publica todos los campos técnicos con contenido y los ordena en bloques coherentes.

```text
Identificación
Motor y transmisión
Dimensiones y peso
Chasis y parte ciclo
Prestaciones
Consumo, eficiencia y aerodinámica
Mercado y valor
Pruebas y referencias
```

Se muestran, cuando existen, datos como:

- cilindrada y aspiración por separado;
- arquitectura y código de motor;
- potencia y rpm de potencia;
- par y rpm de par;
- límite de revoluciones;
- transmisión y tracción;
- pesos y dimensiones;
- aceleración, recuperación, frenada y velocidad máxima;
- consumo homologado, real y de autovía;
- CO₂, Cx y SCx;
- chasis, suspensiones, frenos y neumáticos;
- precios;
- tiempos e índices de referencia;
- fecha de actualización.

El comparador utiliza el mismo orden de bloques.

## Base de datos V4.4

La hoja `Coches` utiliza ahora como formato de referencia:

```text
Inicio | Fin
CC / Asp | Aspiración
```

`CC / Asp` mantiene el nombre histórico de la columna, pero contiene únicamente la cilindrada.

Cuando un modelo solo tiene una generación, `Generación` utiliza `-` en lugar de `Gen 1`.

La hoja `Motos` conserva su estructura actual.

## Fotos y artículos

Fotos organizadas:

```text
assets/vehicles/<marca>/<ID>/1.webp
assets/vehicles/<marca>/<ID>/2.webp
```

Carga rápida:

```text
assets/vehicles/_quick/<ID>-1.webp
assets/vehicles/_quick/<ID>-2.webp
```

Artículos:

```text
content/articles/<marca>/<ID>.md
```

Consulta:

- `README_IMPORTAR_VEHICULOS.md`
- `README_FOTOS_VEHICULOS.md`
- `README_ARQUITECTURA_MOTORPEDIA.md`
- `CONTENT_GUIDE.md`

## Actualización automática

Al modificar `Base_de_Datos.xlsm`, fotografías, artículos o el importador, GitHub Actions ejecuta:

```text
.github/workflows/update-motorpedia-data.yml
```

y regenera:

```text
data/vehicles.json
data/stats.json
data/content-index.csv
```

No edites esos tres archivos manualmente para cambiar una ficha.
