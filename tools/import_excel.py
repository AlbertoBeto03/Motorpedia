#!/usr/bin/env python3
from __future__ import annotations

from datetime import date, timedelta
from pathlib import Path
import csv
import hashlib
import json
import re
import unicodedata
import xml.etree.ElementTree as ET
import zipfile
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
MEDIA_ROOT = ROOT / "assets" / "vehicles"
ARTICLE_ROOT = ROOT / "content" / "articles"
DATA_DIR.mkdir(parents=True, exist_ok=True)

SHEET_CARS = "Coches"
SHEET_MOTOS = "Motos"
SHEET_MOTOS_FALLBACK = "Copia de Motos"
CURRENT_YEAR = date.today().year


def clean(value):
    if value is None:
        return None
    if isinstance(value, str):
        value = value.strip()
        return value if value else None
    return value


def meaningful(value):
    value = clean(value)
    if value is None:
        return False
    if isinstance(value, str) and value.strip() in {"-", "–", "—"}:
        return False
    return True


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
    # V4.4.1: Base_de_Datos.xlsm is the canonical source (the .xlsx copy is retired).
    preferred = [
        "Base_de_Datos.xlsm",
        "Base_de_Datos.xlsx",
        "Base de Datos.xlsx",
        "Base de Datos.xlsm",
    ]
    for name in preferred:
        p = ROOT / name
        if p.exists():
            return p
    candidates = sorted(list(ROOT.glob("*.xlsx")) + list(ROOT.glob("*.xlsm")))
    candidates = [p for p in candidates if not p.name.startswith("~$")]
    if not candidates:
        raise FileNotFoundError("No se encontró Base_de_Datos.xlsm ni otra base .xlsx/.xlsm en la raíz.")
    return candidates[0]


def col_to_idx(ref):
    match = re.match(r"([A-Z]+)", ref)
    if not match:
        return 0
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
        paths = {}
        for name, rid in sheets:
            target = relmap[rid].lstrip("/")
            paths[name] = target if target.startswith("xl/") else "xl/" + target

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

        moto_sheet = SHEET_MOTOS if SHEET_MOTOS in paths else SHEET_MOTOS_FALLBACK
        return read_sheet(SHEET_CARS), read_sheet(moto_sheet)


class RowReader:
    def __init__(self, headers, row):
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
    if s is not None and e is None:
        return f"{s}–"
    if s is None:
        return str(e)
    if str(s) == str(e):
        return str(s)
    return f"{s}–{e}"


def excel_serial_date(value):
    if isinstance(value, (int, float)) and 20000 <= float(value) <= 80000:
        try:
            return (date(1899, 12, 30) + timedelta(days=int(value))).isoformat()
        except Exception:
            pass
    return clean(value)


def display_name(brand, model, generation, version):
    parts = [str(brand).strip(), str(model).strip()]
    version_text = str(version).strip() if version is not None else ""
    if version_text and version_text not in {"-", "–", "—"}:
        model_text = str(model).strip().lower()
        if version_text.lower() != model_text:
            parts.append(version_text)
    return " ".join(p for p in parts if p)


def stable_signature(record):
    raw = "|".join(str(record.get(k) or "").strip().lower() for k in (
        "type", "brand", "model", "generation", "version", "yearText"
    ))
    return hashlib.sha1(raw.encode("utf-8")).hexdigest()


def identity_generation(value):
    n = normalize_header(value)
    if n in {"", "-", "gen 1", "primera generacion", "sin especificar"}:
        return ""
    return n


def identity_key(record):
    return "|".join([
        normalize_header(record.get("type")),
        normalize_header(record.get("brand")),
        normalize_header(record.get("model")),
        identity_generation(record.get("generation")),
        normalize_header(record.get("version")),
    ])


def generated_id(record, signature):
    core = slugify("-".join(str(record.get(k) or "") for k in (
        "brand", "model", "generation", "version", "yearText"
    )))
    return f"{record['type']}-{core[:82].strip('-')}-{signature[:8]}"


def previous_state():
    path = DATA_DIR / "content-index.csv"
    by_signature = {}
    by_identity = {}
    if not path.exists():
        return by_signature, by_identity
    try:
        with path.open("r", encoding="utf-8", newline="") as fh:
            for row in csv.DictReader(fh):
                vid = clean(row.get("id"))
                if not vid:
                    continue
                sig = clean(row.get("signature"))
                if sig:
                    by_signature.setdefault(sig, []).append(vid)
                fake = {
                    "type": row.get("type"),
                    "brand": row.get("brand"),
                    "model": row.get("model"),
                    "generation": row.get("generation"),
                    "version": row.get("version"),
                }
                key = identity_key(fake)
                if key:
                    by_identity.setdefault(key, []).append(vid)
    except Exception:
        pass
    return by_signature, by_identity


# V4.4.3: columna "ID Fotos" (grupos de fotos compartidos). V4.4.2: fotos y artículos se enlazan por el ID del Excel ("ID Motorpedia"),
# p. ej. "car-BMW-Serie 1-F20-114i". El ID publicado (car-00684) sigue valiendo
# como alternativa para no romper lo ya subido.
UNSAFE_NAME_CHARS = re.compile(r'[\\/:*?"<>|#%]')
IMAGE_EXTS = (".webp", ".png", ".jpg", ".jpeg")
_DIR_INDEX = {}


def media_key(name):
    """Clave para comparar nombres de archivo con el ID del Excel.

    Tolera: acentos NFC/NFD (macOS), caracteres que no pueden ir en un nombre de
    archivo ni en una URL (/ \\ : * ? " < > | # %, que valen "-") y espacios
    (que valen "-"). Distingue mayúsculas de minúsculas.
    """
    text = unicodedata.normalize("NFC", str(name))
    text = UNSAFE_NAME_CHARS.sub("-", text)
    text = re.sub(r"\s+", "-", text)
    return text.rstrip(". ")


def safe_filename(name):
    """Nombre de archivo esperado para un ID del Excel (solo sustituye lo imposible)."""
    return UNSAFE_NAME_CHARS.sub("-", unicodedata.normalize("NFC", str(name))).strip()


def _dir_index(directory, dirs=False):
    cache_key = (directory, dirs)
    if cache_key not in _DIR_INDEX:
        index = {}
        if directory.is_dir():
            for entry in sorted(directory.iterdir()):
                if dirs:
                    if entry.is_dir():
                        index.setdefault(media_key(entry.name), entry)
                elif entry.is_file():
                    index.setdefault((media_key(entry.stem), entry.suffix.lower()), entry)
        _DIR_INDEX[cache_key] = index
    return _DIR_INDEX[cache_key]


def media_names(vehicle_id, excel_id=None, occurrence=0):
    """Nombres propios de un vehículo, por orden de prioridad.

    Varios vehículos pueden compartir el mismo ID del Excel (misma versión en
    años distintos). El primero usa el ID tal cual; los siguientes, "__2", "__3"...
    en el orden de la hoja. Siempre se acepta también el ID publicado.
    """
    names = []
    if excel_id:
        names.append(f"{excel_id}__{occurrence + 1}" if occurrence else str(excel_id))
    names.append(vehicle_id)
    return names


def clean_photo_group(group, excel_id=None):
    """Grupo de fotos de la columna "ID Fotos" del Excel.

    Solo cuenta si es un grupo real: se ignora si está vacío, si es el marcador
    "car-" de las filas sin datos o si coincide con el propio ID del vehículo.
    """
    group = clean(group)
    if not group:
        return None
    group = str(group).strip()
    if group in ("car-", "moto-") or (excel_id and media_key(group) == media_key(excel_id)):
        return None
    return group


def find_photos(name, folders, quick):
    """Fotos 1 y 2 de un nombre: carpeta (1.webp, 2.webp) o archivos rápidos (<nombre>-1.webp)."""
    images, sources = [], []
    for number in (1, 2):
        found = found_mode = None
        folder = folders.get(media_key(name))
        if folder is not None:
            for ext in IMAGE_EXTS:
                p = folder / f"{number}{ext}"
                if p.exists():
                    found, found_mode = p, "folder"
                    break
        if found is None:
            for ext in IMAGE_EXTS:
                p = quick.get((f"{media_key(name)}-{number}", ext))
                if p is not None:
                    found, found_mode = p, "quick"
                    break
        if found is not None:
            images.append(found.relative_to(ROOT).as_posix())
            sources.append(found_mode)
    return images, sources


def media_for(brand, vehicle_id, excel_id=None, occurrence=0, photo_group=None):
    """Fotos y artículo de un vehículo.

    Fotos, por orden: las propias (ID del Excel, luego ID publicado) y, si no hay
    ninguna, las del grupo ("ID Fotos"). Se usa un solo origen para las dos fotos.
    El artículo es siempre propio de cada vehículo.
    """
    brand_slug = slugify(brand)
    names = media_names(vehicle_id, excel_id, occurrence)
    folders = _dir_index(MEDIA_ROOT / brand_slug, dirs=True)
    quick = _dir_index(MEDIA_ROOT / "_quick")

    images, sources, photo_from = [], [], ""
    candidates = [(name, "own") for name in names]
    if photo_group:
        candidates.append((photo_group, "group"))
    for name, origin in candidates:
        images, sources = find_photos(name, folders, quick)
        if images:
            photo_from = origin
            break

    if not sources:
        photo_mode = ""
    elif len(set(sources)) == 1:
        photo_mode = sources[0]
    else:
        photo_mode = "mixed"

    articles = _dir_index(ARTICLE_ROOT / brand_slug)
    article = None
    for name in names:
        p = articles.get((media_key(name), ".md"))
        if p is not None:
            article = p.relative_to(ROOT).as_posix()
            break
    return images, article, brand_slug, photo_mode, photo_from


def web_path(path):
    """Ruta lista para usar como URL (espacios, acentos y & codificados)."""
    return quote(path, safe="/") if path else path


def compact_specs(data):
    return {key: value for key, value in data.items() if meaningful(value)}


def split_legacy_displacement(value, aspiration):
    if aspiration is not None or not isinstance(value, str):
        return value, aspiration
    m = re.fullmatch(r"\s*(\d+(?:[.,]\d+)?)\s*(NA|TT|T\+C|T|C)\s*", value, re.I)
    if not m:
        return value, aspiration
    number = float(m.group(1).replace(",", "."))
    if number.is_integer():
        number = int(number)
    labels = {
        "NA": "Atmosférico",
        "T": "Turbo",
        "TT": "Twin Turbo",
        "C": "Compresor",
        "T+C": "Turbo + Compresor",
    }
    return number, labels.get(m.group(2).upper(), m.group(2))


def car_record(headers, row):
    r = RowReader(headers, row)
    brand = r.get("Marca")
    model = r.get("Modelo")
    if not brand or not model:
        return None

    generation = r.get("Generación", "Generacion") or "-"
    version = r.get("Versión", "Version") or "-"
    start, end = r.get("Inicio"), r.get("Fin")
    malformed_start = isinstance(start, str) and end is None and not re.fullmatch(r"\s*(18\d{2}|19\d{2}|20\d{2}|21\d{2})\s*", start)
    if malformed_start:
        ys, explicit_end, ye = None, None, None
        ytext = str(start).strip()
        source_end = None
    else:
        ys, explicit_end = int_year(start), int_year(end)
        ye = explicit_end if explicit_end is not None else (CURRENT_YEAR if ys is not None and end is None else None)
        ytext = year_text(start, end)
        source_end = end if end is not None else ("Actualidad" if ys is not None else None)

    displacement, aspiration = split_legacy_displacement(r.get("CC / Asp", "Cilindrada"), r.get("Aspiración", "Aspiracion"))

    specs = compact_specs({
        "Favorito": r.get("⭐"),
        "Forza": r.get("Forza"),
        "Cilindrada": displacement,
        "Aspiración": aspiration,
        "Arquitectura motor": r.get("Motor"),
        "Combustible": r.get("Comb", "Combustible"),
        "Potencia": r.get("Potencia"),
        "RPM potencia": r.get("Pot rpm", "cv rpm"),
        "Par": r.get("Par (Nm)", "Par"),
        "RPM par": r.get("Par rpm", "Nm rpm"),
        "Límite de revoluciones": r.get("Limite rpm", "Límite rpm"),
        "Tracción": r.get("Tracción", "Traccion"),
        "Peso DIN": r.get("Peso (DIN)"),
        "Batalla / Largo / Ancho / Alto": r.get("Bat./Largo/Anch/Alto"),
        "kg/CV": r.get("Kg/Hp", "Kg/cv", "kg/CV"),
        "0-100 km/h": r.get("0-100"),
        "80-120 km/h": r.get("80-120"),
        "400 m": r.get("400m"),
        "Velocidad máxima": r.get("Vmax"),
        "100-0 km/h": r.get("100-0 (m)"),
        # V4.4.1: el precio de coche pasa a ser un intervalo (Precio min / Precio max).
        # "Precio Actual" se mantiene como alias por compatibilidad con bases antiguas.
        "Precio mínimo": r.get("Precio min", "Precio Actual"),
        "Precio máximo": r.get("Precio max"),
        "Precio original España": r.get("Precio Original España", "Precio Original"),
        "Consumo homologado": r.get("Consumo homologado"),
        "Consumo real": r.get("Consumo real"),
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
        "Código motor": r.get("MOTOR"),
        "Vida útil motor": r.get("VDIa util motor", "Vida util motor", "Vida útil motor"),
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
        "Fecha de actualización": excel_serial_date(r.get("Fecha")),
    })

    return {
        "type": "car",
        "brand": str(brand),
        "model": str(model),
        "generation": str(generation),
        "version": str(version),
        "name": display_name(brand, model, generation, version),
        "yearStart": ys,
        "yearEnd": ye,
        "yearText": ytext,
        "favorite": r.get("⭐"),
        "forza": r.get("Forza"),
        "power": r.get("Potencia"),
        "torque": r.get("Par (Nm)", "Par"),
        "weight": r.get("Peso (DIN)"),
        "kgcv": r.get("Kg/Hp", "Kg/cv", "kg/CV"),
        "zero100": r.get("0-100"),
        "vmax": r.get("Vmax"),
        "price": r.get("Precio min", "Precio Actual"),
        "category": r.get("Categoría", "Categoria"),
        "subcategory": r.get("Subcategoría", "Subcategoria"),
        "taxonomyLocked": True,
        "specs": specs,
        "sourceId": r.get("ID Motorpedia"),
        "photoGroup": r.get("ID Fotos") or r.get("Grupo fotos"),
        "sourceStart": start,
        "sourceEnd": source_end,
    }


def moto_record(headers, row):
    r = RowReader(headers, row)
    brand = r.get("Marca")
    model = r.get("Modelo")
    if not brand or not model:
        return None

    generation = r.get("Generación", "Generacion") or "-"
    version = r.get("Versión", "Version") or "-"
    years = r.get("Año", "Ano")
    ys, ye = year_range(years)
    if ys is not None and ye is None:
        ye = ys

    specs = compact_specs({
        "Categoría": r.get("Categoría", "Categoria"),
        "Subcategoría": r.get("Subcategoría", "Subcategoria"),
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
        # Legacy / future optional columns remain supported.
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

    return {
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
        "photoGroup": r.get("ID Fotos") or r.get("Grupo fotos"),
        "sourceStart": ys,
        "sourceEnd": ye,
    }


def enrich_identity_specs(record, vehicle_id, excel_id=None):
    end_value = record.pop("sourceEnd", None)
    start_value = record.pop("sourceStart", None)
    identity_values = {
        # V4.4.4: los ID son información interna; ya no se publican dentro de specs.
        "Marca": record.get("brand"),
        "Modelo": record.get("model"),
        "Generación": record.get("generation"),
        "Versión": record.get("version"),
        "Inicio producción": start_value,
        "Fin producción": end_value,
    }
    # Identity fields intentionally keep '-' because it is meaningful in V4.4
    # (single generation / version not specified).
    identity = {key: value for key, value in identity_values.items() if clean(value) is not None}
    record["specs"] = {**identity, **record.get("specs", {})}


def choose_id(record, explicit, signature, old_by_signature, old_by_identity,
              sig_occurrences, identity_occurrences):
    # Published IDs are preserved first so existing photos/articles never break
    # when the spreadsheet structure changes (e.g. Gen 1 -> "-" or split years).
    ikey = identity_key(record)
    iocc = identity_occurrences.get(ikey, 0)
    identity_occurrences[ikey] = iocc + 1
    if ikey in old_by_identity and iocc < len(old_by_identity[ikey]):
        return old_by_identity[ikey][iocc], "preserved-identity"

    if explicit:
        return slugify(explicit), "excel"

    socc = sig_occurrences.get(signature, 0)
    sig_occurrences[signature] = socc + 1
    if signature in old_by_signature and socc < len(old_by_signature[signature]):
        return old_by_signature[signature][socc], "preserved-signature"

    base = generated_id(record, signature)
    return base if socc == 0 else f"{base}-{socc + 1}", "generated"


def main():
    db = database_file()
    car_rows, moto_rows = read_workbook(db)
    car_headers = car_rows[0]
    moto_headers = moto_rows[0]
    old_by_signature, old_by_identity = previous_state()

    sig_occurrences = {}
    identity_occurrences = {}
    excel_occurrences = {}
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

            raw_photo_group = record.pop("photoGroup", None)
            signature = stable_signature(record)
            explicit = clean(record.pop("sourceId", None))
            vehicle_id, id_source = choose_id(
                record, explicit, signature,
                old_by_signature, old_by_identity,
                sig_occurrences, identity_occurrences,
            )

            if vehicle_id in seen:
                n = 2
                base = vehicle_id
                while f"{base}-{n}" in seen:
                    n += 1
                vehicle_id = f"{base}-{n}"
            seen[vehicle_id] = record["name"]

            enrich_identity_specs(record, vehicle_id, explicit)
            media_occurrence = 0
            if explicit:
                ekey = media_key(explicit)
                media_occurrence = excel_occurrences.get(ekey, 0)
                excel_occurrences[ekey] = media_occurrence + 1
            photo_group = clean_photo_group(raw_photo_group, explicit)
            images, article, brand_slug, photo_mode, photo_from = media_for(
                record["brand"], vehicle_id, explicit, media_occurrence, photo_group
            )
            expected = safe_filename(media_names(vehicle_id, explicit, media_occurrence)[0])
            record["id"] = vehicle_id
            record["media"] = {"images": [web_path(i) for i in images]}
            record["article"] = web_path(article)
            vehicles.append(record)

            index_rows.append({
                "signature": signature,
                "id": vehicle_id,
                "excel_id": explicit or "",
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
                "photo_folder": f"assets/vehicles/{brand_slug}/{expected}/",
                "quick_photo_1": f"assets/vehicles/_quick/{expected}-1.webp",
                "quick_photo_2": f"assets/vehicles/_quick/{expected}-2.webp",
                "photo_group": photo_group or "",
                "photo_from": photo_from,
                "photo_mode": photo_mode,
                "photo_1": images[0] if len(images) > 0 else "",
                "photo_2": images[1] if len(images) > 1 else "",
                "article_file": f"content/articles/{brand_slug}/{expected}.md",
                "article_exists": "yes" if article else "no",
                "spec_count": len(record.get("specs", {})),
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
        "signature", "id", "excel_id", "id_source", "type", "brand", "category", "subcategory",
        "model", "generation", "version", "name", "years",
        "photo_folder", "quick_photo_1", "quick_photo_2", "photo_group", "photo_from", "photo_mode",
        "photo_1", "photo_2", "article_file", "article_exists", "spec_count",
    ]
    with (DATA_DIR / "content-index.csv").open("w", encoding="utf-8", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=fields)
        writer.writeheader()
        writer.writerows(index_rows)

    print(
        f"Motorpedia V4.4.4 actualizada desde {db.name}: {stats['total']} vehículos "
        f"({stats['cars']} coches + {stats['motos']} motos), "
        f"{stats['withPhotos']} fichas con fotos y {stats['withArticles']} con artículo."
    )


if __name__ == "__main__":
    main()
