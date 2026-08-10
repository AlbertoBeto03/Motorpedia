let vehicles=[], brands=[], stats={}, hierarchy=[], brandLogos={}, motoTaxonomy={};
let typeFilter="all", visible=48, selected=new Set(), currentResults=[];

const $=s=>document.querySelector(s), $$=s=>document.querySelectorAll(s);
const fmt=v=>v===null||v===undefined||v===""?"—":String(v);
const num=v=>{if(typeof v==="number")return v; const m=String(v??"").replace(",",".").match(/-?\d+(\.\d+)?/); return m?Number(m[0]):null};
const initials=name=>name.split(/\s+/).slice(0,2).map(x=>x[0]||"").join("");

Promise.all([
 fetch("data/vehicles.json?v=3").then(r=>r.json()),
 fetch("data/stats.json?v=3").then(r=>r.json()),
 fetch("data/brandLogos.json?v=3").then(r=>r.json()),
 fetch("data/motoTaxonomy.json?v=3&t="+Date.now()).then(r=>r.json())
]).then(([v,s,l,t])=>{
 vehicles=v; stats=s; brandLogos=l; motoTaxonomy=t;
 applyMotoTaxonomy();
 brands=buildBrandStatsFromVehicles();
 hierarchy=buildHierarchyFromVehicles();
 stats.brands=brands.length;
 $("#totalStat").textContent=stats.total.toLocaleString("es-ES");
 $("#carStat").textContent=stats.cars.toLocaleString("es-ES");
 $("#motoStat").textContent=stats.motos.toLocaleString("es-ES");
 $("#brandStat").textContent=stats.brands.toLocaleString("es-ES");
 populateBrands(); renderBrands(); applyFilters();
}).catch(err=>{
 $("#grid").innerHTML=`<div class="empty">No se pudieron cargar los datos. ${err.message}</div>`;
});


function ordinalGeneration(n){
 const num=Number(n);
 return Number.isFinite(num)?`${num}ª generación`:"Primera generación";
}
function motoCoreName(v){
 const originalBrand=String(v.brand||"").trim();
 let core=String(v.name||"").trim();
 if(originalBrand && core.toLowerCase().startsWith(originalBrand.toLowerCase()+" ")){
   core=core.slice(originalBrand.length).trim();
 }
 if(originalBrand==="QJ" && core.toLowerCase().startsWith("motor ")){
   core=core.slice(6).trim();
 }
 return core;
}
function fallbackMotoTaxonomy(core){
 const text=String(core||"").trim();
 const genMatch=text.match(/\bgen\s*([1-9])\b/i)||text.match(/\b([1-9])gen\b/i);
 const restyling=/\brestyling\b/i.test(text);
 let generation="Primera generación";
 if(genMatch){
   generation=ordinalGeneration(genMatch[1]);
   if(restyling) generation+=" · restyling";
 }else if(restyling){
   generation="Restyling";
 }
 let model=text
   .replace(/\bgen\s*[1-9]\b/ig," ")
   .replace(/\b[1-9]gen\b/ig," ")
   .replace(/\brestyling\b/ig," ")
   .replace(/\bEuro\s*5\+\b/ig," ")
   .replace(/\bEuro\s*[345]\b/ig," ")
   .replace(/\bEuro[345]\+?\b/ig," ")
   .replace(/\bABS\b/ig," ")
   .replace(/\bA2\b/ig," ")
   .replace(/\s+/g," ").trim();
 return {model:model||text||"Otros",generation};
}
function applyMotoTaxonomy(){
 const aliases=motoTaxonomy?.brandAliases||{};
 const groups=Array.isArray(motoTaxonomy?.groups)?motoTaxonomy.groups:[];
 const quick=Array.isArray(motoTaxonomy?.overrides)?motoTaxonomy.overrides:[];
 vehicles.forEach(v=>{
   if(v.type!=="moto") return;
   const originalBrand=v.brand;
   const core=motoCoreName(v);
   const targetBrand=aliases[originalBrand]||originalBrand;
   v.brand=targetBrand;
   const y=Number.isFinite(v.yearStart)?v.yearStart:(Number.isFinite(v.yearEnd)?v.yearEnd:null);
   const matches=[];

   // Quick overrides always win.
   quick.forEach(rule=>{
     const ruleBrand=rule.brand||targetBrand;
     if(ruleBrand!==targetBrand) return;
     const prefix=String(rule.prefix||"");
     if(!prefix||!core.toLowerCase().startsWith(prefix.toLowerCase())) return;
     const from=Number.isFinite(rule.yearFrom)?rule.yearFrom:-Infinity;
     const to=Number.isFinite(rule.yearTo)?rule.yearTo:Infinity;
     const ranged=Number.isFinite(rule.yearFrom)||Number.isFinite(rule.yearTo);
     if(ranged && !Number.isFinite(y)) return;
     if(Number.isFinite(y)&&(y<from||y>to)) return;
     matches.push({
       score:100000000+prefix.length*10000,
       model:rule.model||fallbackMotoTaxonomy(core).model,
       generation:rule.generation||"Primera generación"
     });
   });

   // Curated family rules.
   groups.forEach(group=>{
     if(group.brand!==targetBrand) return;
     (group.generations||[]).forEach(g=>{
       const ranged=Number.isFinite(g.yearFrom)||Number.isFinite(g.yearTo);
       const from=Number.isFinite(g.yearFrom)?g.yearFrom:-Infinity;
       const to=Number.isFinite(g.yearTo)?g.yearTo:Infinity;
       if(ranged && !Number.isFinite(y)) return;
       if(Number.isFinite(y)&&(y<from||y>to)) return;
       (g.prefixes||[]).forEach(prefix=>{
         if(core.toLowerCase().startsWith(String(prefix).toLowerCase())){
           const width=(Number.isFinite(g.yearFrom)&&Number.isFinite(g.yearTo))?Math.max(0,g.yearTo-g.yearFrom):9999;
           const score=String(prefix).length*10000+(ranged?1000:0)-Math.min(width,999);
           matches.push({score,model:group.model,generation:g.name});
         }
       });
     });
   });

   if(matches.length){
     matches.sort((a,b)=>b.score-a.score);
     v.model=matches[0].model;
     v.generation=matches[0].generation;
   }else{
     const fallback=fallbackMotoTaxonomy(core);
     v.model=fallback.model;
     v.generation=fallback.generation;
   }
 });
}
function buildBrandStatsFromVehicles(){
 const map=new Map();
 vehicles.forEach(v=>{
   if(!map.has(v.brand)) map.set(v.brand,{name:v.brand,cars:0,motos:0,total:0});
   const row=map.get(v.brand);
   row.total++;
   if(v.type==="car") row.cars++;
   else if(v.type==="moto") row.motos++;
 });
 return [...map.values()].sort((a,b)=>a.name.localeCompare(b.name,"es"));
}
function buildHierarchyFromVehicles(){
 const tree=new Map();
 vehicles.forEach(v=>{
   const brand=v.brand||"Sin marca";
   const model=v.model||"Otros";
   const raw=String(v.generation||"Sin especificar");
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
       const yearStart=starts.length?Math.min(...starts):null;
       const yearEnd=ends.length?Math.max(...ends):null;
       genItems.push({
         name:(!raw||raw==="Sin especificar")?"Primera generación":raw,
         rawName:raw,
         count:members.length,
         vehicleIds:members.map(v=>v.id),
         yearStart,yearEnd
       });
     }
     genItems.sort((a,b)=>
       (a.yearStart??9999)-(b.yearStart??9999) ||
       (a.yearEnd??9999)-(b.yearEnd??9999) ||
       a.name.localeCompare(b.name,"es")
     );
     modelItems.push({
       name:model,
       count:genItems.reduce((n,g)=>n+g.count,0),
       generations:genItems
     });
   }
   modelItems.sort((a,b)=>a.name.localeCompare(b.name,"es"));
   result.push({
     brand,
     count:modelItems.reduce((n,m)=>n+m.count,0),
     models:modelItems
   });
 }
 result.sort((a,b)=>a.brand.localeCompare(b.brand,"es"));
 return result;
}

function populateBrands(){
 const sel=$("#brandFilter");
 brands.forEach(b=>{const o=document.createElement("option");o.value=b.name;o.textContent=`${b.name} (${b.total})`;sel.appendChild(o)});
}
function brandSlug(brand){
 return String(brand||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"")
   .toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");
}
function logoSources(brand){
 const cfg=brandLogos?.[brand]||{};
 const slug=cfg.slug||brandSlug(brand);
 const base="assets/brand-logos/";
 const exact=encodeURIComponent(brand);
 return [...new Set([
   cfg.file,
   `${base}${slug}.svg`,`${base}${slug}.png`,`${base}${slug}.webp`,`${base}${slug}.jpg`,
   `${base}${exact}.svg`,`${base}${exact}.png`,`${base}${exact}.webp`,`${base}${exact}.jpg`
 ].filter(Boolean))];
}
function logoUrl(brand){ return logoSources(brand)[0]||null; }
function logoTheme(brand){
 const theme=String(brandLogos?.[brand]?.theme||"normal").toLowerCase();
 return ["normal","invert","light-bg"].includes(theme)?theme:"normal";
}
function logoHtml(brand,cls="brandLogo"){
 const sources=logoSources(brand);
 const theme=logoTheme(brand);
 if(!sources.length) return `<span class="brandInitial">${escapeHtml(initials(brand))}</span>`;
 return `<span class="logoShell logoTheme-${theme}"><img class="${cls}" src="${escapeAttr(sources[0])}" data-logo-sources="${escapeAttr(JSON.stringify(sources))}" data-logo-index="0" alt="Logo ${escapeAttr(brand)}"><span class="brandInitial" style="display:none">${escapeHtml(initials(brand))}</span></span>`;
}
function bindLogoFallbacks(scope=document){
 scope.querySelectorAll("img[data-logo-sources]").forEach(img=>{
   if(img.dataset.bound==="1") return;
   img.dataset.bound="1";
   img.addEventListener("error",()=>{
     let sources=[];
     try{sources=JSON.parse(img.dataset.logoSources||"[]")}catch(e){}
     const i=Number(img.dataset.logoIndex||0)+1;
     if(i<sources.length){
       img.dataset.logoIndex=String(i);
       img.src=sources[i];
     }else{
       img.style.display="none";
       const fallback=img.nextElementSibling;
       if(fallback) fallback.style.display="flex";
     }
   });
 });
}
function generationSpan(g){
 // V2.2: recalculate from the vehicles themselves so this works even if
 // hierarchy.json is ever served from an older cache.
 const members=(g.vehicleIds||[]).map(id=>vehicles.find(v=>v.id===id)).filter(Boolean);
 const starts=members.map(v=>v.yearStart).filter(Number.isFinite);
 const ends=members.map(v=>Number.isFinite(v.yearEnd)?v.yearEnd:v.yearStart).filter(Number.isFinite);
 const start=starts.length?Math.min(...starts):(Number.isFinite(g.yearStart)?g.yearStart:null);
 const end=ends.length?Math.max(...ends):(Number.isFinite(g.yearEnd)?g.yearEnd:null);
 return {start,end};
}
function genYears(g){
 const {start,end}=generationSpan(g);
 if(start&&end) return start===end?String(start):`${start}–${end}`;
 if(start) return `${start}–`;
 if(end) return `–${end}`;
 return "Año no definido";
}
function openBrand(brand){
 const h=hierarchy.find(x=>x.brand===brand); if(!h)return;
 $("#brandsLanding").classList.add("hidden"); $("#brandBrowser").classList.remove("hidden");
 $("#brandHeader").innerHTML=`${logoUrl(brand)?logoHtml(brand,"heroBrandLogo"):`<span class="fallbackLogo">${escapeHtml(initials(brand))}</span>`}<div><p class="eyebrow">FABRICANTE</p><h2>${escapeHtml(brand)}</h2><p>${h.models.length} modelos · ${h.count} versiones en la base de datos</p></div>`;
 $("#modelGrid").innerHTML=h.models.map(m=>`<article class="modelCard"><div class="modelTop"><h3>${escapeHtml(m.name)}</h3><span>${m.count} versiones · ${m.generations.length} generaciones</span></div><div class="generations">${m.generations.map(g=>`<button class="generationBtn" data-brand="${escapeAttr(brand)}" data-model="${escapeAttr(m.name)}" data-generation="${escapeAttr(g.rawName||g.name)}"><span class="generationLeft"><strong>${escapeHtml(g.name)}</strong><small>${escapeHtml(genYears(g))}</small></span><span class="generationRight"><span>${g.count} versiones</span><b>→</b></span></button>`).join("")}</div></article>`).join("");
 $$(".generationBtn").forEach(btn=>btn.addEventListener("click",()=>openGeneration(btn.dataset.brand,btn.dataset.model,btn.dataset.generation))); bindLogoFallbacks($("#brandBrowser"));
 window.scrollTo({top:0,behavior:"smooth"});
}
function openGeneration(brand,model,generation){
 showView("catalog");
 $("#brandFilter").value=brand;
 $("#search").value="";
 typeFilter="all";
 $$(".type").forEach(x=>x.classList.toggle("active",x.dataset.type==="all"));
 currentResults=vehicles.filter(v=>v.brand===brand&&v.model===model&&v.generation===generation).sort((a,b)=>a.name.localeCompare(b.name,"es"));
 visible=9999;
 $("#resultCount").textContent=currentResults.length.toLocaleString("es-ES");
 $("#resultContext").textContent=`${brand} › ${model} › ${generation==="Sin especificar"?"Primera generación":generation}`;
 $("#grid").innerHTML=currentResults.map(cardHtml).join("");
 $("#loadMore").style.display="none";
 bindCards(); bindLogoFallbacks($("#grid"));
}
function renderBrands(){
 $("#brandGrid").innerHTML=brands.filter(b=>b.total>0).map(b=>`
 <button class="brandCard" data-brand="${escapeAttr(b.name)}">
  <div class="brandLogoWrap">${logoHtml(b.name)}</div>
  <strong>${escapeHtml(b.name)}</strong>
  <span>${b.total} vehículos · ${b.cars} coches · ${b.motos} motos</span>
 </button>`).join("");
 $$(".brandCard").forEach(x=>x.addEventListener("click",()=>openBrand(x.dataset.brand))); bindLogoFallbacks($("#brandGrid"));
}
function escapeHtml(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function escapeAttr(s){return escapeHtml(s)}
function applyFilters(){
 const q=$("#search").value.trim().toLowerCase(), brand=$("#brandFilter").value;
 const minP=Number($("#minPower").value)||0, minY=Number($("#minYear").value)||0;
 let arr=vehicles.filter(v=>{
   if(typeFilter!=="all"&&v.type!==typeFilter)return false;
   if(brand&&v.brand!==brand)return false;
   if(q&&!`${v.name} ${v.brand} ${v.category||""}`.toLowerCase().includes(q))return false;
   const p=num(v.power); if(minP&&(p===null||p<minP))return false;
   if(minY&&(!v.yearEnd||v.yearEnd<minY))return false;
   return true;
 });
 const sort=$("#sort").value;
 arr.sort((a,b)=>{
   if(sort==="powerDesc") return (num(b.power)??-1)-(num(a.power)??-1);
   if(sort==="weightAsc") return (num(a.weight)??999999)-(num(b.weight)??999999);
   if(sort==="kgcvAsc") return (num(a.kgcv)??999999)-(num(b.kgcv)??999999);
   if(sort==="yearDesc") return (b.yearStart??-1)-(a.yearStart??-1);
   return a.name.localeCompare(b.name,"es");
 });
 currentResults=arr; renderResults();
}
function renderResults(){
 $("#resultCount").textContent=currentResults.length.toLocaleString("es-ES");
 const brand=$("#brandFilter").value;
 $("#resultContext").textContent=brand||({all:"Todos los vehículos",car:"Coches",moto:"Motos"}[typeFilter]);
 const slice=currentResults.slice(0,visible);
 $("#grid").innerHTML=slice.map(cardHtml).join("");
 $("#loadMore").style.display=visible<currentResults.length?"block":"none";
 bindCards();
 bindLogoFallbacks($("#grid"));
}
function displayGeneration(v){
 const raw=String(v?.generation||"").trim();
 if(!raw || raw==="Sin especificar") return "Primera generación";
 return raw;
}
function cardHtml(v){
 const p=fmt(v.power), w=fmt(v.weight), y=v.yearText||fmt(v.yearStart);
 return `<article class="vehicleCard" data-id="${v.id}">
  <div class="vehicleVisual openDetail"><span class="vehicleMark">${escapeHtml(initials(v.brand))}</span></div>
  <div class="cardBody">
   <div class="cardTop"><span class="cardType">${v.type==="car"?"COCHE":"MOTO"}</span><span class="year">${escapeHtml(y)}</span></div>
   <h3 class="openDetail">${escapeHtml(v.name)}</h3><div class="cardBrandLine">${logoUrl(v.brand)?logoHtml(v.brand,"cardBrandLogo"):""}<div class="brand">${escapeHtml(v.brand)}</div></div><div class="hierarchyCrumb">${escapeHtml(v.model||"")} · ${escapeHtml(displayGeneration(v))}</div>
   <div class="miniSpecs">
    <div><strong>${escapeHtml(p)}${p!=="—"?" CV":""}</strong><span>potencia</span></div>
    <div><strong>${escapeHtml(w)}${w!=="—"?" kg":""}</strong><span>peso</span></div>
    <div><strong>${escapeHtml(fmt(v.kgcv))}</strong><span>kg/CV</span></div>
   </div>
   <div class="cardActions">
    <button class="detailBtn">Ver ficha</button>
    <button class="compareBtn ${selected.has(v.id)?"selected":""}">${selected.has(v.id)?"✓ En comparador":"+ Comparar"}</button>
   </div>
  </div></article>`;
}
function bindCards(){
 $$(".vehicleCard").forEach(c=>{
   const id=c.dataset.id;
   c.querySelectorAll(".openDetail,.detailBtn").forEach(x=>x.addEventListener("click",()=>openDetail(id)));
   c.querySelector(".compareBtn").addEventListener("click",()=>toggleCompare(id));
 });
}
function openDetail(id){
 const v=vehicles.find(x=>x.id===id); if(!v)return;
 const key=[
  ["Potencia",v.power, "CV"],["Par",v.torque,"Nm"],["Peso",v.weight,"kg"],["kg/CV",v.kgcv,""]
 ];
 $("#dialogContent").innerHTML=`<div class="detailHero">
  <span class="badge">${v.type==="car"?"COCHE":"MOTO"} · ${escapeHtml(v.brand)}</span>
  <h2>${escapeHtml(v.name)}</h2><p>${escapeHtml(v.model||"")} · ${escapeHtml(displayGeneration(v))} · ${escapeHtml(v.yearText||"Año sin especificar")}</p>
  <div class="keySpecs">${key.map(([l,x,u])=>`<div><strong>${escapeHtml(fmt(x))}${x!=null&&x!==""&&u?" "+u:""}</strong><span>${l}</span></div>`).join("")}</div>
 </div>
 <div class="details"><h3>Especificaciones</h3><div class="specList">
 ${Object.entries(v.specs||{}).map(([k,x])=>`<div class="specRow"><span>${escapeHtml(k)}</span><span>${escapeHtml(fmt(x))}</span></div>`).join("")}
 </div></div>`;
 $("#vehicleDialog").showModal();
}
function toggleCompare(id){
 if(selected.has(id)) selected.delete(id);
 else if(selected.size<4) selected.add(id);
 else {alert("Puedes comparar un máximo de 4 vehículos.");return}
 updateCompareUI(); renderResults();
}
function updateCompareUI(){
 const list=[...selected].map(id=>vehicles.find(v=>v.id===id)).filter(Boolean);
 $("#compareCount").textContent=list.length;
 $("#compareNames").textContent=list.map(v=>v.name).join(" · ");
 $("#compareBar").classList.toggle("hidden",!list.length);
 renderCompare(list);
}
function renderCompare(list){
 $("#compareEmpty").style.display=list.length?"none":"block";
 if(!list.length){$("#compareTableWrap").innerHTML="";return}
 const preferred=["Cilindrada / aspiración","Cilindrada","Arquitectura","Cilindros","Potencia","Par","Peso DIN","Peso en marcha","kg/CV","0-100 km/h","Velocidad máxima","Tracción","Transmisión","Consumo","Precio actual","Precio mínimo","Altura asiento"];
 const keys=[...new Set(list.flatMap(v=>Object.keys(v.specs||{})))];
 keys.sort((a,b)=>{let ai=preferred.indexOf(a),bi=preferred.indexOf(b);ai=ai<0?999:ai;bi=bi<0?999:bi;return ai-bi||a.localeCompare(b,"es")});
 $("#compareTableWrap").innerHTML=`<table class="compareTable"><thead><tr><th>Especificación</th>${list.map(v=>`<th>${escapeHtml(v.name)}<br><button class="removeCompare" data-id="${v.id}">Quitar</button></th>`).join("")}</tr></thead>
 <tbody><tr><td>Años</td>${list.map(v=>`<td>${escapeHtml(v.yearText||"—")}</td>`).join("")}</tr>
 ${keys.map(k=>`<tr><td>${escapeHtml(k)}</td>${list.map(v=>`<td>${escapeHtml(fmt(v.specs?.[k]))}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
 $$(".removeCompare").forEach(b=>b.addEventListener("click",()=>toggleCompare(b.dataset.id)));
}
function showView(view){
 $$(".view").forEach(v=>v.classList.remove("activeView"));
 $("#"+view+"View").classList.add("activeView");
 $$(".nav[data-view]").forEach(n=>n.classList.toggle("active",n.dataset.view===view));
 window.scrollTo({top:0,behavior:"smooth"});
}
$$(".type").forEach(b=>b.addEventListener("click",()=>{$$(".type").forEach(x=>x.classList.remove("active"));b.classList.add("active");typeFilter=b.dataset.type;visible=48;applyFilters()}));
["search","brandFilter","minPower","minYear","sort"].forEach(id=>$("#"+id).addEventListener(id==="search"?"input":"change",()=>{visible=48;applyFilters()}));
$("#clearFilters").addEventListener("click",()=>{$("#search").value="";$("#brandFilter").value="";$("#minPower").value="";$("#minYear").value="";$("#sort").value="name";typeFilter="all";$$(".type").forEach(x=>x.classList.toggle("active",x.dataset.type==="all"));visible=48;applyFilters()});
$("#loadMore").addEventListener("click",()=>{visible+=48;renderResults()});
$("#closeDialog").addEventListener("click",()=>$("#vehicleDialog").close());
$("#vehicleDialog").addEventListener("click",e=>{if(e.target===$("#vehicleDialog"))$("#vehicleDialog").close()});
$("#openCompare").addEventListener("click",()=>showView("compare"));
$("#compareNav").addEventListener("click",()=>showView("compare"));
$$(".nav[data-view]").forEach(n=>n.addEventListener("click",()=>showView(n.dataset.view)));
$("#homeBtn").addEventListener("click",()=>showView("catalog"));
$("#backBrands").addEventListener("click",()=>{$("#brandBrowser").classList.add("hidden");$("#brandsLanding").classList.remove("hidden");window.scrollTo({top:0,behavior:"smooth"})});
