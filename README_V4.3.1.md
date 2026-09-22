# Motorpedia V4.3.1 — hotfix GitHub Pages

## Problema

Las fotografías subidas a:

`assets/vehicles/_quick/`

eran detectadas correctamente por `tools/import_excel.py` y aparecían en
`data/content-index.csv`, pero no se publicaban en GitHub Pages.

La causa es que GitHub Pages procesa por defecto el contenido con Jekyll y
Jekyll excluye las carpetas cuyo nombre empieza por `_`.

## Solución

Añadir este archivo en la raíz del repositorio:

`.nojekyll`

La estructura debe quedar así:

```text
Motorpedia/
├── .nojekyll
├── index.html
├── app.js
├── media.js
├── assets/
│   └── vehicles/
│       └── _quick/
│           ├── car-02017-1.webp
│           └── car-02017-2.webp
└── ...
```

No hay que renombrar `_quick`, ni las fotos, ni modificar `vehicles.json`.

Después del commit, espera a que GitHub Pages termine el nuevo despliegue y
recarga con `Ctrl + F5`.
