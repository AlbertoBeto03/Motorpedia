# Logos locales de marcas

Motorpedia intenta cargar automáticamente algunos logos desde `data/brandLogos.json`.

Si un logo no aparece, aparece mal, o quieres sustituirlo por otro:

1. Consigue un archivo `.png`, `.webp` o `.svg` del logo.
2. Guárdalo en esta carpeta.
3. Usa un nombre simple, por ejemplo:
   - `bmw.svg`
   - `alfa-romeo.png`
   - `mercedes-benz.svg`
4. Abre `data/brandLogos.json`.
5. Para esa marca, sustituye o añade el campo `local`.

Ejemplo:

```json
"BMW": {
  "slug": "bmw",
  "url": "https://cdn.simpleicons.org/bmw",
  "local": "assets/brand-logos/bmw.svg"
}
```

Motorpedia usará primero `local`. Si no existe, intentará `url`.
Si ambos fallan, mostrará las iniciales de la marca.

Recomendación:
- SVG: preferible por calidad y poco peso.
- PNG/WebP: fondo transparente.
- Evita imágenes enormes; 256×256 o similar es suficiente para PNG/WebP.
