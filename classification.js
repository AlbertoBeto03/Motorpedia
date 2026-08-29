/* Motorpedia V4.1 — filtros por categoría/subcategoría y etiquetas informativas */
(() => {
  let brandCategoryFilter = "";
  let brandSubcategoryFilter = "";
  let currentBrandForClassification = "";

  const originalCardHtml = cardHtml;
  const originalOpenDetail = openDetail;
  const originalOpenBrand = openBrand;
  const originalOpenGeneration = openGeneration;

  const classValue = value => String(value ?? "").trim();
  const hasClassification = v => Boolean(classValue(v?.category) || classValue(v?.subcategory));
  const matchesClassification = (v, category, subcategory) => {
    if (category && classValue(v?.category) !== category) return false;
    if (subcategory && classValue(v?.subcategory) !== subcategory) return false;
    return true;
  };

  function optionCounts(source, key) {
    const counts = new Map();
    source.forEach(v => {
      const value = classValue(v?.[key]);
      if (!value) return;
      counts.set(value, (counts.get(value) || 0) + 1);
    });
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0], "es"));
  }

  function fillSelect(select, rows, selected, allLabel) {
    if (!select) return "";
    const values = new Set(rows.map(([value]) => value));
    const keep = values.has(selected) ? selected : "";
    select.innerHTML = `<option value="">${escapeHtml(allLabel)}</option>` + rows.map(([value, count]) =>
      `<option value="${escapeAttr(value)}">${escapeHtml(value)} (${count})</option>`
    ).join("");
    select.value = keep;
    select.disabled = rows.length === 0;
    return keep;
  }

  function classificationTagsHtml(v, context = "card") {
    const category = classValue(v?.category);
    const subcategory = classValue(v?.subcategory);
    if (!category && !subcategory) return "";
    return `<div class="classificationTags classificationTags-${context}">
      ${category ? `<span class="classificationTag categoryTag">${escapeHtml(category)}</span>` : ""}
      ${subcategory ? `<span class="classificationTag subcategoryTag">${escapeHtml(subcategory)}</span>` : ""}
    </div>`;
  }

  function ensureCatalogClassificationFilters() {
    if ($("#categoryFilter")) return;
    const filters = document.querySelector("#catalogView .filters");
    const minPowerLabel = $("#minPower")?.closest("label");
    if (!filters || !minPowerLabel) return;

    const categoryLabel = document.createElement("label");
    categoryLabel.className = "classificationFilterLabel";
    categoryLabel.innerHTML = `Categoría<select id="categoryFilter"><option value="">Todas</option></select>`;

    const subcategoryLabel = document.createElement("label");
    subcategoryLabel.className = "classificationFilterLabel";
    subcategoryLabel.innerHTML = `Subcategoría<select id="subcategoryFilter"><option value="">Todas</option></select>`;

    filters.insertBefore(categoryLabel, minPowerLabel);
    filters.insertBefore(subcategoryLabel, minPowerLabel);

    $("#categoryFilter").addEventListener("change", () => {
      visible = 48;
      syncCatalogClassificationOptions();
      applyFilters();
    });
    $("#subcategoryFilter").addEventListener("change", () => {
      visible = 48;
      applyFilters();
    });

    // Se ejecuta antes del listener original de "Limpiar" para que su applyFilters()
    // ya vea los filtros nuevos vacíos.
    $("#clearFilters")?.addEventListener("click", () => {
      if ($("#categoryFilter")) $("#categoryFilter").value = "";
      if ($("#subcategoryFilter")) $("#subcategoryFilter").value = "";
    }, true);
  }

  function catalogScopeVehicles() {
    const brand = $("#brandFilter")?.value || "";
    return vehicles.filter(v => {
      if (typeFilter !== "all" && v.type !== typeFilter) return false;
      if (brand && v.brand !== brand) return false;
      return true;
    });
  }

  function syncCatalogClassificationOptions() {
    ensureCatalogClassificationFilters();
    const categorySelect = $("#categoryFilter");
    const subcategorySelect = $("#subcategoryFilter");
    if (!categorySelect || !subcategorySelect) return;

    const oldCategory = categorySelect.value;
    const oldSubcategory = subcategorySelect.value;
    const scope = catalogScopeVehicles();
    const category = fillSelect(categorySelect, optionCounts(scope, "category"), oldCategory, "Todas");
    const subSource = category ? scope.filter(v => classValue(v.category) === category) : scope;
    fillSelect(subcategorySelect, optionCounts(subSource, "subcategory"), oldSubcategory, "Todas");

    const available = scope.some(hasClassification);
    categorySelect.closest("label")?.classList.toggle("classificationUnavailable", !available);
    subcategorySelect.closest("label")?.classList.toggle("classificationUnavailable", !available);
  }

  // Sustituye el filtro general manteniendo el resto del comportamiento de Motorpedia.
  applyFilters = function() {
    syncCatalogClassificationOptions();
    const q = $("#search").value.trim().toLowerCase();
    const brand = $("#brandFilter").value;
    const category = $("#categoryFilter")?.value || "";
    const subcategory = $("#subcategoryFilter")?.value || "";
    const minP = Number($("#minPower").value) || 0;
    const minY = Number($("#minYear").value) || 0;

    let arr = vehicles.filter(v => {
      if (typeFilter !== "all" && v.type !== typeFilter) return false;
      if (brand && v.brand !== brand) return false;
      if (!matchesClassification(v, category, subcategory)) return false;
      if (q) {
        const haystack = `${v.name} ${v.brand} ${v.model || ""} ${v.generation || ""} ${v.version || ""} ${v.category || ""} ${v.subcategory || ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      const p = num(v.power);
      if (minP && (p === null || p < minP)) return false;
      if (minY && (!v.yearEnd || v.yearEnd < minY)) return false;
      return true;
    });

    const sort = $("#sort").value;
    arr.sort((a, b) => {
      if (sort === "powerDesc") return (num(b.power) ?? -1) - (num(a.power) ?? -1);
      if (sort === "weightAsc") return (num(a.weight) ?? 999999) - (num(b.weight) ?? 999999);
      if (sort === "kgcvAsc") return (num(a.kgcv) ?? 999999) - (num(b.kgcv) ?? 999999);
      if (sort === "yearDesc") return (b.yearStart ?? -1) - (a.yearStart ?? -1);
      return a.name.localeCompare(b.name, "es");
    });

    currentResults = arr;
    renderResults();

    const typeLabel = {all: "Todos los vehículos", car: "Coches", moto: "Motos"}[typeFilter];
    const parts = [brand || typeLabel];
    if (category) parts.push(category);
    if (subcategory) parts.push(subcategory);
    $("#resultContext").textContent = parts.join(" · ");
  };

  function buildHierarchyForList(source) {
    const tree = new Map();
    source.forEach(v => {
      const brand = v.brand || "Sin marca";
      const model = v.model || "Otros";
      const raw = String(v.generation || "Sin especificar");
      if (!tree.has(brand)) tree.set(brand, new Map());
      const models = tree.get(brand);
      if (!models.has(model)) models.set(model, new Map());
      const gens = models.get(model);
      if (!gens.has(raw)) gens.set(raw, []);
      gens.get(raw).push(v);
    });

    const result = [];
    for (const [brand, models] of tree) {
      const modelItems = [];
      for (const [model, gens] of models) {
        const genItems = [];
        for (const [raw, members] of gens) {
          const starts = members.map(v => v.yearStart).filter(Number.isFinite);
          const ends = members.map(v => Number.isFinite(v.yearEnd) ? v.yearEnd : v.yearStart).filter(Number.isFinite);
          genItems.push({
            name: (!raw || raw === "Sin especificar") ? "Primera generación" : raw,
            rawName: raw,
            count: members.length,
            vehicleIds: members.map(v => v.id),
            yearStart: starts.length ? Math.min(...starts) : null,
            yearEnd: ends.length ? Math.max(...ends) : null,
          });
        }
        genItems.sort((a, b) =>
          (a.yearStart ?? 9999) - (b.yearStart ?? 9999) ||
          (a.yearEnd ?? 9999) - (b.yearEnd ?? 9999) ||
          a.name.localeCompare(b.name, "es")
        );
        modelItems.push({
          name: model,
          count: genItems.reduce((sum, g) => sum + g.count, 0),
          generations: genItems,
        });
      }
      modelItems.sort((a, b) => a.name.localeCompare(b.name, "es"));
      result.push({brand, count: modelItems.reduce((sum, m) => sum + m.count, 0), models: modelItems});
    }
    return result;
  }

  function ensureBrandClassificationFilters() {
    let wrap = $("#brandClassificationFilters");
    if (wrap) return wrap;
    const header = $("#brandHeader");
    if (!header) return null;
    wrap = document.createElement("div");
    wrap.id = "brandClassificationFilters";
    wrap.className = "brandClassificationFilters hidden";
    wrap.innerHTML = `
      <div class="brandFilterTitle"><span>Filtrar gama</span><small id="brandClassificationCount"></small></div>
      <label>Categoría<select id="brandCategoryFilter"><option value="">Todas</option></select></label>
      <label>Subcategoría<select id="brandSubcategoryFilter"><option value="">Todas</option></select></label>
      <button type="button" id="clearBrandClassification">Limpiar</button>`;
    header.insertAdjacentElement("afterend", wrap);

    $("#brandCategoryFilter").addEventListener("change", () => {
      brandCategoryFilter = $("#brandCategoryFilter").value;
      syncBrandClassificationOptions();
      renderBrandClassifiedContent();
    });
    $("#brandSubcategoryFilter").addEventListener("change", () => {
      brandSubcategoryFilter = $("#brandSubcategoryFilter").value;
      renderBrandClassifiedContent();
    });
    $("#clearBrandClassification").addEventListener("click", () => {
      brandCategoryFilter = "";
      brandSubcategoryFilter = "";
      syncBrandClassificationOptions();
      renderBrandClassifiedContent();
    });
    return wrap;
  }

  function brandVehicles() {
    return vehicles.filter(v => v.brand === currentBrandForClassification);
  }

  function syncBrandClassificationOptions() {
    const wrap = ensureBrandClassificationFilters();
    if (!wrap) return;
    const source = brandVehicles();
    const available = source.some(hasClassification);
    wrap.classList.toggle("hidden", !available);
    if (!available) return;

    brandCategoryFilter = fillSelect(
      $("#brandCategoryFilter"), optionCounts(source, "category"), brandCategoryFilter, "Todas"
    );
    const subSource = brandCategoryFilter
      ? source.filter(v => classValue(v.category) === brandCategoryFilter)
      : source;
    brandSubcategoryFilter = fillSelect(
      $("#brandSubcategoryFilter"), optionCounts(subSource, "subcategory"), brandSubcategoryFilter, "Todas"
    );
  }

  function filteredBrandVehicles() {
    return brandVehicles().filter(v => matchesClassification(v, brandCategoryFilter, brandSubcategoryFilter));
  }

  function renderBrandClassifiedContent() {
    if (!currentBrandForClassification) return;
    const all = brandVehicles();
    const filtered = filteredBrandVehicles();
    const h = buildHierarchyForList(filtered).find(x => x.brand === currentBrandForClassification) || {
      brand: currentBrandForClassification, count: 0, models: []
    };

    const count = $("#brandClassificationCount");
    if (count) count.textContent = `${filtered.length} de ${all.length} versiones`;

    $("#brandTimeline").innerHTML = renderBrandTimeline(h, timelineMode);
    $("#modelGrid").innerHTML = h.models.length ? h.models.map(m => `
      <article class="modelCard" id="model-${escapeAttr(slugifyDomId(m.name))}" data-model-card="${escapeAttr(m.name)}">
        <div class="modelTop"><h3>${escapeHtml(m.name)}</h3><span>${m.count} versiones · ${m.generations.length} generaciones</span></div>
        <div class="generations">${m.generations.map(g => `
          <button class="generationBtn" data-brand="${escapeAttr(h.brand)}" data-model="${escapeAttr(m.name)}" data-generation="${escapeAttr(g.rawName || g.name)}">
            <span class="generationLeft"><strong>${escapeHtml(g.name)}</strong><small>${escapeHtml(genYears(g))}</small></span>
            <span class="generationRight"><span>${g.count} versiones</span><b>→</b></span>
          </button>`).join("")}
        </div>
      </article>`).join("") : `<div class="brandFilterEmpty">No hay versiones que coincidan con esta categoría y subcategoría.</div>`;

    $$(".generationBtn").forEach(btn => btn.addEventListener("click", () =>
      openGeneration(btn.dataset.brand, btn.dataset.model, btn.dataset.generation)
    ));
    bindTimelineInteractions(h);
    bindLogoFallbacks($("#brandBrowser"));
  }

  openBrand = function(brand) {
    currentBrandForClassification = brand;
    brandCategoryFilter = "";
    brandSubcategoryFilter = "";
    originalOpenBrand(brand);
    ensureBrandClassificationFilters();
    syncBrandClassificationOptions();
    renderBrandClassifiedContent();
  };

  openGeneration = function(brand, model, generation) {
    const category = brandCategoryFilter;
    const subcategory = brandSubcategoryFilter;
    originalOpenGeneration(brand, model, generation);

    ensureCatalogClassificationFilters();
    syncCatalogClassificationOptions();
    if ($("#categoryFilter")) $("#categoryFilter").value = category;
    syncCatalogClassificationOptions();
    if ($("#subcategoryFilter")) $("#subcategoryFilter").value = subcategory;

    if (category || subcategory) {
      currentResults = currentResults.filter(v => matchesClassification(v, category, subcategory));
      $("#resultCount").textContent = currentResults.length.toLocaleString("es-ES");
      const label = [brand, model, generation === "Sin especificar" ? "Primera generación" : generation, category, subcategory]
        .filter(Boolean).join(" › ");
      $("#resultContext").textContent = label;
      $("#grid").innerHTML = currentResults.map(cardHtml).join("");
      $("#loadMore").style.display = "none";
      bindCards();
      bindLogoFallbacks($("#grid"));
    }
  };

  cardHtml = function(v) {
    const html = originalCardHtml(v);
    const tags = classificationTagsHtml(v, "card");
    if (!tags) return html;
    return html.replace('<div class="miniSpecs">', `${tags}<div class="miniSpecs">`);
  };

  openDetail = function(id) {
    originalOpenDetail(id);
    const v = vehicles.find(x => x.id === id);
    const tags = classificationTagsHtml(v, "detail");
    if (!tags) return;
    const hero = $("#dialogContent .detailHero");
    const hierarchyLine = hero?.querySelector("p");
    if (hierarchyLine) hierarchyLine.insertAdjacentHTML("afterend", tags);
  };

  ensureCatalogClassificationFilters();
})();
