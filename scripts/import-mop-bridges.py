#!/usr/bin/env python3
"""
Importa puentes oficiales (Dirección de Vialidad / MOP, servicio VIALIDAD/Puentes)
a una copia local de landmarks: src/data/landmarks/bridges-<scope>.json.
Se ejecuta SOLO para actualizar datos, nunca durante una emergencia.
Uso: python3 scripts/import-mop-bridges.py "PROVINCIA='1003'" osorno
"""
import json, sys, datetime, re, unicodedata, urllib.parse, urllib.request, pathlib

SERVICE = "https://rest-sit.mop.gob.cl/arcgis/rest/services/VIALIDAD/Puentes/MapServer/0"
FIELDS = "OBJECTID,CODIGO_PUENTE,NOMBRE_PUENTE,ROL,NOMBRE_CAMINO,CAUCE_QUEB,M_INICIO,PROVINCIA,REGION,LARGO"

def norm(s):
    s = unicodedata.normalize("NFD", s or "")
    s = "".join(c for c in s if unicodedata.category(c) != "Mn").lower()
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9 ]", " ", s)).strip()

def route_code(rol):
    if not rol: return None
    m = re.match(r"Ruta\s+(\d+)\s+CH", rol)
    return f"CH-{int(m.group(1))}" if m else rol.strip()

def title(s):
    return " ".join(w.capitalize() for w in (s or "").lower().split())

def main(where, scope):
    q = urllib.parse.urlencode({"where": where, "outFields": FIELDS, "outSR": "4326", "f": "json"})
    with urllib.request.urlopen(f"{SERVICE}/query?{q}", timeout=120) as r:
        data = json.load(r)
    today = datetime.date.today().isoformat()
    items = []
    for f in data.get("features", []):
        a, g = f["attributes"], f.get("geometry")
        name = (a.get("NOMBRE_PUENTE") or "").strip()
        if not g or not name: continue
        base = re.sub(r"^(puente|pte\.?|viaducto)\s+", "", name, flags=re.I)
        aliases = sorted({title(base), title(f"Puente {base}")} |
                         ({title(a["CAUCE_QUEB"])} if a.get("CAUCE_QUEB") else set()))
        items.append({
            "id": f"mop-bridge-{a['CODIGO_PUENTE'] or a['OBJECTID']}",
            "name": title(name),
            "normalized_name": norm(name),
            "type": "bridge",
            "route_code": route_code(a.get("ROL")),
            "road_name": a.get("NOMBRE_CAMINO"),
            "kilometer": a.get("M_INICIO"),
            "latitude": round(g["y"], 6),
            "longitude": round(g["x"], 6),
            "aliases": aliases,
            "source": "Dirección de Vialidad / MOP",
            "source_ref": a.get("CODIGO_PUENTE"),
            "created_at": today,
            "updated_at": today,
        })
    out = {
        "meta": {
            "source": "Dirección de Vialidad / MOP",
            "service": SERVICE,
            "filter": where,
            "fetchedAt": today,
            "count": len(items),
        },
        "landmarks": items,
    }
    dest = pathlib.Path(__file__).resolve().parent.parent / "src/data/landmarks" / f"bridges-{scope}.json"
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")))
    print(dest, len(items), "puentes")

if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
