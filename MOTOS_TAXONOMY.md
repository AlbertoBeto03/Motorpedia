# Motorpedia V3 — Cómo agrupar motos por modelo y generación

Desde V3 las motos ya NO dependen de la clasificación que hubiese quedado grabada en
`vehicles.json`.

Motorpedia lee en cada carga:

`data/motoTaxonomy.json`

y construye la jerarquía:

**Marca → Modelo / familia → Generación → Versiones**

Esto significa que puedes cambiar una agrupación directamente desde GitHub y no necesitas
regenerar el Excel, `vehicles.json` ni `hierarchy.json`.

---

## 1. Ejemplo real: Aprilia RSV

En V3 he dejado toda la sucesión bajo el modelo/familia `RSV`:

```json
{
  "brand": "Aprilia",
  "model": "RSV",
  "generations": [
    {
      "name": "RSV Mille",
      "prefixes": ["RSV Mille"],
      "yearFrom": 1998,
      "yearTo": 2004
    },
    {
      "name": "RSV 1000 R",
      "prefixes": ["RSV 1000 R"],
      "yearFrom": 2004,
      "yearTo": 2009
    },
    {
      "name": "RSV4 I",
      "prefixes": ["RSV4"],
      "yearFrom": 2009,
      "yearTo": 2014
    }
  ]
}
```

Por tanto una ficha llamada:

`Aprilia RSV Mille`

termina en:

`Aprilia → RSV → RSV Mille`

y una:

`Aprilia RSV4 RR`

termina dentro de la misma familia `RSV`, pero en la generación que corresponda por nombre
y año.

---

## 2. Cómo unir motos con nombres distintos

Imagina que tienes:

- `Moto X 600`
- `Moto X 650`
- `Moto Y 700`

y tú sabes que forman una misma sucesión.

Crea un bloque:

```json
{
  "brand": "Marca",
  "model": "Familia X",
  "generations": [
    {
      "name": "600",
      "prefixes": ["Moto X 600"]
    },
    {
      "name": "650",
      "prefixes": ["Moto X 650"]
    },
    {
      "name": "700",
      "prefixes": ["Moto Y 700"]
    }
  ]
}
```

Aunque los nombres originales no coincidan, Motorpedia los mostrará dentro de una sola
tarjeta `Familia X`.

---

## 3. Varias versiones dentro de la misma generación

Ejemplo:

```json
{
  "name": "Primera generación",
  "prefixes": [
    "K 1600 GT",
    "K 1600 GTL",
    "K 1600 B"
  ]
}
```

Las tres fichas aparecen dentro de la misma generación.

---

## 4. Mismo nombre, distintas generaciones según el año

Esto es útil en motos como Kawasaki Ninja ZX-6R.

```json
{
  "name": "2009–2012",
  "prefixes": ["Ninja ZX-6R"],
  "yearFrom": 2009,
  "yearTo": 2012
},
{
  "name": "2019–2023",
  "prefixes": ["Ninja ZX-6R"],
  "yearFrom": 2019,
  "yearTo": 2023
}
```

Motorpedia utiliza el año de la ficha para elegir la generación correcta.

---

## 5. Cambio rápido sin tocar los grupos grandes

Arriba del JSON existe:

```json
"overrides": []
```

Es la forma más sencilla de corregir una ficha o un conjunto muy concreto.

Ejemplo:

```json
"overrides": [
  {
    "brand": "Aprilia",
    "prefix": "RSV4 1100 Factory",
    "model": "RSV4",
    "generation": "2ª generación"
  }
]
```

Los `overrides` tienen prioridad sobre todas las demás reglas.

También puedes usar años:

```json
{
  "brand": "Marca",
  "prefix": "Modelo",
  "model": "Modelo corregido",
  "generation": "3ª generación",
  "yearFrom": 2020,
  "yearTo": 2024
}
```

---

## 6. Separar RSV y RSV4 si prefieres hacerlo así

Ahora mismo V3 los une por criterio de sucesión.

Si prefieres tener:

- RSV
- RSV4

como dos modelos separados, divide el bloque en dos:

```json
{
  "brand": "Aprilia",
  "model": "RSV",
  "generations": [
    {"name": "RSV Mille", "prefixes": ["RSV Mille"]},
    {"name": "RSV 1000 R", "prefixes": ["RSV 1000 R"]}
  ]
},
{
  "brand": "Aprilia",
  "model": "RSV4",
  "generations": [
    {"name": "1ª generación", "prefixes": ["RSV4"], "yearFrom": 2009, "yearTo": 2014},
    {"name": "2ª generación", "prefixes": ["RSV4"], "yearFrom": 2015, "yearTo": 2020}
  ]
}
```

Eso es todo.

---

## 7. Cómo editarlo directamente en GitHub

1. Abre tu repositorio `Motorpedia`.
2. Entra en `data`.
3. Abre `motoTaxonomy.json`.
4. Pulsa el icono del lápiz **Edit this file**.
5. Modifica el grupo.
6. Pulsa **Commit changes**.
7. Espera unos segundos a GitHub Pages.
8. Recarga Motorpedia.

El archivo de taxonomía se solicita con un parámetro anti-caché, por lo que normalmente
no tendrás que cambiar el número de versión para probar una modificación.

---

## 8. ¿Y si una moto no está en ninguna regla?

Motorpedia aplica un fallback automático.

Por ejemplo:

`Yamaha MT-07 gen3`

se limpia a:

- Modelo: `MT-07`
- Generación: `3ª generación`

También elimina automáticamente sufijos habituales como:

- `gen2`, `gen3`, etc.
- `2gen`
- `restyling`
- `Euro4`, `Euro5`
- `ABS`
- `A2`

Las reglas manuales solo son necesarias cuando quieres dar criterio a una familia completa
o cuando el nombre comercial cambia entre generaciones.

---

## 9. Orden de generaciones

Todas las generaciones se ordenan automáticamente por:

1. año inicial;
2. año final;
3. nombre.

Nunca por orden alfabético salvo que no haya ningún año disponible.

---

## 10. Sobre hacerlo desde Excel

Para V3 he elegido `motoTaxonomy.json` porque es mucho más cómodo:

- cambias una línea en GitHub;
- no modificas las 292 fichas;
- no tienes que exportar el Excel;
- no tienes que regenerar JSON.

Más adelante podemos añadir al Excel columnas opcionales como:

- `Motorpedia_Modelo`
- `Motorpedia_Generacion`

y hacer que el importador las trate como prioridad absoluta. Pero para ajustes frecuentes de
familias y generaciones, el JSON de V3 es más rápido y seguro.
