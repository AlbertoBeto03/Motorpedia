# Motorpedia V4 — añadir vehículos, fotos y artículos

## Flujo normal

`Base de Datos.xlsx` sigue siendo la fuente maestra.

Cuando sustituyes el Excel en GitHub, el workflow de V4 regenera automáticamente:

- `data/vehicles.json`
- `data/stats.json`
- `data/content-index.csv`

No tienes que volver a convertir el Excel manualmente.

## Columnas opcionales que puedes añadir al FINAL del Excel

Puedes añadir sin modificar las columnas actuales:

- `Motorpedia ID`
- `Motorpedia Modelo`
- `Motorpedia Generación`

### Motorpedia ID

Recomendado para versiones a las que vas a añadir contenido.

Ejemplo:

`bmw-m3-e46-2001`

Debe ser único y conviene no cambiarlo después.

Si lo dejas vacío, Motorpedia genera un ID automáticamente utilizando nombre, años,
cilindrada, potencia, par y transmisión.

### Motorpedia Modelo / Motorpedia Generación

Permiten forzar la agrupación desde el Excel.

Ejemplo:

`Motorpedia Modelo = Serie 3`

`Motorpedia Generación = E46`

Tienen prioridad sobre la clasificación automática, incluso para motos.

---

# Añadir un vehículo

1. Añade la fila al Excel.
2. Sustituye `Base de Datos.xlsx` en la raíz del repositorio.
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

La foto 1 se usa como portada en el catálogo.
Las dos se muestran en la galería de la ficha.

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

- `Base de Datos.xlsx`;
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
