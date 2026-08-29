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
DATA_DIR = ROOT / "data"
MEDIA_ROOT = ROOT / "assets" / "vehicles"
ARTICLE_ROOT = ROOT / "content" / "articles"
DATA_DIR.mkdir(parents=True, exist_ok=True)

SHEET_CARS = "Coches"
SHEET_MOTOS = "Motos"


def clean(value):
    if value is None:
        return None
    if isinstance(value, str):
        value = value.strip()
        return value if value else None
    return value


def strip_accents(text):
    return "".join(ch for ch in unicodedata.normalize("NFD", str(text))
                   if unicodedata.category(ch) != "Mn")


def slugify(text):
    text = strip_accents(text).lower()
    return re.sub(r"[^a-z0-9]+", "-", text).strip("-") or "vehicle"


def normalize_header(value):
    if value is None:
        return ""
    return re.sub(r"[^a-z0-9]+", " ", strip_accents(value).lower()).strip()


def database_file():
    preferred = [
        "Base_de_Datos.xlsm", "Base de Datos.xlsm",
        "Base_de_Datos.xlsx", "Base de Datos.xlsx",
    ]
    for name in preferred:
        p = ROOT / name
        if p.exists():
            return p
    candidates = sorted(list(ROOT.glob("*.xlsm")) + list(ROOT.glob("*.xlsx")))
    candidates = [p for p in candidates if not p.name.startswith("~$")]
    if not candidates:
        raise FileNotFoundError("No se encontró la base de datos .xlsx/.xlsm en la raíz del repositorio.")
    return candidates[0]


def col_to_idx(ref):
    match = re.match(r"([A-Z]+)", ref)
    n = 0
    for ch in match.group(1):
        n = n * 26 + ord(ch) - 64
    return n - 1


def read_workbook(path):
    with zipfile.ZipFile(path) as zf:
        ns0 = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
        shared = []
        if "xl/sharedStrings.xml" in zf.namelist():
            root = ET.fromstring(zf.read("xl/sharedStrings.xml"))
            for si in root.iter(ns0 + "si"):
                shared.append("".join((t.text or "") for t in si.iter(ns0 + "t")))

        wbxml = ET.fromstring(zf.read("xl/workbook.xml"))
        ns = {
            "a": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
            "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
        }
        sheets = [
            (s.attrib["name"], s.attrib["{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"])
            for s in wbxml.find("a:sheets", ns)
        ]
        rels = ET.fromstring(zf.read("xl/_rels/workbook.xml.rels"))
        relmap = {r.attrib["Id"]: r.attrib["Target"] for r in rels}
        paths = {name: "xl/" + relmap[rid] for name, rid in sheets}

        def read_sheet(sheet_name):
            if sheet_name not in paths:
                raise RuntimeError(f"No existe la hoja {sheet_name!r}. Hojas disponibles: {', '.join(paths)}")
            root = ET.fromstring(zf.read(paths[sheet_name]))
            rows = []
            for row in root.iter(ns0 + "row"):
                vals = {}
                for cell in row.findall(ns0 + "c"):
                    idx = col_to_idx(cell.attrib.get("r", "A1"))
                    cell_type = cell.attrib.get("t")
                    value_node = cell.find(ns0 + "v")
                    inline_node = cell.find(ns0 + "is")
                    value = None
                    if cell_type == "s" and value_node is not None:
                        value = shared[int(value_node.text)]
                    elif cell_type == "inlineStr" and inline_node is not None:
                        value = "".join((t.text or "") for t in inline_node.iter(ns0 + "t"))
                    elif cell_type == "b" and value_node is not None:
                        value = value_node.text == "1"
                    elif value_node is not None:
                        raw = value_node.text
                        try:
                            num = float(raw)
                            value = int(num) if num.is_integer() else num
                        except Exception:
                            value = raw
                    vals[idx] = value
                if vals:
                    arr = [None] * (max(vals) + 1)
                    for idx, value in vals.items():
                        arr[idx] = value
                    rows.append(arr)
            max_len = max((len(r) for r in rows), default=0)
            return [r + [None] * (max_len - len(r)) for r in rows]

        return read_sheet(SHEET_CARS), read_sheet(SHEET_MOTOS)


class RowReader:
    def __init__(self, headers, row):
        self.headers = headers
        self.row = row
        self.exact = {}
        self.normalized = {}
        for i, header in enumerate(headers):
            if clean(header) is None:
                continue
            text = str(header).strip()
            self.exact.setdefault(text, i)
            self.normalized.setdefault(normalize_header(text), i)

    def get(self, *names):
        for name in names:
            if name in self.exact:
                idx = self.exact[name]
                return clean(self.row[idx]) if idx < len(self.row) else None
        for name in names:
            idx = self.normalized.get(normalize_header(name))
            if idx is not None:
                return clean(self.row[idx]) if idx < len(self.row) else None
        return None


def int_year(value):
    if isinstance(value, (int, float)):
        y = int(value)
        return y if 1800 <= y <= 2200 else None
    if value is None:
        return None
    match = re.search(r"\b(18\d{2}|19\d{2}|20\d{2}|21\d{2})\b", str(value))
    return int(match.group(1)) if match else None


def year_range(value):
    if value is None:
        return None, None
    if isinstance(value, (int, float)):
        y = int(value)
        return y, y
    years = [int(x) for x in re.findall(r"\b(18\d{2}|19\d{2}|20\d{2}|21\d{2})\b", str(value))]
    return (min(years), max(years)) if years else (None, None)


def year_text(start, end):
    s = clean(start)
    e = clean(end)
    if s is None and e is None:
        return ""
    if s is not None and (e is None or str(e).strip() in {"-", "–"}):
        return f"{s}–"
    if s is None:
        return str(e)
    if str(s) == str(e):
        return str(s)
    return f"{s}–{e}"


def display_name(brand, model, generation, version):
    parts = [str(brand).strip(), str(model).strip()]
    version_text = str(version).strip() if version is not None else ""
    if version_text and version_text not in {"-", "–"}:
        model_text = str(model).strip().lower()
        if version_text.lower() != model_text:
            parts.append(version_text)
    return " ".join(p for p in parts if p)


def stable_signature(record):
    raw = "|".join(str(record.get(k) or "").strip().lower() for k in (
        "type", "brand", "model", "generation", "version", "yearText"
    ))
    return hashlib.sha1(raw.encode("utf-8")).hexdigest()


def generated_id(record, signature):
    core = slugify("-".join(str(record.get(k) or "") for k in (
        "brand", "model", "generation", "version", "yearText"
    )))
    return f"{record['type']}-{core[:82].strip('-')}-{signature[:8]}"


def previous_ids():
    path = DATA_DIR / "content-index.csv"
    result = {}
    if not path.exists():
        return result
    try:
        with path.open("r", encoding="utf-8", newline="") as fh:
            for row in csv.DictReader(fh):
                sig, vid = row.get("signature"), row.get("id")
                if sig and vid:
                    result.setdefault(sig, []).append(vid)
    except Exception:
        pass
    return result


def media_for(brand, vehicle_id):
    brand_slug = slugify(brand)
    folder = MEDIA_ROOT / brand_slug / vehicle_id
    images = []
    for number in (1, 2):
        for ext in ("webp", "png", "jpg", "jpeg"):
            p = folder / f"{number}.{ext}"
            if p.exists():
                images.append(p.relative_to(ROOT).as_posix())
                break
    article_file = ARTICLE_ROOT / brand_slug / f"{vehicle_id}.md"
    article = article_file.relative_to(ROOT).as_posix() if article_file.exists() else None
    return images, article, brand_slug


def compact_specs(data):
    return {key: value for key, value in data.items() if clean(value) is not None}


def car_record(headers, row):
    r = RowReader(headers, row)
    brand = r.get("Marca")
    model = r.get("Modelo")
    if not brand or not model:
        return None
    generation = r.get("Generación", "Generacion") or "Sin especificar"
    version = r.get("Versión", "Version") or "-"
    start, end = r.get("Inicio"), r.get("Fin")
    ys, ye = int_year(start), int_year(end)
    if ye is None and ys is not None and (end is None or str(end).strip() in {"-", "–"}):
        ye = ys

    specs = compact_specs({
        "Cilindrada / aspiración": r.get("CC / Asp"),
        "Arquitectura": r.get("Motor"),
        "Combustible": r.get("Comb"),
        "Potencia": r.get("Potencia"),
        "Potencia medida": r.get("Potencia media"),
        "Par": r.get("Par (Nm)", "Par"),
        "Tracción": r.get("Tracción", "Traccion"),
        "Peso DIN": r.get("Peso (DIN)"),
        "Batalla / Largo / Ancho / Alto": r.get("Bat./Largo/Anch/Alto"),
        "kg/CV": r.get("Kg/Hp", "Kg/cv", "kg/CV"),
        "0-100 km/h": r.get("0-100"),
        "80-120 km/h": r.get("80-120"),
        "400 m": r.get("400m"),
        "Velocidad máxima": r.get("Vmax"),
        "100-0 km/h": r.get("100-0 (m)"),
        "Precio actual": r.get("Precio Actual"),
        "Precio Alemania": r.get("Precio Alemania + 1200viaje + matriculacion"),
        "Precio original": r.get("Precio Original"),
        "Precio ene. 2025": r.get("Precio Enero 2025"),
        "Consumo": r.get("Consumo"),
        "Autovía": r.get("Autovía", "Autovia"),
        "CO₂": r.get("CO2 g/km"),
        "Eficiencia": r.get("Eficiencia"),
        "Cx": r.get("Cx"),
        "SCx": r.get("SCx"),
        "ZePerfs": r.get("ZePerfs"),
        "Deportividad": r.get("DeportivDIad", "Deportividad"),
        "Pista": r.get("Pista"),
        "Tsukuba": r.get("Tsukuba"),
        "Hockenheim Short": r.get("Hockenheim S"),
        "Balocco": r.get("Balocco"),
        "Auto Zeitung": r.get("Auto Zeitung"),
        "Motor": r.get("MOTOR"),
        "Vida útil motor": r.get("VDIa util motor", "Vida util motor"),
        "Culata": r.get("Culata"),
        "Chasis": r.get("Chasis"),
        "Suspensión delantera": r.get("Susp del"),
        "Suspensión trasera": r.get("Susp tras"),
        "Freno delantero": r.get("Freno del"),
        "Freno trasero": r.get("Freno tras"),
        "Neumático delantero": r.get("Neum del"),
        "Neumático trasero": r.get("Neum tras"),
        "Transmisión": r.get("Transmisión", "Transmision"),
        "Alimentación": r.get("Alimentación", "Alimentacion"),
    })

    record = {
        "type": "car",
        "brand": str(brand),
        "model": str(model),
        "generation": str(generation),
        "version": str(version),
        "name": display_name(brand, model, generation, version),
        "yearStart": ys,
        "yearEnd": ye,
        "yearText": year_text(start, end),
        "favorite": r.get("⭐"),
        "forza": r.get("Forza"),
        "power": r.get("Potencia"),
        "torque": r.get("Par (Nm)", "Par"),
        "weight": r.get("Peso (DIN)"),
        "kgcv": r.get("Kg/Hp", "Kg/cv"),
        "zero100": r.get("0-100"),
        "vmax": r.get("Vmax"),
        "price": r.get("Precio Actual"),
        "category": r.get("Categoría", "Categoria"),
        "subcategory": r.get("Subcategoría", "Subcategoria"),
        "taxonomyLocked": True,
        "specs": specs,
        "sourceId": r.get("ID Motorpedia"),
    }
    return record


def moto_record(headers, row):
    r = RowReader(headers, row)
    brand = r.get("Marca")
    model = r.get("Modelo")
    if not brand or not model:
        return None
    generation = r.get("Generación", "Generacion") or "Sin especificar"
    version = r.get("Versión", "Version") or "-"
    years = r.get("Año", "Ano")
    ys, ye = year_range(years)

    specs = compact_specs({
        "Tipo": r.get("Categoría", "Categoria"),
        "A2": r.get("A2"),
        "Cilindrada": r.get("Cilindrada"),
        "Cilindros": r.get("Cilindros"),
        "Potencia": r.get("Potencia"),
        "RPM potencia": r.get("cv rpm"),
        "Par": r.get("Par"),
        "RPM par": r.get("Nm rpm"),
        "Chasis": r.get("Chasis"),
        "Suspensión delantera": r.get("Horquilla"),
        "Suspensión trasera": r.get("Basculante"),
        "Freno delantero": r.get("Frrenada del", "Frenada del", "Freno del"),
        "Freno trasero": r.get("Frrenada tras", "Frenada tras", "Freno tras"),
        "Peso en marcha": r.get("Peso (marcha)"),
        "Peso en seco": r.get("Peso (seco)"),
        "kg/CV": r.get("Kg/cv", "Kg/CV"),
        "Altura asiento": r.get("Altura de asiento"),
        "Precio mínimo": r.get("Precio min"),
        "Precio máximo": r.get("Precio max"),
        "Consumo": r.get("Consumo"),
        "Neumático delantero": r.get("Neum del"),
        "Neumático trasero": r.get("Neum tras"),
        "Llanta": r.get("Llanta"),
        "Valoración global": r.get("Valoración global", "Valoracion global"),
        "Sensaciones": r.get("Sensaciones"),
        "Comodidad": r.get("Comodidad"),
        "Facilidad": r.get("Facilidad"),
        "Fiabilidad": r.get("Fiabilidad"),
        "Mantenimiento": r.get("Mantenimiento"),
        "Sonido": r.get("Sonido"),
        "Estética": r.get("Estética", "Estetica"),
        "Ocupante": r.get("Ocupante"),
        "Carga": r.get("Carga"),
    })

    record = {
        "type": "moto",
        "brand": str(brand),
        "model": str(model),
        "generation": str(generation),
        "version": str(version),
        "name": display_name(brand, model, generation, version),
        "yearStart": ys,
        "yearEnd": ye,
        "yearText": str(years or ""),
        "favorite": r.get("⭐"),
        "category": r.get("Categoría", "Categoria"),
        "subcategory": r.get("Subcategoría", "Subcategoria"),
        "a2": r.get("A2"),
        "power": r.get("Potencia"),
        "torque": r.get("Par"),
        "weight": r.get("Peso (marcha)"),
        "kgcv": r.get("Kg/cv", "Kg/CV"),
        "price": r.get("Precio min"),
        "taxonomyLocked": True,
        "specs": specs,
        "sourceId": r.get("ID Motorpedia"),
    }
    return record


def main():
    db = database_file()
    car_rows, moto_rows = read_workbook(db)
    car_headers = car_rows[0]
    moto_headers = moto_rows[0]
    old = previous_ids()
    occurrences = {}
    seen = {}
    vehicles = []
    index_rows = []

    for rows, headers, builder in (
        (car_rows[1:], car_headers, car_record),
        (moto_rows[1:], moto_headers, moto_record),
    ):
        for row in rows:
            record = builder(headers, row)
            if not record:
                continue
            signature = stable_signature(record)
            occurrence = occurrences.get(signature, 0)
            occurrences[signature] = occurrence + 1
            explicit = clean(record.pop("sourceId", None))
            if explicit:
                vehicle_id = slugify(explicit)
                id_source = "excel"
            elif signature in old and occurrence < len(old[signature]):
                vehicle_id = old[signature][occurrence]
                id_source = "preserved"
            else:
                base = generated_id(record, signature)
                vehicle_id = base if occurrence == 0 else f"{base}-{occurrence + 1}"
                id_source = "generated"

            if vehicle_id in seen:
                n = 2
                base = vehicle_id
                while f"{base}-{n}" in seen:
                    n += 1
                vehicle_id = f"{base}-{n}"
            seen[vehicle_id] = record["name"]

            images, article, brand_slug = media_for(record["brand"], vehicle_id)
            record["id"] = vehicle_id
            record["media"] = {"images": images}
            record["article"] = article
            vehicles.append(record)

            index_rows.append({
                "signature": signature,
                "id": vehicle_id,
                "id_source": id_source,
                "type": record["type"],
                "brand": record["brand"],
                "category": record.get("category") or "",
                "subcategory": record.get("subcategory") or "",
                "model": record["model"],
                "generation": record["generation"],
                "version": record["version"],
                "name": record["name"],
                "years": record["yearText"],
                "photo_folder": f"assets/vehicles/{brand_slug}/{vehicle_id}/",
                "photo_1": images[0] if len(images) > 0 else "",
                "photo_2": images[1] if len(images) > 1 else "",
                "article_file": f"content/articles/{brand_slug}/{vehicle_id}.md",
                "article_exists": "yes" if article else "no",
            })

    categories = sorted({v["category"] for v in vehicles if v.get("category")})
    subcategories = sorted({v["subcategory"] for v in vehicles if v.get("subcategory")})
    stats = {
        "total": len(vehicles),
        "cars": sum(v["type"] == "car" for v in vehicles),
        "motos": sum(v["type"] == "moto" for v in vehicles),
        "brands": len({v["brand"] for v in vehicles}),
        "categories": len(categories),
        "subcategories": len(subcategories),
        "yearMin": min((v["yearStart"] for v in vehicles if v.get("yearStart")), default=None),
        "yearMax": max((v["yearEnd"] for v in vehicles if v.get("yearEnd")), default=None),
        "withPhotos": sum(bool(v["media"]["images"]) for v in vehicles),
        "withArticles": sum(bool(v["article"]) for v in vehicles),
    }

    (DATA_DIR / "vehicles.json").write_text(
        json.dumps(vehicles, ensure_ascii=False, separators=(",", ":")), encoding="utf-8"
    )
    (DATA_DIR / "stats.json").write_text(
        json.dumps(stats, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    fields = [
        "signature", "id", "id_source", "type", "brand", "category", "subcategory",
        "model", "generation", "version", "name", "years",
        "photo_folder", "photo_1", "photo_2", "article_file", "article_exists",
    ]
    with (DATA_DIR / "content-index.csv").open("w", encoding="utf-8", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=fields)
        writer.writeheader()
        writer.writerows(index_rows)

    print(
        f"Motorpedia actualizada desde {db.name}: {stats['total']} vehículos "
        f"({stats['cars']} coches + {stats['motos']} motos), "
        f"{stats['categories']} categorías y {stats['subcategories']} subcategorías."
    )


if __name__ == "__main__":
    main()
