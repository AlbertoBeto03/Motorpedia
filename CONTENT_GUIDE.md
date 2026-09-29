# Motorpedia V4.4 — añadir vehículos, fotos y artículos

## Flujo normal

`Base_de_Datos.xlsx` es la fuente maestra.

Cuando sustituyes el Excel en GitHub, el workflow de V4 regenera automáticamente:

- `data/vehicles.json`
- `data/stats.json`
- `data/content-index.csv`

No tienes que volver a convertir el Excel manualmente.

## Estructura maestra V4.4

Las columnas estructurales ya están integradas directamente en las hojas:

```text
ID Motorpedia
Marca
Modelo
Generación
Versión
```

En `Coches`, los años se guardan en `Inicio` y `Fin`, y cilindrada/aspiración se separan en `CC / Asp` y `Aspiración`.

No añadas columnas alternativas tipo `Motorpedia Modelo` o `Motorpedia Generación`: corrige directamente las columnas estructurales.

---

# Añadir un vehículo

1. Añade la fila al Excel.
2. Sustituye `Base_de_Datos.xlsx` en la raíz del repositorio.
3. Commit.
4. Espera a que termine `Actions → Update Motorpedia data`.

El vehículo aparecerá automáticamente en Motorpedia.

Para motos con sucesiones comerciales especiales, puedes seguir afinando
`data/motoTaxonomy.json` como hasta ahora.

---

# Encontrar el ID exacto de cualquier versión

Abre:

`data/content-index.csv`

Puedes buscar por nombre y verás:

- ID;
- modelo y generación;
- carpeta exacta de fotos;
- ruta exacta del artículo;
- si ya hay fotos/artículo.

Este archivo es el índice de contenido de Motorpedia.

---

# Añadir hasta 2 fotos por versión

Supongamos:

Marca: BMW
ID: `bmw-m3-e46-2001`

Sube:

```text
assets/
└── vehicles/
    └── bmw/
        └── bmw-m3-e46-2001/
            ├── 1.webp
            └── 2.webp
```

La foto 1 se usa como imagen principal de la tarjeta y aparece en la cabecera de la ficha junto al nombre y las características principales.
Si existe foto 2, se accede mediante una flecha discreta en el mismo visor.

Formatos soportados:

1. `.webp`
2. `.png`
3. `.jpg`
4. `.jpeg`

Usa preferentemente **WebP** y nombres en minúsculas.

No hay que editar JSON.

Al hacer commit de una foto el workflow vuelve a ejecutarse y la detecta automáticamente.

---

# Artículo por versión: formato recomendado

Utiliza **un archivo Markdown `.md` por versión**.

Es el formato más conveniente para miles de artículos porque:

- es texto muy ligero;
- GitHub lo edita directamente;
- cada versión es independiente;
- no aumenta el tamaño de `vehicles.json`;
- Motorpedia descarga el artículo únicamente cuando el usuario lo despliega;
- es sencillo crear artículos en lote en el futuro.

Para el ejemplo anterior:

```text
content/
└── articles/
    └── bmw/
        └── bmw-m3-e46-2001.md
```

No necesitas YAML, front matter ni metadatos.
El archivo contiene únicamente el texto editorial.

Puedes copiar:

`content/articles/ARTICLE_TEMPLATE.md`

## Markdown soportado

```md
# Título
## Sección
### Subsección

Texto con **negrita**, *cursiva* y `código`.

- Lista
- Otro punto

1. Primero
2. Segundo

> Nota destacada.

[Enlace](https://ejemplo.com)
```

En la web aparecerá como un bloque **Artículo** plegado.
El texto no se descarga hasta que el usuario pulsa `Leer`.

---

# Actualización automática de GitHub

Workflow:

`.github/workflows/update-motorpedia-data.yml`

Se ejecuta cuando modificas:

- `Base_de_Datos.xlsx`;
- `tools/import_excel.py`;
- `assets/vehicles/**`;
- `content/articles/**`.

También puedes ejecutarlo manualmente desde GitHub Actions.

Si el workflow pudiera leer pero no hacer el commit generado, revisa:

`Settings → Actions → General → Workflow permissions`

y permite que los workflows escriban en el repositorio.

---

# Primera vez que instales V4

Sube todos los archivos incluidos en el paquete de V4.

El workflow se ejecutará y generará por primera vez los IDs nuevos.

Después abre:

`data/content-index.csv`

y a partir de ese momento puedes empezar a llenar fotos y artículos sin tocar el código.


---

# V4.2 — carga rápida de fotos

Además de la estructura por marca/ID, puedes subir directamente:

```text
assets/vehicles/_quick/<ID>-1.webp
assets/vehicles/_quick/<ID>-2.webp
```

El importador lo detecta automáticamente. La estructura organizada por carpetas tiene prioridad.

Consulta `README_FOTOS_VEHICULOS.md` para el procedimiento completo.


---

# V4.3 — visor de fotografías

La estructura de archivos no cambia.

La interfaz sí cambia:

```text
Tarjeta            → foto 1
Ficha abierta      → foto 1
Flecha de la ficha → foto 2
```

Si hay dos imágenes, la flecha alterna `1 → 2 → 1`.

V4.3 también resuelve las URLs respecto a la base de GitHub Pages y activa las iniciales de la marca únicamente tras un error real de carga.


---

# V4.4 — fichas técnicas completas

El navegador ya no depende de una selección reducida de especificaciones. El importador vuelca todos los campos técnicos con contenido y `specs.js` los organiza automáticamente en:

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

La misma organización se utiliza en la ficha individual y en el comparador.

Archivo Excel canónico:

```text
Base_de_Datos.xlsx
```
