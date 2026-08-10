# Logos locales en Motorpedia V2.2.2

Motorpedia usa únicamente logos guardados dentro del propio repositorio.

## Método recomendado
Sube el archivo a `assets/brand-logos/` usando el nombre de la marca en minúsculas y sustituyendo espacios por guiones.

Ejemplos:
- BMW → `bmw.svg`
- Alfa Romeo → `alfa-romeo.svg`
- Aston Martin → `aston-martin.png`
- Royal Enfield → `royal-enfield.webp`
- Ascari → `ascari.png`
- Alpina → `alpina.png`

Motorpedia prueba automáticamente, en este orden:
1. `.svg`
2. `.png`
3. `.webp`
4. `.jpg`

Si no encuentra ninguno, muestra las iniciales de la marca.

## Cómo subir un logo nuevo desde GitHub
1. Abre tu repositorio `Motorpedia`.
2. Entra en `assets/brand-logos`.
3. Pulsa `Add file` → `Upload files`.
4. Arrastra el logo.
5. Pulsa `Commit changes`.
6. Espera a que GitHub Pages vuelva a desplegar la web.
7. Recarga con `Ctrl + F5`.

No necesitas modificar `app.js`, `styles.css` ni el Excel.

## Si quieres un nombre de archivo especial
Edita `data/brandLogos.json`.

Ejemplo:
```json
"Ascari": {
  "file": "assets/brand-logos/logo-ascari-oficial.png",
  "slug": "ascari"
}
```

La propiedad `file` tiene prioridad absoluta.

## Recomendaciones
- Preferible SVG: mantiene calidad a cualquier tamaño y pesa poco.
- PNG/WebP: usa fondo transparente.
- Para imágenes raster, 256–512 px suele ser suficiente.
- Usa nombres en minúsculas.
- Evita fondos blancos y márgenes enormes.

## Convención recomendada
```text
assets/
└── brand-logos/
    ├── abarth.svg
    ├── alfa-romeo.svg
    ├── alpina.png
    ├── alpine.svg
    ├── aprilia.svg
    ├── ascari.png
    ├── aston-martin.svg
    ├── audi.svg
    ├── bmw.svg
    ├── ducati.svg
    ├── ferrari.svg
    ├── ford.svg
    └── ...
```
