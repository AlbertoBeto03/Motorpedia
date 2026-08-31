/* Motorpedia V4.2 — clasificación informativa + filtros coherentes dentro de marcas */
(() => {
  let currentBrand = "";
  let brandTypeFilter = "all";
  let brandCategoryFilter = "";
  let brandSubcategoryFilter = "";

  const originalCardHtml = cardHtml;
  const originalOpenDetail = openDetail;
  const originalOpenBrand = openBrand;

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
    return [...counts.entries()].sort((a,b) => a[0].localeCompare(b[0], "es"));
  }

  function fillSelect(select, rows, selected, allLabel) {
    if (!select) return "";
    const values = new Set(rows.map(([value]) => value));
    const keep = values.has(selected) ? selected : "";
    select.innerHTML = `<option value="">${escapeHtml(allLabel)}</option>` + rows.map(([value,count]) =>
      `<option value="${escapeAttr(value)}">${escapeHtml(value)} (${count})</option>`
    ).join("");
    select.value = keep;
    select.disabled = rows.length === 0;
    return keep;
  }

  function classificationTagsHtml(v, context="card") {
    const category = classValue(v?.category);
    const subcategory = classValue(v?.subcategory);
    if (!category && !subcategory) return "";
    return `<div class="classificationTags classificationTags-${context}">
      ${category ? `<span class="classificationTag categoryTag">${escapeHtml(category)}</span>` : ""}
      ${subcategory ? `<span class="classificationTag subcategoryTag">${escapeHtml(subcategory)}</span>` : ""}
    </div>`;
  }

  function buildHierarchyForList(source) {
    const tree = new Map();
    source.forEach(v => {
      const brand=v.brand||"Sin marca", model=v.model||"Otros", raw=String(v.generation||"Sin especificar");
      if(!tree.has(brand)) tree.set(brand,new Map());
      const models=tree.get(brand);
      if(!models.has(model)) models.set(model,new Map());
      const gens=models.get(model);
      if(!gens.has(raw)) gens.set(raw,[]);
      gens.get(raw).push(v);
    });
    const result=[];
    for(const [brand,models] of tree){
      const modelItems=[];
      for(const [model,gens] of models){
        const genItems=[];
        for(const [raw,members] of gens){
          const starts=members.map(v=>v.yearStart).filter(Number.isFinite);
          const ends=members.map(v=>Number.isFinite(v.yearEnd)?v.yearEnd:v.yearStart).filter(Number.isFinite);
          genItems.push({
            name:(!raw||raw==="Sin especificar")?"Primera generación":raw,
            rawName:raw,
            count:members.length,
            vehicleIds:members.map(v=>v.id),
            yearStart:starts.length?Math.min(...starts):null,
            yearEnd:ends.length?Math.max(...ends):null
          });
        }
        genItems.sort((a,b)=>(a.yearStart??9999)-(b.yearStart??9999)||(a.yearEnd??9999)-(b.yearEnd??9999)||a.name.localeCompare(b.name,"es"));
        modelItems.push({name:model,count:genItems.reduce((n,g)=>n+g.count,0),generations:genItems});
      }
      modelItems.sort((a,b)=>a.name.localeCompare(b.name,"es"));
      result.push({brand,count:modelItems.reduce((n,m)=>n+m.count,0),models:modelItems});
    }
    return result;
  }

  function brandVehicles() { return vehicles.filter(v => v.brand === currentBrand); }

  function availableBrandTypes() {
    const source=brandVehicles();
    return {cars:source.some(v=>v.type==="car"),motos:source.some(v=>v.type==="moto")};
  }

  function ensureBrandFilters() {
    let wrap=$("#brandBrowseFilters");
    if(wrap) return wrap;
    const header=$("#brandHeader");
    if(!header) return null;
    wrap=document.createElement("div");
    wrap.id="brandBrowseFilters";
    wrap.className="brandBrowseFilters";
    wrap.innerHTML=`
      <div class="brandBrowseIntro"><span>Gama visible</span><small id="brandBrowseCount"></small></div>
      <div class="brandVehicleTypeTabs" id="brandVehicleTypeTabs">
        <button type="button" data-brand-type="all">Todo</button>
        <button type="button" data-brand-type="car">Coches</button>
        <button type="button" data-brand-type="moto">Motos</button>
      </div>
      <div class="brandMotoClassification hidden" id="brandMotoClassification">
        <label>Categoría<select id="brandCategoryFilter"><option value="">Todas</option></select></label>
        <label>Subcategoría<select id="brandSubcategoryFilter"><option value="">Todas</option></select></label>
      </div>
      <button type="button" class="brandBrowseClear" id="clearBrandBrowseFilters">Limpiar</button>`;
    header.insertAdjacentElement("afterend",wrap);

    wrap.querySelectorAll("[data-brand-type]").forEach(btn=>btn.addEventListener("click",()=>{
      brandTypeFilter=btn.dataset.brandType;
      brandCategoryFilter="";
      brandSubcategoryFilter="";
      syncBrandFilters();
      renderBrandFilteredContent();
    }));
    $("#brandCategoryFilter").addEventListener("change",()=>{
      brandCategoryFilter=$("#brandCategoryFilter").value;
      syncBrandFilters();
      renderBrandFilteredContent();
    });
    $("#brandSubcategoryFilter").addEventListener("change",()=>{
      brandSubcategoryFilter=$("#brandSubcategoryFilter").value;
      renderBrandFilteredContent();
    });
    $("#clearBrandBrowseFilters").addEventListener("click",()=>{
      const types=availableBrandTypes();
      brandTypeFilter=types.cars&&types.motos?"all":types.motos?"moto":"car";
      brandCategoryFilter="";
      brandSubcategoryFilter="";
      syncBrandFilters();
      renderBrandFilteredContent();
    });
    return wrap;
  }

  function syncBrandFilters() {
    const wrap=ensureBrandFilters();
    if(!wrap) return;
    const types=availableBrandTypes();
    const typeTabs=$("#brandVehicleTypeTabs");
    typeTabs.classList.toggle("singleType",!(types.cars&&types.motos));
    typeTabs.querySelector('[data-brand-type="all"]').classList.toggle("hidden",!(types.cars&&types.motos));
    typeTabs.querySelector('[data-brand-type="car"]').classList.toggle("hidden",!types.cars);
    typeTabs.querySelector('[data-brand-type="moto"]').classList.toggle("hidden",!types.motos);

    if(brandTypeFilter==="all"&&!(types.cars&&types.motos)) brandTypeFilter=types.motos?"moto":"car";
    if(brandTypeFilter==="car"&&!types.cars) brandTypeFilter=types.motos?"moto":"all";
    if(brandTypeFilter==="moto"&&!types.motos) brandTypeFilter=types.cars?"car":"all";
    typeTabs.querySelectorAll("[data-brand-type]").forEach(btn=>btn.classList.toggle("active",btn.dataset.brandType===brandTypeFilter));

    const motoControls=$("#brandMotoClassification");
    const motoSource=brandVehicles().filter(v=>v.type==="moto");
    const showMotoClass=brandTypeFilter==="moto"&&motoSource.some(hasClassification);
    motoControls.classList.toggle("hidden",!showMotoClass);
    if(showMotoClass){
      brandCategoryFilter=fillSelect($("#brandCategoryFilter"),optionCounts(motoSource,"category"),brandCategoryFilter,"Todas");
      const subSource=brandCategoryFilter?motoSource.filter(v=>classValue(v.category)===brandCategoryFilter):motoSource;
      brandSubcategoryFilter=fillSelect($("#brandSubcategoryFilter"),optionCounts(subSource,"subcategory"),brandSubcategoryFilter,"Todas");
    }else{
      brandCategoryFilter="";
      brandSubcategoryFilter="";
    }
  }

  function filteredBrandVehicles() {
    return brandVehicles().filter(v=>{
      if(brandTypeFilter!=="all"&&v.type!==brandTypeFilter) return false;
      if(v.type==="moto"&&!matchesClassification(v,brandCategoryFilter,brandSubcategoryFilter)) return false;
      return true;
    });
  }

  function renderBrandFilteredContent() {
    if(!currentBrand) return;
    const all=brandVehicles();
    const filtered=filteredBrandVehicles();
    const h=buildHierarchyForList(filtered).find(x=>x.brand===currentBrand)||{brand:currentBrand,count:0,models:[]};
    const count=$("#brandBrowseCount");
    if(count) count.textContent=`${filtered.length} de ${all.length} versiones`;

    window.motorpediaBrandFilterContext={
      brand:currentBrand,
      type:brandTypeFilter,
      category:brandCategoryFilter,
      subcategory:brandSubcategoryFilter
    };

    $("#brandTimeline").innerHTML=renderBrandTimeline(h,timelineMode);
    $("#modelGrid").innerHTML=h.models.length?h.models.map(m=>`
      <article class="modelCard" id="model-${escapeAttr(slugifyDomId(m.name))}" data-model-card="${escapeAttr(m.name)}">
        <div class="modelTop"><h3>${escapeHtml(m.name)}</h3><span>${m.count} versiones · ${m.generations.length} generaciones</span></div>
        <div class="generations">${m.generations.map(g=>`
          <button class="generationBtn" data-brand="${escapeAttr(h.brand)}" data-model="${escapeAttr(m.name)}" data-generation="${escapeAttr(g.rawName||g.name)}">
            <span class="generationLeft"><strong>${escapeHtml(g.name)}</strong><small>${escapeHtml(genYears(g))}</small></span>
            <span class="generationRight"><span>${g.count} versiones</span><b>→</b></span>
          </button>`).join("")}</div>
      </article>`).join(""):`<div class="brandFilterEmpty">No hay vehículos que coincidan con los filtros de esta marca.</div>`;
    $$(".generationBtn").forEach(btn=>btn.addEventListener("click",()=>openGeneration(btn.dataset.brand,btn.dataset.model,btn.dataset.generation)));
    bindTimelineInteractions(h);
    bindLogoFallbacks($("#brandBrowser"));
  }

  openBrand=function(brand){
    currentBrand=brand;
    const source=vehicles.filter(v=>v.brand===brand);
    const hasCars=source.some(v=>v.type==="car"), hasMotos=source.some(v=>v.type==="moto");
    brandTypeFilter=hasCars&&hasMotos?"all":hasMotos?"moto":"car";
    brandCategoryFilter="";
    brandSubcategoryFilter="";
    originalOpenBrand(brand);
    ensureBrandFilters();
    syncBrandFilters();
    renderBrandFilteredContent();
  };

  cardHtml=function(v){
    const html=originalCardHtml(v);
    const tags=classificationTagsHtml(v,"card");
    if(!tags) return html;
    return html.replace('<div class="miniSpecs">',`${tags}<div class="miniSpecs">`);
  };

  openDetail=function(id){
    originalOpenDetail(id);
    const v=vehicles.find(x=>x.id===id);
    const tags=classificationTagsHtml(v,"detail");
    if(!tags) return;
    const hierarchyLine=$("#dialogContent .detailHero")?.querySelector("p");
    if(hierarchyLine) hierarchyLine.insertAdjacentHTML("afterend",tags);
  };

  window.MotorpediaClassification={classValue,hasClassification,matchesClassification,classificationTagsHtml};
})();
