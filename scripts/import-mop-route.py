#!/usr/bin/env python3
"""
Importa la geometría oficial de una ruta desde la Red Vial de Dirección de Vialidad (MOP)
y genera una copia local en src/data/routes/<codigo>.json para el Location Resolver.

Se ejecuta SOLO para actualizar datos, nunca durante una emergencia.
Uso: python3 scripts/import-mop-route.py "Ruta 215 CH" CH-215
"""
import json, sys, datetime, urllib.parse, urllib.request, pathlib

SERVICE = "https://rest-sit.mop.gob.cl/arcgis/rest/services/VIALIDAD/Red_Vial_Chile/MapServer/1"

def main(rol: str, code: str):
    q = urllib.parse.urlencode({
        "where": f"ROL='{rol}'", "outFields": "*", "returnGeometry": "true",
        "returnM": "true", "outSR": "4326", "f": "json",
    })
    with urllib.request.urlopen(f"{SERVICE}/query?{q}", timeout=120) as r:
        data = json.load(r)
    feats = data.get("features") or []
    if not feats:
        sys.exit(f"Sin tramos para ROL={rol}")

    segments, names = [], set()
    for f in feats:
        a = f["attributes"]
        names.add(a.get("NOMBRE_CAMINO"))
        pts = []
        for path in f["geometry"]["paths"]:
            for x, y, m in path:
                pts.append([round(y, 6), round(x, 6), int(round(m))])
        pts.sort(key=lambda p: p[2])
        segments.append({
            "objectId": a["OBJECTID"], "kmStartM": a["KM_I"], "kmEndM": a["KM_F"],
            "lengthM": a["KM_TRAMO"], "surface": a.get("CARPETA"), "region": a.get("REGION"),
            "points": pts,
        })
    segments.sort(key=lambda s: s["kmStartM"])

    out = {
        "meta": {
            "source": "Dirección de Vialidad / MOP",
            "service": SERVICE,
            "layer": "Red_Vial_Chile / capa 1",
            "rol": rol,
            "routeCode": code,
            "name": " / ".join(sorted(n for n in names if n)),
            "fetchedAt": datetime.date.today().isoformat(),
            "dataVersion": "Red Vial Chile (Vialidad, datos de referencia 2017) · OBJECTID "
                           + ",".join(str(s["objectId"]) for s in segments),
            "units": "points = [lat, lng, m]; m = referencia kilométrica oficial en metros",
        },
        "segments": segments,
    }
    dest = pathlib.Path(__file__).resolve().parent.parent / "src/data/routes" / f"{code.lower()}.json"
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")))
    print(dest, sum(len(s["points"]) for s in segments), "puntos", len(segments), "tramos")

if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
