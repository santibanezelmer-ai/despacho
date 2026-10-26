/**
 * Fase 6 — Determinación de cobertura territorial (solo informativa).
 * Prueba punto-en-polígono (ray casting, par-impar) sobre la geometría EXACTA
 * de los 10 polígonos "Territorio Prehospitalario" importados del KML.
 * No asigna compañías, no despacha, no genera alertas. No usa distancia: "cerca" ≠ "dentro".
 */
import { loadTerritorialDataset } from './territorialLayers';

type Ring = [number, number][]; // [lat, lng]
interface Territory { id: string; name: string; shortName: string; polygons: Ring[][] }

export type TerritoryResult =
  | { status: 'inside'; territory: { id: string; name: string; shortName: string } }
  | { status: 'boundary'; territories: { id: string; name: string; shortName: string }[] }
  | { status: 'overlap'; territories: { id: string; name: string; shortName: string }[] }
  | { status: 'outside' };

export const TERRITORY_SOURCE = 'Mapa Cobertura Territorial Prehospitalaria';

/** Tolerancia para "exactamente sobre el límite": 1e-9° (~0,1 mm). No es proximidad. */
const EPS = 1e-9;

let cache: Promise<Territory[]> | null = null;
function loadTerritories(): Promise<Territory[]> {
  cache ??= loadTerritorialDataset().then((ds) =>
    ds.features
      .filter((f) => f.layer === 'territory' && f.geometry === 'polygon')
      .map((f) => ({
        id: f.id,
        name: f.name,
        shortName: f.name.replace(/^Territorio Prehospitalario\s+/i, '').trim() || f.name,
        polygons: f.coordinates as Ring[][],
      })),
  );
  return cache;
}

function onSegment(py: number, px: number, a: [number, number], b: [number, number]): boolean {
  const [ay, ax] = a, [by, bx] = b;
  const cross = (px - ax) * (by - ay) - (py - ay) * (bx - ax);
  const len = Math.hypot(bx - ax, by - ay);
  if (Math.abs(cross) > EPS * Math.max(len, EPS)) return false;
  return px >= Math.min(ax, bx) - EPS && px <= Math.max(ax, bx) + EPS
    && py >= Math.min(ay, by) - EPS && py <= Math.max(ay, by) + EPS;
}

/** 1 = dentro, 0 = fuera, -1 = sobre el borde de este anillo. */
function ringTest(lat: number, lng: number, ring: Ring): 1 | 0 | -1 {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i], b = ring[j];
    if (onSegment(lat, lng, a, b)) return -1;
    const [yi, xi] = a, [yj, xj] = b;
    if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside ? 1 : 0;
}

/** 1 dentro, 0 fuera, -1 sobre el límite (considera huecos del polígono). */
export function pointInTerritory(lat: number, lng: number, polygons: Ring[][]): 1 | 0 | -1 {
  for (const [outer, ...holes] of polygons) {
    const o = ringTest(lat, lng, outer);
    if (o === -1) return -1;
    if (o === 0) continue;
    let inHole = false;
    for (const h of holes) {
      const t = ringTest(lat, lng, h);
      if (t === -1) return -1;
      if (t === 1) { inHole = true; break; }
    }
    if (!inHole) return 1;
  }
  return 0;
}

export async function lookupTerritory(lat: number, lng: number): Promise<TerritoryResult> {
  const territories = await loadTerritories();
  const inside: Territory[] = [], boundary: Territory[] = [];
  for (const t of territories) {
    const r = pointInTerritory(lat, lng, t.polygons);
    if (r === 1) inside.push(t);
    else if (r === -1) boundary.push(t);
  }
  const pick = (t: Territory) => ({ id: t.id, name: t.name, shortName: t.shortName });
  if (boundary.length) return { status: 'boundary', territories: [...boundary, ...inside].map(pick) };
  if (inside.length > 1) return { status: 'overlap', territories: inside.map(pick) };
  if (inside.length === 1) return { status: 'inside', territory: pick(inside[0]) };
  return { status: 'outside' };
}
