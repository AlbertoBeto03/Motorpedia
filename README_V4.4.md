# Motorpedia V4.4 — base normalizada y fichas técnicas completas

## Objetivo

V4.4 adapta Motorpedia a la nueva estructura de la hoja `Coches` y convierte la ficha técnica en una vista completa de todos los datos disponibles.

## Base maestra

El archivo canónico pasa a ser:

```text
Base_de_Datos.xlsx
```

El importador lo prioriza incluso si todavía existe una copia antigua `.xlsm` en la raíz.

## Estructura de coches

La base usa:

```text
Inicio | Fin
CC / Asp | Aspiración
```

- `Inicio` y `Fin` contienen años separados.
- `CC / Asp` contiene solo cilindrada.
- `Aspiración` contiene `Atmosférico`, `Turbo`, `Twin Turbo`, etc.
- una generación única se representa con `-`.
- la hoja `Motos` no se modifica.

## Ficha técnica

Nueva capa:

```text
specs.js
specs.css
```

`specs.js` organiza los datos en bloques y aplica unidades y nombres legibles. También reorganiza el comparador.

## Preservación de contenido existente

Como la nueva base cambia la forma de representar generación y años, el importador intenta conservar primero el ID ya publicado en `data/content-index.csv`.

Esto evita romper fotografías o artículos ya asociados a IDs anteriores.

El índice incorpora:

```text
excel_id
id
id_source
spec_count
```

Cuando `excel_id` y `id` son distintos, la ficha puede mostrar ambos para dejar clara la migración.

## Campos de coche soportados

V4.4 importa todos los campos actuales con contenido de la hoja `Coches`, incluyendo:

```text
⭐
Forza
CC / Asp
Aspiración
Motor
Comb
Potencia
Pot rpm
Par (Nm)
Par rpm
Limite rpm
Tracción
Peso (DIN)
Bat./Largo/Anch/Alto
Kg/Hp
0-100
80-120
400m
Vmax
100-0 (m)
Precio Actual
Precio Original España
Consumo homologado
Consumo real
Autovía
CO2 g/km
Eficiencia
Cx
SCx
ZePerfs
DeportivDIad
Pista
Tsukuba
Hockenheim S
Balocco
Auto Zeitung
MOTOR
VDIa util motor
Culata
Chasis
Susp del
Susp tras
Freno del
Freno tras
Neum del
Neum tras
Transmisión
Alimentación
Fecha
```

## Archivos de esta actualización

```text
Base_de_Datos.xlsx
index.html
specs.js
specs.css
tools/import_excel.py
.github/workflows/update-motorpedia-data.yml
README.md
README_V4.4.md
README_IMPORTAR_VEHICULOS.md
README_ARQUITECTURA_MOTORPEDIA.md
CONTENT_GUIDE.md
```

No es necesario sustituir `app.js`, `media.js`, `classification.js`, `experience.js` ni sus CSS correspondientes.
