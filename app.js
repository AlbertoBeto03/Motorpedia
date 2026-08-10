let vehicles=[], brands=[], stats={}, hierarchy=[], brandLogos={}, motoTaxonomy={};
let typeFilter="all", visible=48, selected=new Set(), currentResults=[], timelineMode="featured";

const $=s=>document.querySelector(s), $$=s=>document.querySelectorAll(s);
const fmt=v=>v===null||v===undefined||v===""?"—":String(v);
const num=v=>{if(typeof v==="number")return v; const m=String(v??"").replace(",",".").match(/-?\d+(\.\d+)?/); return m?Number(m[0]):null};
const initials=name=>name.split(/\s+/).slice(0,2).map(x=>x[0]||"").join("");

Promise.all([
 fetch("data/vehicles.json?v=3.3.1").then(r=>r.json()),
 fetch("data/stats.json?v=3.3.1").then(r=>r.json()),
 fetch("data/brandLogos.json?v=3.3.1").then(r=>r.json()),
 fetch("data/motoTaxonomy.json?v=3.3.1&t="+Date.now()).then(r=>r.json())
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
function slugifyDomId(text){ return String(text||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,""); }
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
 timelineMode="featured";
 $("#brandsLanding").classList.add("hidden"); $("#brandBrowser").classList.remove("hidden");
 $("#brandHeader").innerHTML=`${logoUrl(brand)?logoHtml(brand,"heroBrandLogo"):`<span class="fallbackLogo">${escapeHtml(initials(brand))}</span>`}<div><p class="eyebrow">FABRICANTE</p><h2>${escapeHtml(brand)}</h2><p>${h.models.length} modelos · ${h.count} versiones en la base de datos</p></div>`;
 $("#brandTimeline").innerHTML=renderBrandTimeline(h,timelineMode);
 $("#modelGrid").innerHTML=h.models.map(m=>`<article class="modelCard" id="model-${escapeAttr(slugifyDomId(m.name))}" data-model-card="${escapeAttr(m.name)}"><div class="modelTop"><h3>${escapeHtml(m.name)}</h3><span>${m.count} versiones · ${m.generations.length} generaciones</span></div><div class="generations">${m.generations.map(g=>`<button class="generationBtn" data-brand="${escapeAttr(brand)}" data-model="${escapeAttr(m.name)}" data-generation="${escapeAttr(g.rawName||g.name)}"><span class="generationLeft"><strong>${escapeHtml(g.name)}</strong><small>${escapeHtml(genYears(g))}</small></span><span class="generationRight"><span>${g.count} versiones</span><b>→</b></span></button>`).join("")}</div></article>`).join("");
 $$(".generationBtn").forEach(btn=>btn.addEventListener("click",()=>openGeneration(btn.dataset.brand,btn.dataset.model,btn.dataset.generation)));
 bindTimelineInteractions(h);
 bindLogoFallbacks($("#brandBrowser"));
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

function modelRange(model){
 const starts=model.generations.map(g=>generationSpan(g).start).filter(Number.isFinite);
 const ends=model.generations.map(g=>generationSpan(g).end).filter(Number.isFinite);
 return {
   start:starts.length?Math.min(...starts):null,
   end:ends.length?Math.max(...ends):null
 };
}
function timelineStep(range){
 if(range<=15) return 1;
 if(range<=30) return 2;
 if(range<=55) return 5;
 if(range<=110) return 10;
 return 20;
}
function modelTone(name){
 let hash=0;
 for(const ch of String(name||"")) hash=((hash<<5)-hash)+ch.charCodeAt(0);
 return `tone${(Math.abs(hash)%6)+1}`;
}
function timelineModelScore(model){
 const span=Math.max(1,(model.yearEnd??model.yearStart??0)-(model.yearStart??model.yearEnd??0)+1);
 return model.count*3.3 + model.generations.length*8 + Math.min(span,35)*1.1;
}
function curateTimelineModels(enriched,limit=18){
 if(enriched.length<=limit) return [...enriched];

 const selected=new Map();
 const add=model=>{ if(model&&selected.size<limit) selected.set(model.name,model); };

 // Strongest families by data richness.
 [...enriched]
   .sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name,"es"))
   .slice(0,Math.min(11,limit))
   .forEach(add);

 // Historical anchors: early and recent families must not disappear simply
 // because modern models have more versions in the database.
 [...enriched]
   .sort((a,b)=>(a.yearStart??9999)-(b.yearStart??9999)||b.score-a.score)
   .slice(0,3)
   .forEach(add);
 [...enriched]
   .sort((a,b)=>(b.yearEnd??0)-(a.yearEnd??0)||b.score-a.score)
   .slice(0,3)
   .forEach(add);

 // Give long histories some temporal coverage.
 const allStarts=enriched.map(x=>x.yearStart).filter(Number.isFinite);
 const allEnds=enriched.map(x=>x.yearEnd).filter(Number.isFinite);
 const minYear=allStarts.length?Math.min(...allStarts):null;
 const maxYear=allEnds.length?Math.max(...allEnds):null;
 if(Number.isFinite(minYear)&&Number.isFinite(maxYear)){
   const bucket=20;
   for(let from=Math.floor(minYear/bucket)*bucket;from<=maxYear&&selected.size<limit;from+=bucket){
     const to=from+bucket-1;
     const candidates=enriched
       .filter(x=>Number.isFinite(x.yearStart)&&Number.isFinite(x.yearEnd)&&x.yearStart<=to&&x.yearEnd>=from)
       .sort((a,b)=>b.score-a.score);
     add(candidates[0]);
   }
 }

 // Fill any remaining spaces with the strongest omitted models.
 [...enriched]
   .sort((a,b)=>b.score-a.score)
   .forEach(add);

 return [...selected.values()];
}
function brandTimelineData(brandData,mode="featured"){
 const enriched=brandData.models.map(model=>{
   const range=modelRange(model);
   const yearStart=Number.isFinite(range.start)?range.start:null;
   const yearEnd=Number.isFinite(range.end)?range.end:yearStart;
   const span=(Number.isFinite(yearStart)&&Number.isFinite(yearEnd))?Math.max(1,yearEnd-yearStart+1):1;
   const item={...model,yearStart,yearEnd,span};
   item.score=timelineModelScore(item);
   return item;
 }).filter(model=>Number.isFinite(model.yearStart)&&Number.isFinite(model.yearEnd));

 if(!enriched.length){
   return {items:[],allItems:[],minYear:null,maxYear:null,hiddenCount:0};
 }

 const allItems=[...enriched].sort((a,b)=>
   (a.yearStart??9999)-(b.yearStart??9999) ||
   (a.yearEnd??9999)-(b.yearEnd??9999) ||
   b.count-a.count ||
   a.name.localeCompare(b.name,"es")
 );
 const starts=allItems.map(x=>x.yearStart);
 const ends=allItems.map(x=>x.yearEnd);
 const minYear=Math.min(...starts);
 const maxYear=Math.max(...ends);

 const chosen=mode==="all"?allItems:curateTimelineModels(allItems,18);
 const chosenNames=new Set(chosen.map(x=>x.name));
 const items=allItems.filter(x=>chosenNames.has(x.name));

 return {
   items,
   allItems,
   minYear,
   maxYear,
   hiddenCount:Math.max(0,allItems.length-items.length)
 };
}
function yearRangeLabel(start,end){
 if(Number.isFinite(start)&&Number.isFinite(end)){
   return start===end?String(start):`${start}–${end}`;
 }
 if(Number.isFinite(start)) return `${start}–`;
 if(Number.isFinite(end)) return `–${end}`;
 return "Años no definidos";
}
function timelineTicks(minYear,maxYear){
 if(!Number.isFinite(minYear)||!Number.isFinite(maxYear)) return [];
 const step=timelineStep(maxYear-minYear);
 const first=Math.ceil(minYear/step)*step;
 const out=[minYear];
 for(let year=first;year<maxYear;year+=step){
   if(year!==minYear) out.push(year);
 }
 if(maxYear!==minYear) out.push(maxYear);
 return [...new Set(out)].sort((a,b)=>a-b);
}
function brandInsights(brandData,timeline){
 const first=timeline.allItems[0];
 const latest=[...timeline.allItems].sort((a,b)=>(b.yearEnd??0)-(a.yearEnd??0)||(b.yearStart??0)-(a.yearStart??0))[0];
 const longest=[...timeline.allItems].sort((a,b)=>b.span-a.span||b.count-a.count)[0];
 const totalGenerations=brandData.models.reduce((sum,m)=>sum+m.generations.length,0);
 return [
   first?{label:"Inicio de la historia",value:`${first.name} · ${yearRangeLabel(first.yearStart,first.yearEnd)}`} : null,
   latest?{label:"Modelo más reciente",value:`${latest.name} · ${yearRangeLabel(latest.yearStart,latest.yearEnd)}`} : null,
   longest?{label:"Familia más longeva",value:`${longest.name} · ${longest.span} años`} : null,
   {label:"Generaciones registradas",value:String(totalGenerations)}
 ].filter(Boolean);
}
function generationRange(g){
 const {start,end}=generationSpan(g);
 return {
   start:Number.isFinite(start)?start:null,
   end:Number.isFinite(end)?end:(Number.isFinite(start)?start:null)
 };
}
function generationTone(modelName,index){
 const base=Math.abs([...String(modelName||"")].reduce((h,ch)=>((h<<5)-h)+ch.charCodeAt(0),0));
 return `genTone${((base+index)%6)+1}`;
}
function renderTimelineAxis(ticks,minYear,range){
 return `<div class="timelineAxisRow">
   <div class="timelineAxisTitle">Modelo / generación</div>
   <div class="timelineAxisTrack">
     ${ticks.map((year,index)=>{
       const left=((year-minYear)/range)*100;
       const edge=index===0?"axisStart":index===ticks.length-1?"axisEnd":"";
       return `<span class="timelineAxisTick ${edge}" style="left:${left.toFixed(3)}%"><i>${escapeHtml(String(year))}</i></span>`;
     }).join("")}
   </div>
 </div>`;
}
function renderGenerationRows(model,ticks,minYear,range){
 const valid=model.generations
   .map((g,index)=>({g,index,...generationRange(g)}))
   .filter(x=>Number.isFinite(x.start)&&Number.isFinite(x.end))
   .sort((a,b)=>a.start-b.start||a.end-b.end||a.g.name.localeCompare(b.g.name,"es"));

 if(!valid.length) return "";

 return `<div class="timelineGenerationRows">
   ${valid.map(({g,index,start,end})=>{
     const span=Math.max(1,end-start+1);
     const left=((start-minYear)/range)*100;
     const width=Math.max((span/range)*100,2.2);
     const tone=generationTone(model.name,index);
     return `<button class="timelineGenerationRow" type="button"
       data-brand="${escapeAttr(model.__brand||"")}"
       data-model="${escapeAttr(model.name)}"
       data-generation="${escapeAttr(g.rawName||g.name)}">
       <div class="timelineGenerationLabel">
         <span class="timelineBranch"></span>
         <div>
           <strong>${escapeHtml(g.name)}</strong>
           <span>${escapeHtml(yearRangeLabel(start,end))} · ${g.count} ${g.count===1?"versión":"versiones"}</span>
         </div>
       </div>
       <div class="timelineTrack timelineGenerationTrack">
         ${ticks.map(year=>`<span class="timelineGridLine" style="left:${(((year-minYear)/range)*100).toFixed(3)}%"></span>`).join("")}
         <div class="timelineGenerationBar ${tone}" style="left:${left.toFixed(3)}%;width:${width.toFixed(3)}%">
           <span>${escapeHtml(g.name)}</span>
           <small>${escapeHtml(yearRangeLabel(start,end))}</small>
         </div>
       </div>
     </button>`;
   }).join("")}
 </div>`;
}
function renderBrandTimeline(brandData,mode="featured"){
 const timeline=brandTimelineData(brandData,mode);
 if(!timeline.items.length){
   return `<section class="timelineSection"><div class="sectionTitle compact"><p class="eyebrow">CRONOLOGÍA</p><h3>Historia de la gama</h3><p>No hay suficientes años en las fichas para construir una cronología fiable.</p></div></section>`;
 }

 const range=Math.max(1,(timeline.maxYear-timeline.minYear)+1);
 const ticks=timelineTicks(timeline.minYear,timeline.maxYear);
 const insights=brandInsights(brandData,timeline);

 const blocks=timeline.items.map(model=>{
   model.__brand=brandData.brand;
   const startPct=((model.yearStart-timeline.minYear)/range)*100;
   const widthPct=Math.max((model.span/range)*100,2.8);
   const tone=modelTone(model.name);
   const visibleGenerations=model.generations.filter(g=>{
     const r=generationRange(g);
     return Number.isFinite(r.start)&&Number.isFinite(r.end);
   }).length;

   return `<article class="timelineModelBlock">
     <button class="timelineModelRow" type="button" data-model="${escapeAttr(model.name)}">
       <div class="timelineModelLabel">
         <strong>${escapeHtml(model.name)}</strong>
         <span>${visibleGenerations} ${visibleGenerations===1?"generación":"generaciones"} · ${model.count} versiones</span>
       </div>
       <div class="timelineTrack timelineModelTrack">
         ${ticks.map(year=>`<span class="timelineGridLine" style="left:${(((year-timeline.minYear)/range)*100).toFixed(3)}%"></span>`).join("")}
         <div class="timelineBar ${tone}" style="left:${startPct.toFixed(3)}%;width:${widthPct.toFixed(3)}%">
           <span class="timelineBarName">${escapeHtml(model.name)}</span>
           <span class="timelineBarYears">${escapeHtml(yearRangeLabel(model.yearStart,model.yearEnd))}</span>
         </div>
       </div>
     </button>
     ${renderGenerationRows(model,ticks,timeline.minYear,range)}
   </article>`;
 }).join("");

 const totalGenerations=timeline.items.reduce((sum,m)=>sum+m.generations.filter(g=>{
   const r=generationRange(g);
   return Number.isFinite(r.start)&&Number.isFinite(r.end);
 }).length,0);

 return `<section class="timelineSection">
   <div class="timelineTitleRow">
     <div class="sectionTitle compact">
       <p class="eyebrow">HISTORIA DE LA MARCA</p>
       <h3>Timeline de modelos y generaciones</h3>
       <p>Cada familia tiene su barra principal y, debajo, todas sus generaciones alineadas sobre la misma escala temporal. Pulsa una generación para abrir directamente sus versiones.</p>
     </div>
     <div class="timelineModes" aria-label="Modelos mostrados en la cronología">
       <button type="button" class="timelineModeBtn ${mode==="featured"?"active":""}" data-mode="featured">Principales</button>
       <button type="button" class="timelineModeBtn ${mode==="all"?"active":""}" data-mode="all">Todos</button>
     </div>
   </div>

   <div class="timelineInsights">
     ${insights.map(item=>`<div class="timelineInsight"><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(item.value)}</strong></div>`).join("")}
   </div>

   <div class="timelineBoard">
     <div class="timelineBoardTop">
       <div class="timelineLegend">
         <span class="legendBar"></span>Modelo
         <span class="legendGenBar"></span>Generación
       </div>
       <div class="timelineMeta">
         ${timeline.items.length} modelos · ${totalGenerations} generaciones visibles
         ${mode==="featured"&&timeline.hiddenCount>0?` · ${timeline.hiddenCount} modelos ocultos`:""}
       </div>
     </div>
     <div class="timelineViewport">
       <div class="timelineCanvas timelineCanvasDetailed">
         ${renderTimelineAxis(ticks,timeline.minYear,range)}
         <div class="timelineRowsDetailed">${blocks}</div>
       </div>
     </div>
   </div>
   <div class="timelineHelp">
     <span><b>Click en modelo</b> → salta a su tarjeta</span>
     <span><b>Click en generación</b> → abre sus versiones</span>
   </div>
 </section>`;
}
function bindTimelineInteractions(brandData){
 $$(".timelineModelRow").forEach(row=>row.addEventListener("click",()=>{
   const target=document.querySelector(`#model-${slugifyDomId(row.dataset.model)}`);
   if(target){
     target.scrollIntoView({behavior:"smooth",block:"start"});
     target.classList.add("flashCard");
     setTimeout(()=>target.classList.remove("flashCard"),1400);
   }
 }));

 $$(".timelineGenerationRow").forEach(row=>row.addEventListener("click",()=>{
   openGeneration(
     row.dataset.brand,
     row.dataset.model,
     row.dataset.generation
   );
 }));

 $$(".timelineModeBtn").forEach(btn=>btn.addEventListener("click",()=>{
   timelineMode=btn.dataset.mode||"featured";
   $("#brandTimeline").innerHTML=renderBrandTimeline(brandData,timelineMode);
   bindTimelineInteractions(brandData);
 }));
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

const RATING_KEYS=[
 "Valoración global","Sensaciones","Comodidad","Facilidad","Fiabilidad",
 "Mantenimiento","Sonido","Estética","Ocupante","Carga"
];
const RATING_SET=new Set(RATING_KEYS);
const PRICE_KEYS=new Set([
 "Precio actual","Precio Alemania","Precio original","Precio ene. 2025",
 "Precio mínimo","Precio máximo"
]);
const SPEC_UNITS={
 "Potencia":"CV",
 "Potencia medida":"CV",
 "Par":"Nm",
 "Peso DIN":"kg",
 "Peso en marcha":"kg",
 "Peso en seco":"kg",
 "Cilindrada":"cc",
 "RPM potencia":"rpm",
 "RPM par":"rpm",
 "Altura asiento":"mm",
 "0-100 km/h":"s",
 "80-120 km/h":"s",
 "400 m":"s",
 "100-0 km/h":"m",
 "Velocidad máxima":"km/h",
 "Consumo":"L/100 km",
 "Autovía":"L/100 km",
 "CO₂":"g/km"
};
function numericValue(value){
 if(typeof value==="number"&&Number.isFinite(value)) return value;
 if(typeof value!=="string") return null;
 const s=value.trim();
 if(!/^-?\d+(?:[.,]\d+)?$/.test(s)) return null;
 const n=Number(s.replace(",","."));
 return Number.isFinite(n)?n:null;
}
function formatNumber(value,minDecimals=0,maxDecimals=2){
 const n=numericValue(value);
 if(n===null) return fmt(value);
 return new Intl.NumberFormat("es-ES",{
   useGrouping:true,
   minimumFractionDigits:minDecimals,
   maximumFractionDigits:maxDecimals
 }).format(n);
}
function formatKgCv(value){
 const n=numericValue(value);
 return n===null?fmt(value):formatNumber(n,2,2);
}
function formatCurrency(value){
 const n=numericValue(value);
 if(n===null) return fmt(value);
 return `${formatNumber(n,0,0)} €`;
}
function formatDimensions(value){
 if(value===null||value===undefined||value==="") return "—";
 const s=String(value);
 const formatted=s.replace(/\d{4,}/g,m=>formatNumber(Number(m),0,0));
 return `${formatted.replaceAll("-", "–").replaceAll("/", " / ")} mm`;
}
function formatDisplacementAspiration(value){
 if(value===null||value===undefined||value==="") return "—";
 const s=String(value).trim();
 const match=s.match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/);
 if(!match) return s;
 const displacement=formatNumber(match[1],0,0);
 const aspiration=match[2].trim();
 return aspiration?`${displacement} cc · ${aspiration}`:`${displacement} cc`;
}
function formatSpecValue(key,value){
 if(value===null||value===undefined||value==="") return "—";
 if(key==="kg/CV") return formatKgCv(value);
 if(key==="Aspiración") return String(value);
 if(RATING_SET.has(key)){
   const n=numericValue(value);
   return n===null?fmt(value):`${formatNumber(n,1,1)} / 5`;
 }
 if(PRICE_KEYS.has(key)) return formatCurrency(value);
 if(key==="Batalla / Largo / Ancho / Alto") return formatDimensions(value);
 if(key==="Cilindrada / aspiración") return formatDisplacementAspiration(value);

 const unit=SPEC_UNITS[key];
 if(unit){
   const n=numericValue(value);
   if(n!==null){
     const decimals=(key==="Par"||key==="Consumo"||key==="Autovía")?1:
                    (key==="0-100 km/h"||key==="80-120 km/h"||key==="400 m"||key==="100-0 km/h")?2:0;
     return `${formatNumber(n,0,decimals)} ${unit}`;
   }
   const raw=String(value).trim();
   if(raw==="-"||raw==="—") return raw;
   // Avoid duplicating the unit if the spreadsheet already includes it.
   return raw.toLowerCase().includes(unit.toLowerCase())?raw:`${raw} ${unit}`;
 }

 const n=numericValue(value);
 return n===null?String(value):formatNumber(n,0,2);
}
function motoPriceRangeText(v){
 if(v?.type!=="moto") return null;
 const min=v.specs?.["Precio mínimo"];
 const max=v.specs?.["Precio máximo"];
 const nMin=numericValue(min), nMax=numericValue(max);
 if(nMin===null&&nMax===null) return null;
 if(nMin!==null&&nMax!==null){
   if(nMin===nMax) return formatCurrency(nMin);
   return `${formatNumber(nMin,0,0)} – ${formatNumber(nMax,0,0)} €`;
 }
 return formatCurrency(nMin!==null?nMin:nMax);
}
function priceRangeHtml(v){
 const text=motoPriceRangeText(v);
 if(!text) return "";
 return `<div class="priceBand"><span>Valor</span><strong>${escapeHtml(text)}</strong></div>`;
}
function ratingHtml(v){
 if(v?.type!=="moto") return "";
 const ratings=RATING_KEYS
   .map(key=>[key,numericValue(v.specs?.[key])])
   .filter(([,value])=>value!==null);
 if(!ratings.length) return "";

 return `<section class="ratingsSection">
   <div class="detailsSectionHead">
     <div><span class="detailKicker">VALORACIONES</span><h3>Experiencia y uso</h3></div>
     <span class="ratingScale">0 — 5</span>
   </div>
   <div class="ratingsGrid">
     ${ratings.map(([key,value])=>{
       const clamped=Math.max(0,Math.min(5,value));
       const percent=(clamped/5)*100;
       const global=key==="Valoración global";
       return `<div class="ratingItem ${global?"ratingGlobal":""}">
         <div class="ratingTop"><span>${escapeHtml(key)}</span><strong>${escapeHtml(formatNumber(value,1,1))}</strong></div>
         <div class="ratingTrack" aria-label="${escapeAttr(key)}: ${escapeAttr(formatNumber(value,1,1))} de 5">
           <span class="ratingFill" style="width:${percent.toFixed(2)}%"></span>
         </div>
       </div>`;
     }).join("")}
   </div>
 </section>`;
}
const SPEC_GROUP_DEFS=[
 {
   id:"engine",
   title:"Motor y transmisión",
   subtitle:"Mecánica, entrega de potencia y cadena cinemática",
   keys:[
     "Cilindrada","Aspiración","Arquitectura","Cilindros","Combustible",
     "Motor","Culata","Alimentación","Potencia","RPM potencia","Potencia medida",
     "Par","RPM par","Transmisión","Tracción","Vida útil motor"
   ]
 },
 {
   id:"dimensions",
   title:"Dimensiones y peso",
   subtitle:"Masa, proporciones y ergonomía",
   keys:[
     "Peso DIN","Peso en marcha","Peso en seco",
     "Batalla / Largo / Ancho / Alto","Altura asiento","kg/CV"
   ]
 },
 {
   id:"chassis",
   title:"Chasis y parte ciclo",
   subtitle:"Estructura, suspensiones, frenos y neumáticos",
   keys:[
     "Chasis","Suspensión delantera","Suspensión trasera",
     "Freno delantero","Freno trasero","Neumático delantero","Neumático trasero"
   ]
 },
 {
   id:"performance",
   title:"Prestaciones",
   subtitle:"Aceleración, frenada, velocidad y tiempos",
   keys:[
     "0-100 km/h","80-120 km/h","400 m","Velocidad máxima","100-0 km/h",
     "ZePerfs","Deportividad","Pista","Tsukuba","Hockenheim Short","Balocco","Auto Zeitung"
   ]
 },
 {
   id:"efficiency",
   title:"Eficiencia y aerodinámica",
   subtitle:"Consumo, emisiones y resistencia al avance",
   keys:["Consumo","Autovía","CO₂","Eficiencia","Cx","SCx"]
 },
 {
   id:"market",
   title:"Mercado y valor",
   subtitle:"Referencias económicas de la ficha",
   keys:["Precio actual","Precio Alemania","Precio original","Precio ene. 2025"]
 },
 {
   id:"usage",
   title:"Uso y homologación",
   subtitle:"Categoría, limitación y orientación de uso",
   keys:["Tipo","A2"]
 }
];

function aspirationLabel(code){
 const raw=String(code||"").trim().toUpperCase();
 const labels={
   "NA":"Atmosférico",
   "T":"Turbo",
   "TT":"Biturbo",
   "C":"Compresor",
   "T+C":"Turbo + compresor",
   "E":"Eléctrico"
 };
 return labels[raw]||String(code||"").trim()||"—";
}
function splitCarDisplacementAspiration(value){
 if(value===null||value===undefined||value==="") return null;
 const text=String(value).trim();
 const match=text.match(/^(\d+(?:[.,]\d+)?)\s*(.*?)$/);
 if(!match) return null;
 return {
   displacement:match[1],
   aspiration:aspirationLabel(match[2])
 };
}
function normalizedDetailEntries(v){
 const out=[];
 Object.entries(v.specs||{}).forEach(([key,value])=>{
   if(RATING_SET.has(key)) return;
   if(v.type==="moto"&&(key==="Precio mínimo"||key==="Precio máximo")) return;

   if(key==="Cilindrada / aspiración"){
     const split=splitCarDisplacementAspiration(value);
     if(split){
       out.push({key:"Cilindrada",value:split.displacement});
       out.push({key:"Aspiración",value:split.aspiration});
       return;
     }
   }
   out.push({key,value});
 });
 return out;
}
function specGroupForKey(key){
 for(const group of SPEC_GROUP_DEFS){
   if(group.keys.includes(key)) return group.id;
 }
 return "other";
}
function groupedDetailSpecs(v){
 const entries=normalizedDetailEntries(v);
 const groups=new Map();

 SPEC_GROUP_DEFS.forEach(def=>{
   groups.set(def.id,{...def,entries:[]});
 });
 groups.set("other",{
   id:"other",
   title:"Otros datos",
   subtitle:"Información adicional disponible en la base",
   keys:[],
   entries:[]
 });

 entries.forEach(entry=>{
   groups.get(specGroupForKey(entry.key)).entries.push(entry);
 });

 for(const group of groups.values()){
   if(group.keys.length){
     group.entries.sort((a,b)=>group.keys.indexOf(a.key)-group.keys.indexOf(b.key));
   }else{
     group.entries.sort((a,b)=>a.key.localeCompare(b.key,"es"));
   }
 }

 return [...groups.values()].filter(group=>group.entries.length);
}
function specGroupHtml(group){
 const wide=group.entries.length>=7||group.id==="performance";
 return `<section class="specGroup ${wide?"specGroupWide":""}" data-spec-group="${escapeAttr(group.id)}">
   <div class="specGroupHead">
     <div>
       <span class="specGroupKicker">${escapeHtml(group.title.toUpperCase())}</span>
       <h4>${escapeHtml(group.title)}</h4>
       <p>${escapeHtml(group.subtitle)}</p>
     </div>
     <span class="specGroupCount">${group.entries.length}</span>
   </div>
   <div class="specGroupRows">
     ${group.entries.map(({key,value})=>`
       <div class="specRow">
         <span>${escapeHtml(key)}</span>
         <span>${escapeHtml(formatSpecValue(key,value))}</span>
       </div>`).join("")}
   </div>
 </section>`;
}
function displayGeneration(v){
 const raw=String(v?.generation||"").trim();
 if(!raw || raw==="Sin especificar") return "Primera generación";
 return raw;
}
function cardHtml(v){
 const p=v.power==null?"—":`${formatNumber(v.power,0,1)} CV`;
 const w=v.weight==null?"—":`${formatNumber(v.weight,0,0)} kg`;
 const ratio=formatKgCv(v.kgcv);
 const y=v.yearText||fmt(v.yearStart);
 return `<article class="vehicleCard" data-id="${v.id}">
  <div class="vehicleVisual openDetail"><span class="vehicleMark">${escapeHtml(initials(v.brand))}</span></div>
  <div class="cardBody">
   <div class="cardTop"><span class="cardType">${v.type==="car"?"COCHE":"MOTO"}</span><span class="year">${escapeHtml(y)}</span></div>
   <h3 class="openDetail">${escapeHtml(v.name)}</h3><div class="cardBrandLine">${logoUrl(v.brand)?logoHtml(v.brand,"cardBrandLogo"):""}<div class="brand">${escapeHtml(v.brand)}</div></div><div class="hierarchyCrumb">${escapeHtml(v.model||"")} · ${escapeHtml(displayGeneration(v))}</div>
   <div class="miniSpecs">
    <div><strong>${escapeHtml(p)}</strong><span>potencia</span></div>
    <div><strong>${escapeHtml(w)}</strong><span>peso</span></div>
    <div><strong>${escapeHtml(ratio)}</strong><span>kg/CV</span></div>
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
  ["Potencia",v.power],["Par",v.torque],["Peso",v.weight],["kg/CV",v.kgcv]
 ];
 const keyValue=(label,value)=>{
   if(label==="Potencia") return value==null?"—":`${formatNumber(value,0,1)} CV`;
   if(label==="Par") return value==null?"—":`${formatNumber(value,0,1)} Nm`;
   if(label==="Peso") return value==null?"—":`${formatNumber(value,0,0)} kg`;
   return formatKgCv(value);
 };
 const specGroups=groupedDetailSpecs(v);
 $("#dialogContent").innerHTML=`<div class="detailHero">
  <span class="badge">${v.type==="car"?"COCHE":"MOTO"} · ${escapeHtml(v.brand)}</span>
  <h2>${escapeHtml(v.name)}</h2>
  <p>${escapeHtml(v.model||"")} · ${escapeHtml(displayGeneration(v))} · ${escapeHtml(v.yearText||"Año sin especificar")}</p>
  <div class="keySpecs">${key.map(([label,value])=>`<div><strong>${escapeHtml(keyValue(label,value))}</strong><span>${escapeHtml(label)}</span></div>`).join("")}</div>
  ${priceRangeHtml(v)}
 </div>
 <div class="details">
   ${ratingHtml(v)}
   <section class="specsSection">
     <div class="detailsSectionHead">
       <div><span class="detailKicker">FICHA TÉCNICA</span><h3>Especificaciones</h3></div>
       <span class="specSectionHint">${specGroups.length} bloques</span>
     </div>
     <div class="specGroups">
       ${specGroups.map(specGroupHtml).join("")}
     </div>
   </section>
 </div>`;
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
 const preferred=[
   "Cilindrada / aspiración","Cilindrada","Arquitectura","Cilindros",
   "Potencia","Par","Peso DIN","Peso en marcha","Peso en seco","kg/CV",
   "0-100 km/h","Velocidad máxima","Tracción","Transmisión","Consumo",
   "Precio actual","Precio original","Altura asiento",
   "Valoración global","Sensaciones","Comodidad","Facilidad","Fiabilidad",
   "Mantenimiento","Sonido","Estética","Ocupante","Carga"
 ];
 const keys=[...new Set(list.flatMap(v=>Object.keys(v.specs||{})))]
   .filter(k=>k!=="Precio mínimo"&&k!=="Precio máximo");
 keys.sort((a,b)=>{
   let ai=preferred.indexOf(a),bi=preferred.indexOf(b);
   ai=ai<0?999:ai;bi=bi<0?999:bi;
   return ai-bi||a.localeCompare(b,"es");
 });
 const hasMotoValue=list.some(v=>motoPriceRangeText(v));
 const valueRow=hasMotoValue
   ?`<tr><td>Valor</td>${list.map(v=>`<td>${escapeHtml(motoPriceRangeText(v)||"—")}</td>`).join("")}</tr>`
   :"";
 $("#compareTableWrap").innerHTML=`<table class="compareTable"><thead><tr><th>Especificación</th>${list.map(v=>`<th>${escapeHtml(v.name)}<br><button class="removeCompare" data-id="${v.id}">Quitar</button></th>`).join("")}</tr></thead>
 <tbody>
   <tr><td>Años</td>${list.map(v=>`<td>${escapeHtml(v.yearText||"—")}</td>`).join("")}</tr>
   ${valueRow}
   ${keys.map(k=>`<tr><td>${escapeHtml(k)}</td>${list.map(v=>`<td>${escapeHtml(formatSpecValue(k,v.specs?.[k]))}</td>`).join("")}</tr>`).join("")}
 </tbody></table>`;
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
