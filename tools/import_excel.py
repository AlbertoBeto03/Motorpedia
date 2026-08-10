#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path
import csv
import hashlib
import json
import re
import unicodedata
import xml.etree.ElementTree as ET
import zipfile

ROOT = Path(__file__).resolve().parents[1]
XLSX = ROOT / "Base de Datos.xlsx"
DATA_DIR = ROOT / "data"
MEDIA_ROOT = ROOT / "assets" / "vehicles"
ARTICLE_ROOT = ROOT / "content" / "articles"
DATA_DIR.mkdir(parents=True, exist_ok=True)

SHEET_CARS = "Coches"
SHEET_MOTOS = "Copia de Motos"

BRAND_PREFIXES = sorted([
    "Alfa Romeo","Aston Martin","Land Rover","Rolls-Royce","Royal Enfield",
    "Harley-Davidson","Moto Guzzi","MV Agusta","Mercedes-Benz",
    "Abarth","Acura","Alpine","Aprilia","Ascari","Audi","Benelli","Bentley",
    "BMW","Bugatti","Buick","Cadillac","CFMoto","Chevrolet","Chrysler",
    "Citroën","Citroen","Cupra","Dacia","Daewoo","Daihatsu","Dodge","Ducati",
    "Ferrari","Fiat","Ford","Genesis","Honda","Hummer","Husqvarna","Hyundai",
    "Indian","Infiniti","Isuzu","Jaguar","Jeep","Kawasaki","Kia","Koenigsegg",
    "KTM","Lada","Lamborghini","Lancia","Lexus","Lotus","Maserati","Mazda",
    "McLaren","Mercedes","MG","Mini","MINI","Mitsubishi","Morgan","Nissan",
    "Opel","Pagani","Peugeot","Polestar","Pontiac","Porsche","Renault","Saab",
    "Seat","SEAT","Skoda","Škoda","Smart","Subaru","Suzuki","Tesla","Toyota",
    "Triumph","Vespa","Volkswagen","Volvo","Voge","Yamaha","Zontes"
], key=len, reverse=True)

ROMANS={"I","II","III","IV","V","VI","VII","VIII","IX","X"}
GEN_WORDS={"MK1","MK2","MK3","MK4","MK5","MK6","MK7","MK8",
           "MKI","MKII","MKIII","MKIV","MKV","MKVI","MKVII","MKVIII"}

def clean(v):
    if v is None:return None
    if isinstance(v,str):
        v=v.strip()
        return v if v else None
    return v

def strip_accents(text):
    return "".join(ch for ch in unicodedata.normalize("NFD",str(text))
                   if unicodedata.category(ch)!="Mn")

def slugify(text):
    text=strip_accents(text).lower()
    return re.sub(r"[^a-z0-9]+","-",text).strip("-") or "vehicle"

def normalize_header(v):
    if v is None:return ""
    return re.sub(r"[^a-z0-9]+"," ",strip_accents(v).lower()).strip()

def brand_from_name(name):
    s=str(name or "").strip(); low=s.lower()
    for brand in BRAND_PREFIXES:
        if low==brand.lower() or low.startswith(brand.lower()+" "):
            if brand=="Citroen":return "Citroën"
            if brand=="Mercedes":return "Mercedes-Benz"
            return brand
    return s.split()[0] if s else "Sin marca"

def year_bounds(v):
    if v is None:return None,None
    if isinstance(v,(int,float)):
        y=int(v);return y,y
    years=[int(x) for x in re.findall(r"\b(19\d{2}|20\d{2})\b",str(v))]
    return (min(years),max(years)) if years else (None,None)

def col_to_idx(ref):
    m=re.match(r"([A-Z]+)",ref);n=0
    for ch in m.group(1):n=n*26+ord(ch)-64
    return n-1

def read_xlsx():
    with zipfile.ZipFile(XLSX) as zf:
        shared=[]
        if "xl/sharedStrings.xml" in zf.namelist():
            root=ET.fromstring(zf.read("xl/sharedStrings.xml"))
            ns0="{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
            for si in root.iter(ns0+"si"):
                shared.append("".join((t.text or "") for t in si.iter(ns0+"t")))

        wbxml=ET.fromstring(zf.read("xl/workbook.xml"))
        ns={"a":"http://schemas.openxmlformats.org/spreadsheetml/2006/main",
            "r":"http://schemas.openxmlformats.org/officeDocument/2006/relationships"}
        sheets=[(s.attrib["name"],s.attrib["{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"])
                for s in wbxml.find("a:sheets",ns)]
        rels=ET.fromstring(zf.read("xl/_rels/workbook.xml.rels"))
        relmap={r.attrib["Id"]:r.attrib["Target"] for r in rels}
        paths={name:"xl/"+relmap[rid] for name,rid in sheets}

        def read_sheet(path):
            root=ET.fromstring(zf.read(path))
            ns0="{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
            rows=[]
            for row in root.iter(ns0+"row"):
                vals={}
                for c in row.findall(ns0+"c"):
                    idx=col_to_idx(c.attrib.get("r","A1"))
                    t=c.attrib.get("t");v=c.find(ns0+"v");inline=c.find(ns0+"is")
                    value=None
                    if t=="s" and v is not None:value=shared[int(v.text)]
                    elif t=="inlineStr" and inline is not None:
                        value="".join((tt.text or "") for tt in inline.iter(ns0+"t"))
                    elif t=="b" and v is not None:value=v.text=="1"
                    elif v is not None:
                        raw=v.text
                        try:
                            num=float(raw);value=int(num) if num.is_integer() else num
                        except Exception:value=raw
                    vals[idx]=value
                if vals:
                    arr=[None]*(max(vals)+1)
                    for i,value in vals.items():arr[i]=value
                    rows.append(arr)
            max_len=max((len(r) for r in rows),default=0)
            return [r+[None]*(max_len-len(r)) for r in rows]

        return read_sheet(paths[SHEET_CARS]),read_sheet(paths[SHEET_MOTOS])

def header_indexes(rows):
    headers=rows[0] if rows else []
    norm={normalize_header(v):i for i,v in enumerate(headers) if clean(v) is not None}
    def find(*names):
        for name in names:
            idx=norm.get(normalize_header(name))
            if idx is not None:return idx
        return None
    return {
        "id":find("Motorpedia ID","Motorpedia_ID","ID Motorpedia"),
        "model":find("Motorpedia Modelo","Motorpedia_Modelo","Modelo Motorpedia"),
        "generation":find("Motorpedia Generación","Motorpedia Generacion",
                          "Motorpedia_Generacion","Generación Motorpedia")
    }

def optional_cell(row,idx):
    return clean(row[idx]) if idx is not None and idx<len(row) else None

def strip_brand(v):
    name=str(v["name"] or "").strip();brand=str(v["brand"] or "").strip()
    if brand and name.lower().startswith(brand.lower()+" "):
        return name[len(brand):].strip()
    return name

def paren_generation(text):
    for m in re.finditer(r"\(([^)]+)\)",text):
        g=m.group(1).strip()
        if 1<=len(g)<=12 and re.search(r"[A-Za-z]",g):return g
    return None

def parse_car_taxonomy(v):
    brand=v["brand"];s=strip_brand(v);gen=paren_generation(s)
    if brand=="BMW":
        m=re.match(r"([1-8])(?:\s|\()",s)
        if m:return f"Serie {m.group(1)}",gen or "Sin especificar"
        for fam in ["Z3","Z4","Z8","X1","X2","X3","X4","X5","X6","X7","M1"]:
            if re.match(rf"{re.escape(fam)}(?:\s|\()",s,re.I):
                return fam,gen or "Sin especificar"
    if brand in {"MB","Mercedes-Benz"}:
        for fam,label in [("AMG GT","AMG GT"),("CLK","CLK"),("CLS","CLS"),("CLA","CLA"),
                          ("GLE","GLE"),("GLS","GLS"),("SLK","SLK"),("SL","SL"),
                          ("A","Clase A"),("C","Clase C"),("E","Clase E"),("S","Clase S"),("G","Clase G")]:
            if re.match(rf"{re.escape(fam)}(?:\s|\()",s,re.I):
                return label,gen or "Sin especificar"
    if brand=="Audi":
        m=re.match(r"(A[1-8]|S[1-8]|RS[1-7]|TT|R8|80|100|200)(?:\s|\()",s,re.I)
        if m:
            token=m.group(1).upper();family=token
            if re.fullmatch(r"S[1-8]",token):family="A"+token[1]
            if re.fullmatch(r"RS[1-7]",token):family="A"+token[2]
            return family,gen or "Sin especificar"
    if brand=="Porsche":
        for fam in ["911","718","928","944","968","924","914","918","959","Boxster","Cayman",
                    "Cayenne","Panamera","Macan","Taycan","Carrera GT"]:
            if re.match(rf"{re.escape(fam)}(?:\s|\()",s,re.I):return fam,gen or "Sin especificar"
    if brand in {"VW","Volkswagen"}:
        m=re.match(r"(Golf|Polo|Passat|Scirocco|Corrado|Beetle|Bora|Jetta|Lupo|Phaeton|Touareg|"
                   r"Touran|Tiguan|Arteon|Up!?)(?:\s+([IVX]+|Mk\d+|Mk[IVX]+))?",s,re.I)
        if m:return m.group(1),m.group(2) or gen or "Sin especificar"
    pre=re.sub(r"\([^)]*\)"," ",s);tokens=pre.split()
    if not tokens:return "Otros",gen or "Sin especificar"
    family=tokens[0];generation=gen
    if len(tokens)>1 and (tokens[1].upper() in ROMANS or tokens[1].upper() in GEN_WORDS or
                          re.fullmatch(r"Mk\d+",tokens[1],re.I)):
        generation=tokens[1]
    return family,generation or "Sin especificar"

def parse_moto_taxonomy(v):
    s=strip_brand(v)
    m=re.search(r"\bgen\s*([1-9])\b|\b([1-9])gen\b",s,re.I)
    generation=f"{m.group(1) or m.group(2)}ª generación" if m else "Sin especificar"
    name=re.sub(r"\bgen\s*[1-9]\b|\b[1-9]gen\b|\brestyling\b"," ",s,flags=re.I)
    name=re.sub(r"\bEuro\s*5\+?\b|\bEuro[345]\+?\b|\bABS\b|\bA2\b"," ",name,flags=re.I)
    return re.sub(r"\s+"," ",name).strip() or s,generation

def override_taxonomy(record,row,indexes,parser):
    auto_model,auto_gen=parser(record)
    model=optional_cell(row,indexes["model"]);gen=optional_cell(row,indexes["generation"])
    record["model"]=model or auto_model;record["generation"]=gen or auto_gen
    record["taxonomyLocked"]=bool(model or gen)

def identity_signature(record):
    specs=record.get("specs",{})
    extra=[
        specs.get("Cilindrada / aspiración") or specs.get("Cilindrada"),
        record.get("power"),
        record.get("torque"),
        specs.get("Transmisión"),
        specs.get("Tracción"),
    ]
    raw="|".join(str(x or "").strip().lower() for x in [
        record["type"],record["name"],record.get("yearStart"),record.get("yearEnd"),*extra
    ])
    return hashlib.sha1(raw.encode("utf-8")).hexdigest()

def generated_id(record,signature):
    specs=record.get("specs",{})
    power=record.get("power")
    core=slugify(f"{record['brand']}-{record['name']}-{record.get('yearStart') or ''}-"
                 f"{record.get('yearEnd') or ''}-{power or ''}")
    return f"{record['type']}-{core[:72].strip('-')}-{signature[:8]}"

def previous_ids():
    path=DATA_DIR/"content-index.csv";result={}
    if not path.exists():return result
    try:
        with path.open("r",encoding="utf-8",newline="") as f:
            for row in csv.DictReader(f):
                sig=row.get("signature");vid=row.get("id")
                if sig and vid:result.setdefault(sig,[]).append(vid)
    except Exception:pass
    return result

def media_for(brand,vehicle_id):
    brand_slug=slugify(brand);folder=MEDIA_ROOT/brand_slug/vehicle_id
    images=[]
    for n in (1,2):
        for ext in ("webp","png","jpg","jpeg"):
            p=folder/f"{n}.{ext}"
            if p.exists():
                images.append(p.relative_to(ROOT).as_posix());break
    article=ARTICLE_ROOT/brand_slug/f"{vehicle_id}.md"
    return images,(article.relative_to(ROOT).as_posix() if article.exists() else None),brand_slug

def car_record(row,indexes):
    name=clean(row[0]) if row else None
    if not name:return None
    brand=brand_from_name(name);start=clean(row[1]);end=clean(row[2])
    ys,_=year_bounds(start);_,ye=year_bounds(end)
    if ye is None:_,ye=year_bounds(start)
    specs={
      "Cilindrada / aspiración":clean(row[5]),"Arquitectura":clean(row[6]),"Combustible":clean(row[7]),
      "Potencia":clean(row[8]),"Potencia medida":clean(row[9]),"Par":clean(row[10]),"Tracción":clean(row[11]),
      "Peso DIN":clean(row[12]),"Batalla / Largo / Ancho / Alto":clean(row[13]),"kg/CV":clean(row[14]),
      "0-100 km/h":clean(row[15]),"80-120 km/h":clean(row[16]),"400 m":clean(row[17]),
      "Velocidad máxima":clean(row[18]),"100-0 km/h":clean(row[19]),"Precio actual":clean(row[20]),
      "Precio Alemania":clean(row[21]),"Precio original":clean(row[23]),"Precio ene. 2025":clean(row[24]),
      "Consumo":clean(row[25]),"Autovía":clean(row[26]),"CO₂":clean(row[27]),"Eficiencia":clean(row[28]),
      "Cx":clean(row[29]),"SCx":clean(row[30]),"ZePerfs":clean(row[31]),"Deportividad":clean(row[32]),
      "Pista":clean(row[33]),"Tsukuba":clean(row[34]),"Hockenheim Short":clean(row[35]),
      "Balocco":clean(row[36]),"Auto Zeitung":clean(row[37]),"Motor":clean(row[38]),
      "Vida útil motor":clean(row[39]),"Culata":clean(row[40]),"Chasis":clean(row[41]),
      "Suspensión delantera":clean(row[42]),"Suspensión trasera":clean(row[43]),
      "Freno delantero":clean(row[44]),"Freno trasero":clean(row[45]),
      "Neumático delantero":clean(row[46]),"Neumático trasero":clean(row[47]),
      "Transmisión":clean(row[48]),"Alimentación":clean(row[49])
    }
    specs={k:v for k,v in specs.items() if v is not None}
    r={"type":"car","name":name,"brand":brand,"yearStart":ys,"yearEnd":ye,
       "yearText":f"{start or ''}–{end or ''}".strip("–"),"favorite":clean(row[3]),"forza":clean(row[4]),
       "power":clean(row[8]),"torque":clean(row[10]),"weight":clean(row[12]),"kgcv":clean(row[14]),
       "zero100":clean(row[15]),"vmax":clean(row[18]),"price":clean(row[20]),"specs":specs}
    override_taxonomy(r,row,indexes,parse_car_taxonomy);return r

def moto_record(row,indexes):
    name=clean(row[0]) if row else None
    if not name:return None
    brand=brand_from_name(name);ys,ye=year_bounds(clean(row[2]))
    specs={
      "Tipo":clean(row[3]),"A2":clean(row[4]),"Cilindrada":clean(row[5]),"Cilindros":clean(row[6]),
      "Potencia":clean(row[7]),"RPM potencia":clean(row[8]),"Par":clean(row[9]),"RPM par":clean(row[10]),
      "Peso en marcha":clean(row[11]),"Peso en seco":clean(row[12]),"kg/CV":clean(row[13]),
      "Altura asiento":clean(row[14]),"Precio mínimo":clean(row[15]),"Precio máximo":clean(row[16]),
      "Consumo":clean(row[17]),"Neumático delantero":clean(row[18]),"Neumático trasero":clean(row[19]),
      "Valoración global":clean(row[20]),"Sensaciones":clean(row[21]),"Comodidad":clean(row[22]),
      "Facilidad":clean(row[23]),"Fiabilidad":clean(row[24]),"Mantenimiento":clean(row[25]),
      "Sonido":clean(row[26]),"Estética":clean(row[27]),"Ocupante":clean(row[28]),"Carga":clean(row[29])
    }
    specs={k:v for k,v in specs.items() if v is not None}
    r={"type":"moto","name":name,"brand":brand,"yearStart":ys,"yearEnd":ye,
       "yearText":str(clean(row[2]) or ""),"favorite":clean(row[1]),"category":clean(row[3]),"a2":clean(row[4]),
       "power":clean(row[7]),"torque":clean(row[9]),"weight":clean(row[11]),"kgcv":clean(row[13]),
       "price":clean(row[15]),"specs":specs}
    override_taxonomy(r,row,indexes,parse_moto_taxonomy);return r

def main():
    cars,motos=read_xlsx();ci=header_indexes(cars);mi=header_indexes(motos);old=previous_ids()
    vehicles=[];seen={};rows_index=[];occurrences={}
    for rows,indexes,builder in ((cars,ci,car_record),(motos,mi,moto_record)):
        for excel_row,row in enumerate(rows[1:],start=2):
            r=builder(row,indexes)
            if not r:continue
            sig=identity_signature(r);explicit=optional_cell(row,indexes["id"])
            occurrence=occurrences.get(sig,0)
            occurrences[sig]=occurrence+1

            if explicit:
                vid=slugify(explicit);source="excel"
                if vid in seen:
                    raise RuntimeError(
                        f"Motorpedia ID explícito duplicado {vid}: {seen[vid]} / "
                        f"{r['name']} fila {excel_row}."
                    )
            elif sig in old and occurrence < len(old[sig]):
                vid=old[sig][occurrence];source="preserved"
            else:
                base=generated_id(r,sig)
                vid=base if occurrence==0 else f"{base}-{occurrence+1}"
                source="generated"

            # Último seguro para casos antiguos/extraños: no pisar nunca un ID.
            if vid in seen:
                n=2
                candidate=f"{vid}-{n}"
                while candidate in seen:
                    n+=1;candidate=f"{vid}-{n}"
                vid=candidate
            seen[vid]=r["name"]
            images,article,brand_slug=media_for(r["brand"],vid)
            r["id"]=vid;r["media"]={"images":images};r["article"]=article;vehicles.append(r)
            rows_index.append({
              "signature":sig,"id":vid,"id_source":source,"type":r["type"],"brand":r["brand"],"name":r["name"],
              "years":r["yearText"],"model":r["model"],"generation":r["generation"],
              "photo_folder":f"assets/vehicles/{brand_slug}/{vid}/",
              "photo_1":images[0] if len(images)>0 else "","photo_2":images[1] if len(images)>1 else "",
              "article_file":f"content/articles/{brand_slug}/{vid}.md",
              "article_exists":"yes" if article else "no"
            })
    stats={"total":len(vehicles),"cars":sum(v["type"]=="car" for v in vehicles),
           "motos":sum(v["type"]=="moto" for v in vehicles),"brands":len({v["brand"] for v in vehicles}),
           "yearMin":min((v["yearStart"] for v in vehicles if v["yearStart"]),default=None),
           "yearMax":max((v["yearEnd"] for v in vehicles if v["yearEnd"]),default=None),
           "withPhotos":sum(bool(v["media"]["images"]) for v in vehicles),
           "withArticles":sum(bool(v["article"]) for v in vehicles)}
    (DATA_DIR/"vehicles.json").write_text(json.dumps(vehicles,ensure_ascii=False,separators=(",",":")),encoding="utf-8")
    (DATA_DIR/"stats.json").write_text(json.dumps(stats,ensure_ascii=False,indent=2),encoding="utf-8")
    fields=["signature","id","id_source","type","brand","name","years","model","generation",
            "photo_folder","photo_1","photo_2","article_file","article_exists"]
    with (DATA_DIR/"content-index.csv").open("w",encoding="utf-8",newline="") as f:
        w=csv.DictWriter(f,fieldnames=fields);w.writeheader();w.writerows(rows_index)
    print(f"Motorpedia actualizada: {stats['total']} vehículos "
          f"({stats['cars']} coches + {stats['motos']} motos), "
          f"{stats['withPhotos']} con fotos y {stats['withArticles']} con artículo.")
    print("Índice: data/content-index.csv")

if __name__=="__main__":main()
