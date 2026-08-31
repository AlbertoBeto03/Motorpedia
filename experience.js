/* Motorpedia V4.2 — portada y exploradores independientes de coches/motos */
(() => {
  const explorerState={
    car:{visible:48,locked:null},
    moto:{visible:48,locked:null}
  };
  let initialized=false;

  const cfg={
    car:{
      view:"cars",search:"carSearch",brand:"carBrandFilter",minPower:"carMinPower",minYear:"carMinYear",media:"carMediaFilter",sort:"carSort",
      grid:"carGrid",count:"carResultCount",context:"carResultContext",load:"carLoadMore",clear:"clearCarFilters",lock:"carExplorerContext",total:"carsTotal"
    },
    moto:{
      view:"motos",search:"motoSearch",brand:"motoBrandFilter",category:"motoCategoryFilter",subcategory:"motoSubcategoryFilter",a2:"motoA2Filter",
      minPower:"motoMinPower",minYear:"motoMinYear",media:"motoMediaFilter",sort:"motoSort",
      grid:"motoGrid",count:"motoResultCount",context:"motoResultContext",load:"motoLoadMore",clear:"clearMotoFilters",lock:"motoExplorerContext",total:"motosTotal"
    }
  };

  const el=id=>document.getElementById(id);
  const value=id=>el(id)?.value||"";
  const normalize=s=>String(s??"").trim().toLowerCase();
  const hasPhoto=v=>Array.isArray(v?.media?.images)&&v.media.images.some(Boolean);
  const hasArticle=v=>Boolean(v?.article);
  const isA2=v=>{
    const raw=normalize(v?.a2 ?? v?.specs?.A2);
    if(!raw) return false;
    return !["no","n","false","0","-","—","no apta","no apto"].includes(raw);
  };

  function sortVehicles(arr,sort){
    return arr.sort((a,b)=>{
      if(sort==="powerDesc") return (num(b.power)??-1)-(num(a.power)??-1);
      if(sort==="weightAsc") return (num(a.weight)??999999)-(num(b.weight)??999999);
      if(sort==="kgcvAsc") return (num(a.kgcv)??999999)-(num(b.kgcv)??999999);
      if(sort==="yearDesc") return (b.yearStart??-1)-(a.yearStart??-1);
      return a.name.localeCompare(b.name,"es");
    });
  }

  function fillOptions(select,rows,selected,allLabel){
    if(!select) return "";
    const values=new Set(rows.map(([v])=>v));
    const keep=values.has(selected)?selected:"";
    select.innerHTML=`<option value="">${escapeHtml(allLabel)}</option>`+rows.map(([v,n])=>`<option value="${escapeAttr(v)}">${escapeHtml(v)} (${n})</option>`).join("");
    select.value=keep;
    select.disabled=!rows.length;
    return keep;
  }

  function counts(source,key){
    const map=new Map();
    source.forEach(v=>{
      const val=String(v?.[key]??"").trim();
      if(val) map.set(val,(map.get(val)||0)+1);
    });
    return [...map.entries()].sort((a,b)=>a[0].localeCompare(b[0],"es"));
  }

  function populateBrands(type){
    const c=cfg[type],select=el(c.brand);
    const old=select.value;
    const rows=counts(vehicles.filter(v=>v.type===type),"brand");
    fillOptions(select,rows,old,"Todas");
  }

  function syncMotoClassification(){
    const brand=value(cfg.moto.brand);
    const catSel=el(cfg.moto.category),subSel=el(cfg.moto.subcategory);
    const oldCat=catSel.value,oldSub=subSel.value;
    const source=vehicles.filter(v=>v.type==="moto"&&(!brand||v.brand===brand));
    const cat=fillOptions(catSel,counts(source,"category"),oldCat,"Todas");
    const subSource=cat?source.filter(v=>String(v.category||"").trim()===cat):source;
    fillOptions(subSel,counts(subSource,"subcategory"),oldSub,"Todas");
  }

  function mediaMatches(v,filter){
    if(filter==="photo") return hasPhoto(v);
    if(filter==="article") return hasArticle(v);
    if(filter==="both") return hasPhoto(v)&&hasArticle(v);
    return true;
  }

  function lockedMatches(v,locked){
    if(!locked) return true;
    if(locked.brand&&v.brand!==locked.brand) return false;
    if(locked.model&&v.model!==locked.model) return false;
    if(locked.generation&&String(v.generation)!==String(locked.generation)) return false;
    if(locked.category&&String(v.category||"").trim()!==locked.category) return false;
    if(locked.subcategory&&String(v.subcategory||"").trim()!==locked.subcategory) return false;
    return true;
  }

  function filtered(type){
    const c=cfg[type],state=explorerState[type];
    const q=normalize(value(c.search)),brand=value(c.brand);
    const minP=Number(value(c.minPower))||0,minY=Number(value(c.minYear))||0;
    const media=value(c.media),sort=value(c.sort)||"name";
    const category=type==="moto"?value(c.category):"";
    const subcategory=type==="moto"?value(c.subcategory):"";
    const a2=type==="moto"?value(c.a2):"";

    const result=vehicles.filter(v=>{
      if(v.type!==type) return false;
      if(!lockedMatches(v,state.locked)) return false;
      if(brand&&v.brand!==brand) return false;
      if(category&&String(v.category||"").trim()!==category) return false;
      if(subcategory&&String(v.subcategory||"").trim()!==subcategory) return false;
      if(a2==="yes"&&!isA2(v)) return false;
      if(a2==="no"&&isA2(v)) return false;
      if(!mediaMatches(v,media)) return false;
      if(q){
        const haystack=normalize(`${v.name} ${v.brand} ${v.model||""} ${v.generation||""} ${v.version||""} ${v.category||""} ${v.subcategory||""}`);
        if(!haystack.includes(q)) return false;
      }
      const p=num(v.power); if(minP&&(p===null||p<minP)) return false;
      if(minY&&(!v.yearEnd||v.yearEnd<minY)) return false;
      return true;
    });
    return sortVehicles(result,sort);
  }

  function contextText(type,count){
    const c=cfg[type],state=explorerState[type];
    const parts=[];
    if(state.locked){
      [state.locked.brand,state.locked.model,state.locked.generation].filter(Boolean).forEach(x=>parts.push(x));
    }else{
      parts.push(value(c.brand)||(type==="car"?"Todos los coches":"Todas las motos"));
    }
    if(type==="moto"){
      const category=value(c.category),subcategory=value(c.subcategory),a2=value(c.a2);
      if(category) parts.push(category);
      if(subcategory) parts.push(subcategory);
      if(a2==="yes") parts.push("A2");
      if(a2==="no") parts.push("No A2");
    }
    const media=value(c.media);
    if(media==="photo") parts.push("Con foto");
    if(media==="article") parts.push("Con artículo");
    if(media==="both") parts.push("Foto + artículo");
    return parts.join(" · ");
  }

  function renderLock(type){
    const c=cfg[type],box=el(c.lock),locked=explorerState[type].locked;
    if(!box) return;
    if(!locked){box.classList.add("hidden");box.innerHTML="";return;}
    const path=[locked.brand,locked.model,locked.generation].filter(Boolean).join(" › ");
    box.innerHTML=`<div><span>VISTA DE GENERACIÓN</span><strong>${escapeHtml(path)}</strong></div><button type="button" data-clear-explorer-lock>Ver toda la sección</button>`;
    box.classList.remove("hidden");
    box.querySelector("[data-clear-explorer-lock]").addEventListener("click",()=>{
      explorerState[type].locked=null;
      renderExplorer(type,true);
    });
  }

  function bindExplorerCards(type){
    const c=cfg[type],scope=el(c.grid);
    scope.querySelectorAll(".vehicleCard").forEach(card=>{
      const id=card.dataset.id;
      card.querySelectorAll(".openDetail,.detailBtn").forEach(btn=>btn.addEventListener("click",()=>openDetail(id)));
      card.querySelector(".compareBtn")?.addEventListener("click",()=>{
        toggleCompare(id);
        renderExplorer(type,false);
      });
    });
    bindVehicleImages(scope);
    bindLogoFallbacks(scope);
  }

  function renderExplorer(type,resetVisible=false){
    const c=cfg[type],state=explorerState[type];
    if(resetVisible) state.visible=48;
    if(type==="moto") syncMotoClassification();
    const result=filtered(type);
    const slice=result.slice(0,state.visible);
    el(c.count).textContent=result.length.toLocaleString("es-ES");
    el(c.context).textContent=contextText(type,result.length);
    el(c.grid).innerHTML=slice.map(cardHtml).join("");
    el(c.load).style.display=state.visible<result.length?"block":"none";
    renderLock(type);
    bindExplorerCards(type);
  }

  function clearExplorer(type){
    const c=cfg[type];
    [c.search,c.brand,c.minPower,c.minYear,c.media].forEach(id=>{if(el(id))el(id).value="";});
    if(el(c.sort)) el(c.sort).value="name";
    if(type==="moto") [c.category,c.subcategory,c.a2].forEach(id=>{if(el(id))el(id).value="";});
    explorerState[type].locked=null;
    renderExplorer(type,true);
  }

  function bindExplorer(type){
    const c=cfg[type];
    const rerender=()=>renderExplorer(type,true);
    el(c.search)?.addEventListener("input",rerender);
    el(c.brand)?.addEventListener("change",()=>{
      explorerState[type].locked=null;
      if(type==="moto") syncMotoClassification();
      rerender();
    });
    [c.minPower,c.minYear,c.media,c.sort].forEach(id=>el(id)?.addEventListener("change",rerender));
    if(type==="moto"){
      el(c.category)?.addEventListener("change",()=>{syncMotoClassification();rerender();});
      el(c.subcategory)?.addEventListener("change",rerender);
      el(c.a2)?.addEventListener("change",rerender);
    }
    el(c.clear)?.addEventListener("click",()=>clearExplorer(type));
    el(c.load)?.addEventListener("click",()=>{explorerState[type].visible+=48;renderExplorer(type,false);});
  }

  function resetBrandsLanding(){
    $("#brandBrowser")?.classList.add("hidden");
    $("#brandsLanding")?.classList.remove("hidden");
  }

  function openExplorerGeneration(brand,model,generation){
    const matches=vehicles.filter(v=>v.brand===brand&&v.model===model&&String(v.generation)===String(generation));
    if(!matches.length) return false;
    const brandContext=window.motorpediaBrandFilterContext||{};
    let type=(brandContext.type==="car"||brandContext.type==="moto")?brandContext.type:matches[0].type;
    if(!matches.some(v=>v.type===type)) type=matches[0].type;
    const c=cfg[type];
    explorerState[type].locked={
      brand,model,generation,
      category:type==="moto"?(brandContext.category||""):"",
      subcategory:type==="moto"?(brandContext.subcategory||""):""
    };
    el(c.brand).value=brand;
    if(type==="moto"){
      syncMotoClassification();
      if(brandContext.category) el(c.category).value=brandContext.category;
      syncMotoClassification();
      if(brandContext.subcategory) el(c.subcategory).value=brandContext.subcategory;
    }
    showView(c.view);
    renderExplorer(type,true);
    return true;
  }

  const legacyOpenGeneration=openGeneration;
  openGeneration=function(brand,model,generation){
    if(!initialized||!openExplorerGeneration(brand,model,generation)) legacyOpenGeneration(brand,model,generation);
  };

  function renderHomeStats(){
    const cars=vehicles.filter(v=>v.type==="car"),motos=vehicles.filter(v=>v.type==="moto");
    const carsPhotos=cars.filter(hasPhoto).length,motosPhotos=motos.filter(hasPhoto).length;
    el("homeCarsMeta").textContent=`${cars.length.toLocaleString("es-ES")} fichas · ${carsPhotos.toLocaleString("es-ES")} con fotos`;
    el("homeMotosMeta").textContent=`${motos.length.toLocaleString("es-ES")} fichas · ${motosPhotos.toLocaleString("es-ES")} con fotos`;
    el("homeBrandsMeta").textContent=`${new Set(vehicles.map(v=>v.brand)).size.toLocaleString("es-ES")} fabricantes`;
    el("homePhotoCount").textContent=vehicles.filter(hasPhoto).length.toLocaleString("es-ES");
    el("homeArticleCount").textContent=vehicles.filter(hasArticle).length.toLocaleString("es-ES");
    el("carsTotal").textContent=cars.length.toLocaleString("es-ES");
    el("motosTotal").textContent=motos.length.toLocaleString("es-ES");
  }

  function init(){
    if(initialized||!Array.isArray(vehicles)||!vehicles.length) return false;
    initialized=true;
    populateBrands("car");populateBrands("moto");syncMotoClassification();
    bindExplorer("car");bindExplorer("moto");
    renderHomeStats();renderExplorer("car",true);renderExplorer("moto",true);

    document.querySelectorAll("[data-home-target]").forEach(btn=>btn.addEventListener("click",()=>{
      const target=btn.dataset.homeTarget;
      if(target==="brands") resetBrandsLanding();
      showView(target);
    }));
    document.querySelectorAll('.nav[data-view="cars"]').forEach(btn=>btn.addEventListener("click",()=>renderExplorer("car",false)));
    document.querySelectorAll('.nav[data-view="motos"]').forEach(btn=>btn.addEventListener("click",()=>renderExplorer("moto",false)));
    document.querySelectorAll('.nav[data-view="brands"]').forEach(btn=>btn.addEventListener("click",resetBrandsLanding));
    $("#homeBtn")?.addEventListener("click",()=>showView("home"));
    showView("home");
    return true;
  }

  if(!init()){
    const timer=setInterval(()=>{if(init())clearInterval(timer);},50);
    setTimeout(()=>clearInterval(timer),15000);
  }

  window.MotorpediaExplorers={renderExplorer,clearExplorer,openExplorerGeneration,isA2};
})();
