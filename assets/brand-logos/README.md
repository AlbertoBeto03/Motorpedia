# Añadir o sustituir logos de marca

Motorpedia V2.2 prueba los logos en este orden:

1. `local` — tu archivo dentro del repositorio.
2. `colorUrl` — logo/fav-icon en color configurado automáticamente.
3. `url` — fallback anterior.
4. Iniciales de la marca.

## Ejemplo: añadir Voge

1. Sube:
   `assets/brand-logos/voge.png`

2. Abre `data/brandLogos.json`.

3. Busca `"Voge"` y deja:

```json
"Voge": {
  "local": "assets/brand-logos/voge.png",
  "colorUrl": "https://www.google.com/s2/favicons?domain=voge-global.com&sz=256"
}
```

No necesitas tocar `app.js`.

Preferencia de formatos:
- SVG para máxima calidad.
- PNG/WebP con fondo transparente si no tienes SVG.
