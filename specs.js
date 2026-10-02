/* Motorpedia V4.4.1 — ficha técnica completa y ordenada · precio como intervalo */
(() => {
  const baseFormatSpecValue = formatSpecValue;

  const GROUPS = [
    {
      id: "identity",
      title: "Identificación",
      subtitle: "Datos de ficha, producción y clasificación",
      keys: [
        "ID Motorpedia", "ID publicado", "Marca", "Modelo", "Generación", "Versión",
        "Inicio producción", "Fin producción", "Fecha de actualización",
        "Favorito", "Forza", "Categoría", "Subcategoría", "A2"
      ]
    },
    {
      id: "engine",
      title: "Motor y transmisión",
      subtitle: "Arquitectura, entrega de potencia y cadena cinemática",
      keys: [
        "Cilindrada", "Aspiración", "Arquitectura motor", "Cilindros", "Código motor",
        "Combustible", "Potencia", "RPM potencia", "Par", "RPM par",
        "Límite de revoluciones", "Culata", "Alimentación", "Transmisión",
        "Tracción", "Vida útil motor"
      ]
    },
    {
      id: "dimensions",
      title: "Dimensiones y peso",
      subtitle: "Masa, proporciones y ergonomía",
      keys: [
        "Peso DIN", "Peso en marcha", "Peso en seco", "Batalla / Largo / Ancho / Alto",
        "Altura asiento", "kg/CV", "Llanta"
      ]
    },
    {
      id: "chassis",
      title: "Chasis y parte ciclo",
      subtitle: "Estructura, suspensiones, frenos y neumáticos",
      keys: [
        "Chasis", "Suspensión delantera", "Suspensión trasera",
        "Freno delantero", "Freno trasero", "Neumático delantero", "Neumático trasero"
      ]
    },
    {
      id: "performance",
      title: "Prestaciones",
      subtitle: "Aceleración, recuperación, frenada y velocidad máxima",
      keys: ["0-100 km/h", "80-120 km/h", "400 m", "Velocidad máxima", "100-0 km/h"]
    },
    {
      id: "efficiency",
      title: "Consumo, eficiencia y aerodinámica",
      subtitle: "Uso real, homologación, emisiones y resistencia al avance",
      keys: ["Consumo homologado", "Consumo real", "Autovía", "Consumo", "CO₂", "Eficiencia", "Cx", "SCx"]
    },
    {
      id: "market",
      title: "Mercado y valor",
      subtitle: "Referencias económicas disponibles en la base",
      keys: ["Precio", "Precio original España"]
    },
    {
      id: "tests",
      title: "Pruebas y referencias",
      subtitle: "Índices y tiempos registrados en la base",
      keys: ["ZePerfs", "Deportividad", "Pista", "Tsukuba", "Hockenheim Short", "Balocco", "Auto Zeitung"]
    }
  ];

  const RATING_KEYS_V44 = new Set([
    "Valoración global", "Sensaciones", "Comodidad", "Facilidad", "Fiabilidad",
    "Mantenimiento", "Sonido", "Estética", "Ocupante", "Carga"
  ]);

  const PRICE_KEYS_V44 = new Set([
    "Precio actual", "Precio original España", "Precio mínimo", "Precio máximo"
  ]);

  // V4.4.1: "Precio mínimo" y "Precio máximo" se fusionan en una única fila "Precio"
  // con el formato "3.500 - 4.500 €" (ver priceRangeText en app.js).
  const isPriceBound = key => key === "Precio mínimo" || key === "Precio máximo";

  const FUEL_LABELS = {
    G: "Gasolina",
    D: "Diésel",
    E: "Eléctrico",
    GN: "Gas natural",
    HE: "Híbrido enchufable"
  };

  const DRIVETRAIN_LABELS = {
    MDTD: "Motor delantero · tracción delantera",
    MDTT: "Motor delantero · tracción trasera",
    MDT4: "Motor delantero · tracción total",
    MTTT: "Motor trasero · tracción trasera",
    MTT4: "Motor trasero · tracción total",
    MCTT: "Motor central · tracción trasera",
    MCT4: "Motor central · tracción total",
    METD: "Motor eléctrico delantero · tracción delantera",
    METT: "Motor eléctrico trasero · tracción trasera",
    MET4: "Motorización eléctrica · tracción total"
  };

  const unitValue = (value, unit, maxDecimals = 2) => {
    const n = numericValue(value);
    if (n === null) {
      const raw = String(value ?? "").trim();
      if (!raw) return "—";
      return raw.toLowerCase().includes(unit.toLowerCase()) ? raw : `${raw} ${unit}`;
    }
    return `${formatNumber(n, 0, maxDecimals)} ${unit}`;
  };

  formatSpecValue = function(key, value) {
    if (value === null || value === undefined || value === "") return "—";

    if (key === "Precio") return String(value);
    if (key === "Combustible") {
      const raw = String(value).trim();
      return FUEL_LABELS[raw] || raw;
    }
    if (key === "Tracción") {
      const raw = String(value).trim();
      return DRIVETRAIN_LABELS[raw] || raw;
    }
    if (key === "A2") {
      const raw = String(value).trim().toLowerCase();
      if (["si", "sí", "yes", "true", "1", "a2"].includes(raw)) return "Sí";
      if (["no", "false", "0"].includes(raw)) return "No";
      return String(value);
    }
    if (key === "Cilindrada") return unitValue(value, "cc", 0);
    if (key === "Potencia") return unitValue(value, "CV", 1);
    if (key === "Par") return unitValue(value, "Nm", 1);
    if (["RPM potencia", "RPM par", "Límite de revoluciones"].includes(key)) return unitValue(value, "rpm", 0);
    if (["Peso DIN", "Peso en marcha", "Peso en seco"].includes(key)) return unitValue(value, "kg", 0);
    if (key === "Altura asiento") return unitValue(value, "mm", 0);
    if (key === "kg/CV") return formatKgCv(value);
    if (key === "Batalla / Largo / Ancho / Alto") return formatDimensions(value);
    if (["0-100 km/h", "80-120 km/h", "400 m"].includes(key)) return unitValue(value, "s", 2);
    if (key === "Velocidad máxima") return unitValue(value, "km/h", 0);
    if (key === "100-0 km/h") return unitValue(value, "m", 2);
    if (["Consumo homologado", "Consumo real", "Autovía", "Consumo"].includes(key)) return unitValue(value, "L/100 km", 2);
    if (key === "CO₂") return unitValue(value, "g/km", 0);
    if (PRICE_KEYS_V44.has(key)) return formatCurrency(value);

    return baseFormatSpecValue(key, value);
  };

  function groupIdForKey(key) {
    for (const group of GROUPS) {
      if (group.keys.includes(key)) return group.id;
    }
    return "other";
  }

  groupedDetailSpecs = function(v) {
    const groups = new Map();
    GROUPS.forEach(group => groups.set(group.id, { ...group, entries: [] }));
    groups.set("other", {
      id: "other",
      title: "Otros datos",
      subtitle: "Información adicional disponible en la base",
      keys: [],
      entries: []
    });

    Object.entries(v?.specs || {}).forEach(([key, value]) => {
      // Las valoraciones de moto ya se muestran en su bloque visual específico.
      if (RATING_KEYS_V44.has(key)) return;
      if (isPriceBound(key)) return;
      const group = groups.get(groupIdForKey(key));
      group.entries.push({ key, value });
    });

    const priceText = priceRangeText(v);
    if (priceText) groups.get("market").entries.push({ key: "Precio", value: priceText });

    for (const group of groups.values()) {
      if (group.keys.length) {
        group.entries.sort((a, b) => group.keys.indexOf(a.key) - group.keys.indexOf(b.key));
      } else {
        group.entries.sort((a, b) => a.key.localeCompare(b.key, "es"));
      }
    }

    return [...groups.values()].filter(group => group.entries.length);
  };

  specGroupHtml = function(group) {
    const wide = group.entries.length >= 7 || ["engine", "chassis", "performance", "efficiency"].includes(group.id);
    return `<section class="specGroup ${wide ? "specGroupWide" : ""}" data-spec-group="${escapeAttr(group.id)}">
      <div class="specGroupHead">
        <div>
          <span class="specGroupKicker">${escapeHtml(group.title.toUpperCase())}</span>
          <h4>${escapeHtml(group.title)}</h4>
          <p>${escapeHtml(group.subtitle)}</p>
        </div>
        <span class="specGroupCount">${group.entries.length}</span>
      </div>
      <div class="specGroupRows">
        ${group.entries.map(({ key, value }) => `
          <div class="specRow">
            <span>${escapeHtml(key)}</span>
            <span>${escapeHtml(formatSpecValue(key, value))}</span>
          </div>`).join("")}
      </div>
    </section>`;
  };

  priceRangeHtml = function(v) {
    const band = (label, text) =>
      `<div class="priceBand"><span>${label}</span><strong>${escapeHtml(text)}</strong></div>`;

    const range = priceRangeText(v);
    if (range) return band("Valor", range);

    // Coches sin rango de mercado: se conserva el precio original como referencia.
    if (v?.type === "car") {
      const original = v.specs?.["Precio original España"];
      if (numericValue(original) !== null) return band("Precio original", formatCurrency(original));
    }
    return "";
  };

  // El comparador usa los mismos bloques y el mismo orden que la ficha individual.
  renderCompare = function(list) {
    $("#compareEmpty").style.display = list.length ? "none" : "block";
    if (!list.length) {
      $("#compareTableWrap").innerHTML = "";
      return;
    }

    const keys = [...new Set(list.flatMap(v => Object.keys(v.specs || {})))].filter(key => !isPriceBound(key));
    if (list.some(v => priceRangeText(v))) keys.push("Precio");
    const buckets = new Map();
    GROUPS.forEach(group => buckets.set(group.id, { ...group, keysFound: [] }));
    buckets.set("other", { id: "other", title: "Otros datos", keys: [], keysFound: [] });

    keys.forEach(key => {
      const id = groupIdForKey(key);
      buckets.get(id).keysFound.push(key);
    });

    const orderedGroups = [...buckets.values()].filter(group => group.keysFound.length);
    orderedGroups.forEach(group => {
      if (group.keys.length) {
        group.keysFound.sort((a, b) => group.keys.indexOf(a) - group.keys.indexOf(b));
      } else {
        group.keysFound.sort((a, b) => a.localeCompare(b, "es"));
      }
    });

    const body = orderedGroups.map(group => `
      <tr class="compareGroupRow"><td colspan="${list.length + 1}">${escapeHtml(group.title)}</td></tr>
      ${group.keysFound.map(key => `
        <tr>
          <td>${escapeHtml(key)}</td>
          ${list.map(v => `<td>${escapeHtml(key === "Precio" ? (priceRangeText(v) || "—") : formatSpecValue(key, v.specs?.[key]))}</td>`).join("")}
        </tr>`).join("")}
    `).join("");

    $("#compareTableWrap").innerHTML = `<table class="compareTable">
      <thead><tr><th>Especificación</th>${list.map(v => `<th>${escapeHtml(v.name)}<br><button class="removeCompare" data-id="${v.id}">Quitar</button></th>`).join("")}</tr></thead>
      <tbody>${body}</tbody>
    </table>`;

    $$(".removeCompare").forEach(button => button.addEventListener("click", () => toggleCompare(button.dataset.id)));
  };

  window.MotorpediaSpecs = { groups: GROUPS, version: "4.4.1" };
})();
