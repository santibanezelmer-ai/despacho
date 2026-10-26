#!/usr/bin/env python3
"""
Importa el KML "Mapa Cobertura Territorial Prehospitalaria Provincia de Osorno"
(exportado desde Google My Maps) a una copia local de solo lectura:
src/data/territorial/osorno-prehospitalario.json.
Se ejecuta SOLO para actualizar datos; la consola nunca consulta My Maps.
Reimportar reemplaza el archivo completo (IDs estables por capa+nombre+coordenadas),
por lo que no se duplican registros.
Uso: python3 scripts/import-territorial-kml.py <archivo.kml>
"""
import sys, json, re, html, hashlib, datetime, pathlib, xml.etree.ElementTree as ET

NS = {"k": "http://www.opengis.net/kml/2.2"}
OUT = pathlib.Path(__file__).resolve().parent.parent / "src/data/territorial/osorno-prehospitalario.json"

# Carpeta KML -> categoría (solo las que existen en el archivo; nada se asume)
CATEGORY = {
    "Estable_Salud_CtaPublica": ("health", "Establecimientos de Salud"),
    "Territorio Prehospitalario": ("territory", "Territorio Prehospitalario"),
    "Carabineros": ("police", "Carabineros"),
    "Posibles EVACAM": ("evacam", "Posibles EVACAM"),
    "Bomberos Provincia": ("fire", "Bomberos"),
    "DEAs Ley 21156 Provincia de Osorno": ("aed", "DEA"),
    "Hogares y Residencias Protegidas": ("residence", "Hogares y Residencias Protegidas"),
    "AMBULANCIAS PREHOSPITALARIAS RED URGENCIAS": ("ambulance", "Ambulancias Prehospitalarias"),
}

def text(s):
    s = re.sub(r"<br\s*/?>", "\n", s or "", flags=re.I)
    s = html.unescape(re.sub(r"<[^>]+>", "", s))
    return "\n".join(l.strip() for l in s.splitlines() if l.strip())

def coords(el):
    out = []
    for c in (el.text or "").split():
        p = c.split(",")
        out.append([float(p[1]), float(p[0])])  # [lat, lng], precisión original
    return out

def main(path):
    root = ET.parse(path).getroot()
    doc = root.find("k:Document", NS)
    if root.findall(".//k:NetworkLink", NS):
        sys.exit("El KML contiene NetworkLink: exportar sin 'Mantener sincronizado'.")
    layers, features, seen = [], [], set()
    for folder in doc.findall("k:Folder", NS):
        fname = folder.findtext("k:name", "", NS).strip()
        if fname not in CATEGORY:
            sys.exit(f"Carpeta desconocida en el KML: {fname!r} (agregarla a CATEGORY)")
        cid, label = CATEGORY[fname]
        count = {"point": 0, "polygon": 0, "line": 0}
        for pm in folder.findall("k:Placemark", NS):
            name = (pm.findtext("k:name", "", NS) or "").strip()
            data = [(d.get("name"), (d.findtext("k:value", "", NS) or "").strip())
                    for d in pm.findall(".//k:ExtendedData/k:Data", NS)]
            fields = [[k, v] for k, v in data if k and v and k.lower() != "descripción"]
            desc = "" if fields else text(pm.findtext("k:description", "", NS))
            style = (pm.findtext("k:styleUrl", "", NS) or "")
            m = re.search(r"-([0-9A-Fa-f]{6})-", style)
            color = f"#{m.group(1)}" if m else None
            f = {"layer": cid, "name": name, "description": desc or None, "fields": fields or None, "color": color}
            pt = pm.find(".//k:Point/k:coordinates", NS)
            polys = pm.findall(".//k:Polygon", NS)
            line = pm.find(".//k:LineString/k:coordinates", NS)
            if pt is not None:
                f.update(geometry="point", coordinates=coords(pt)[0]); count["point"] += 1
            elif polys:
                rings = []
                for poly in polys:
                    outer = coords(poly.find("k:outerBoundaryIs//k:coordinates", NS))
                    holes = [coords(h) for h in poly.findall("k:innerBoundaryIs//k:coordinates", NS)]
                    rings.append([outer] + holes)
                f.update(geometry="polygon", coordinates=rings); count["polygon"] += 1
            elif line is not None:
                f.update(geometry="line", coordinates=coords(line)); count["line"] += 1
            else:
                print("Sin geometría, omitido:", fname, name); continue
            key = f"{cid}|{name}|{json.dumps(f['coordinates'])[:200]}"
            fid = f"{cid}-" + hashlib.sha1(key.encode()).hexdigest()[:12]
            n = 2
            while fid in seen:  # duplicados exactos del KML se conservan (no se pierde información)
                print("Duplicado exacto en el KML:", fname, name); fid = fid.split("~")[0] + f"~{n}"; n += 1
            seen.add(fid); f["id"] = fid
            features.append(f)
        layers.append({"id": cid, "label": label, "source_folder": fname,
                       "counts": {k: v for k, v in count.items() if v}})
    meta = {
        "source_name": doc.findtext("k:name", "", NS).strip(),
        "source_origin": "Google My Maps (exportación KML)",
        "source_file": pathlib.Path(path).name,
        "version": None,
        "imported_at": datetime.date.today().isoformat(),
        "scope": "común, solo lectura (no vinculado a organización)",
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({"meta": meta, "layers": layers, "features": features},
                              ensure_ascii=False, separators=(",", ":")))
    for l in layers: print(l["label"], l["counts"])
    print("Total", len(features), "->", OUT)

if __name__ == "__main__":
    main(sys.argv[1])
