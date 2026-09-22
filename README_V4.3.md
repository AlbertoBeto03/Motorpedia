# Motorpedia V4.3 — fotografías visibles y visor integrado

V4.3 corrige y rehace la presentación de imágenes.

## Problema corregido

En V4/V4.2 la función de fallback podía comprobar una imagen `loading="lazy"` antes de que hubiera terminado de cargar:

```javascript
img.complete && img.naturalWidth === 0
```

En determinados casos eso hacía que Motorpedia:
- supiera correctamente que la ficha tenía 1 o 2 fotos;
- mostrara `2 fotos`;
- pero ocultara el `<img>` y enseñara las iniciales de la marca.

V4.3 elimina esa comprobación prematura.

El fallback se activa solo cuando el navegador emite un evento real `error`.

## Tarjetas

Si existe foto 1:

```text
v.media.images[0]
```

la imagen ocupa toda la parte visual de la tarjeta.

Las iniciales de la marca quedan únicamente para:
- fichas sin foto;
- un error real de carga.

## Ficha

La foto deja de aparecer como una galería independiente debajo de la cabecera.

Ahora forma parte de la primera pantalla de la ficha:

```text
Nombre / años / etiquetas  |  FOTO 1
Potencia / par / peso      |      ›
                           |    1/2
```

Si existe foto 2, una flecha discreta alterna:

```text
1 → 2 → 1
```

## Archivos nuevos

```text
media.js
media.css
```

Se añaden como una capa específica para multimedia para evitar seguir haciendo crecer `app.js`.

## Archivos modificados

```text
index.html
README_FOTOS_VEHICULOS.md
README_IMPORTAR_VEHICULOS.md
README_ARQUITECTURA_MOTORPEDIA.md
CONTENT_GUIDE.md
assets/vehicles/README.md
assets/vehicles/_quick/README.md
```

No cambia:
- el Excel;
- `tools/import_excel.py`;
- la estructura `_quick`;
- la estructura organizada;
- los IDs;
- categorías/subcategorías;
- exploradores V4.2.

## Orden de scripts

Debe mantenerse:

```html
<script src="app.js?v=4"></script>
<script src="media.js?v=4.3"></script>
<script src="classification.js?v=4.2"></script>
<script src="experience.js?v=4.2"></script>
```

## Prueba recomendada

La ficha de prueba:

```text
car-02017
Porsche 911 · 992 · GT3
```

debería utilizar:

```text
assets/vehicles/_quick/car-02017-1.webp
assets/vehicles/_quick/car-02017-2.webp
```

Resultado esperado:
1. la foto 1 aparece en la tarjeta;
2. la foto 1 aparece al abrir la ficha;
3. la flecha cambia a la foto 2;
4. una segunda pulsación vuelve a la foto 1.
