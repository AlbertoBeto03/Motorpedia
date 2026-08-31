# Motorpedia V4.2 — Guía completa para añadir fotos

Motorpedia admite **hasta 2 fotos locales por cada ficha**. No hay que editar `vehicles.json` ni escribir rutas en el Excel.

La asociación se hace únicamente mediante el **ID Motorpedia**.

---

## Método A — carga rápida (recomendado para muchas fotos)

Este es el método nuevo de V4.2.

Busca el ID exacto del vehículo en:

`data/content-index.csv`

Si el ID es:

`car-bmw-serie-3-e46-m3`

sube directamente a:

```text
assets/vehicles/_quick/
├── car-bmw-serie-3-e46-m3-1.webp
└── car-bmw-serie-3-e46-m3-2.webp
```

Eso es todo.

No tienes que crear carpeta de marca ni carpeta del vehículo.

### Ventaja

Para cargar 200 coches puedes preparar 400 imágenes en tu PC, renombrarlas con el ID y arrastrarlas todas a `assets/vehicles/_quick/`.

---

## Método B — estructura ordenada por vehículo

Sigue siendo totalmente compatible y tiene prioridad sobre el método rápido.

```text
assets/vehicles/
└── bmw/
    └── car-bmw-serie-3-e46-m3/
        ├── 1.webp
        └── 2.webp
```

Este método es mejor si quieres mantener el repositorio perfectamente ordenado a largo plazo.

---

## Qué foto se usa para qué

`1.webp` o `ID-1.webp`:
- portada de la tarjeta;
- primera imagen de la ficha.

`2.webp` o `ID-2.webp`:
- segunda imagen de la galería.

Puedes tener solo la foto 1.

---

## Formatos admitidos

Motorpedia busca por este orden:

1. `.webp`
2. `.png`
3. `.jpg`
4. `.jpeg`

Para una biblioteca grande se recomienda **WebP**.

### Tamaño recomendado

- relación aproximada: 16:9, 3:2 o similar;
- anchura: 1200–1800 px;
- calidad WebP: aproximadamente 75–85 %;
- intenta mantener cada imagen por debajo de 300–500 kB cuando sea posible.

No es obligatorio que las dos fotografías tengan exactamente las mismas dimensiones, pero visualmente queda mejor.

---

## Prioridad si existen las dos estructuras

Para cada número de foto Motorpedia busca primero:

`assets/vehicles/<marca>/<ID>/1.webp`

y después:

`assets/vehicles/_quick/<ID>-1.webp`

Por tanto puedes usar `_quick` para empezar y, más adelante, mover las fotos importantes a su estructura organizada sin modificar código.

---

## Cómo encontrar el ID

Abre:

`data/content-index.csv`

Busca el nombre del vehículo. Las columnas V4.2 incluyen:

- `id`
- `photo_folder`
- `quick_photo_1`
- `quick_photo_2`
- `photo_mode`
- `photo_1`
- `photo_2`

`photo_mode` indica:

- `folder`: fotos encontradas en la estructura ordenada;
- `quick`: fotos encontradas en `_quick`;
- `mixed`: una foto procede de cada sistema;
- vacío: todavía no hay fotos.

---

## Después de subir las fotos

No edites ningún JSON.

Al hacer commit dentro de `assets/vehicles/**`, GitHub Actions ejecuta automáticamente:

```text
Update Motorpedia data
```

El importador vuelve a detectar las imágenes y actualiza:

- `data/vehicles.json`
- `data/stats.json`
- `data/content-index.csv`

Cuando termine el workflow y GitHub Pages se despliegue, recarga la web.

---

## Filtro «Contenido» de V4.2

Los exploradores de coches y motos incluyen:

```text
Contenido
├── Todo
├── Con foto
├── Con artículo
└── Foto + artículo
```

Esto sirve para revisar rápidamente qué fichas ya tienen contenido enriquecido.

---

## Errores habituales

### La foto no aparece

Comprueba:
1. que el ID coincide exactamente con `content-index.csv`;
2. que la foto termina en `-1.webp` / `1.webp`;
3. que está dentro de la carpeta correcta;
4. que el workflow ha terminado en verde;
5. que has esperado al despliegue de GitHub Pages.

### Tengo `ID-2.webp` pero no `ID-1.webp`

Motorpedia puede detectar la segunda, pero no es una estructura recomendable. Usa siempre foto 1 como imagen principal.

### He cambiado el ID del Excel

Las fotos antiguas dejan de corresponder con la ficha. El `ID Motorpedia` debe considerarse permanente una vez que una ficha tenga fotos o artículo.

---

## Flujo recomendado para cientos de fotos

```text
1. Actualizar Excel
2. Esperar al workflow
3. Descargar/abrir data/content-index.csv
4. Preparar imágenes en el PC
5. Renombrar: <ID>-1.webp y <ID>-2.webp
6. Subir todas a assets/vehicles/_quick/
7. Commit
8. Esperar workflow + Pages
9. Usar el filtro «Con foto» para revisar
```
