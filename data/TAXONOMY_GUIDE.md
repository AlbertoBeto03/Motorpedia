# Cómo corregir modelos y generaciones en Motorpedia

No hace falta tocar el Excel ni `app.js`.

Edita:

`data/taxonomy_overrides.json`

## Corregir un modelo

Ejemplo Toyota GR Supra y GR Yaris.

```json
"modelPrefixOverrides": {
  "Toyota": {
    "GR Supra": "Supra",
    "GR Yaris": "Yaris"
  }
}
```

Motorpedia mira el texto del vehículo después de la marca y usa la coincidencia de prefijo más larga.

Ejemplos:

- `Toyota GR Supra 3.0` → modelo `Supra`
- `Toyota GR Supra 3.0 Manual` → modelo `Supra`
- `Toyota GR Yaris 1.6` → modelo `Yaris`

Puedes añadir tantas reglas como quieras:

```json
"BMW": {
  "M3": "Serie 3"
}
```

## Corregir el nombre mostrado de una generación

Usa:

```json
"generationLabelOverrides": {
  "Toyota|Supra|A90": "A90 / J29"
}
```

Formato:

`Marca|Modelo|NombreActualDeGeneracion`

## Orden

Las generaciones se ordenan automáticamente por:
1. año inicial;
2. año final;
3. nombre.

## Generaciones sin código

Si una generación no tiene código en la base, Motorpedia muestra:

`Primera generación`

en lugar de `Sin especificar`.
