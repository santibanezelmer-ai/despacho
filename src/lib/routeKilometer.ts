/**
 * Resolución Ruta + kilometraje (Fase 3) — solo Consola Web.
 * Usa copias locales de la Red Vial oficial (Vialidad/MOP) generadas con
 * scripts/import-mop-route.py. Nunca consulta el MOP durante la búsqueda.
 * La coordenada se interpola entre los dos vértices oficiales cuya referencia
 * kilométrica (M) encierra el km pedido; nunca se estima desde el origen.
 */

export interface RouteMeta {
  source: string;
  service: string;
  layer: string;
  rol: string;
  routeCode: string;
  name: string;
  fetchedAt: string;
  dataVersion: string;
}

interface RouteSegment {
  objectId: number;
  kmStartM: number;
  kmEndM: number;
  points: [number, number, number][];
}

interface RouteData { meta: RouteMeta; segments: RouteSegment[] }

/** Registro de rutas disponibles. Para agregar una ruta: importar su JSON y sumarla aquí. */
const ROUTE_LOADERS: Record<string, () => Promise<RouteData>> = {
  'CH-215': () => import('@/data/routes/ch-215.json').then(m => (m.default ?? m) as unknown as RouteData),
};

const cache = new Map<string, Promise<RouteData>>();
function loadRoute(code: string) {
  if (!cache.has(code)) cache.set(code, ROUTE_LOADERS[code]());
  return cache.get(code)!;
}

export interface RouteKmQuery { routeCode: string; kilometer: number }

/**
 * Detecta "CH-215 km 55", "Ruta CH 215 km 55", "Km 55 CH-215", "CH-215 kilómetro 55", "ruta 215 km 55,5".
 */
export function parseRouteKmQuery(input: string): RouteKmQuery | null {
  const s = input.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  const kmMatch = s.match(/\b(?:km|kms|kilometro|kilometros)\s*\.?\s*(\d+(?:[.,]\d+)?)/);
  if (!kmMatch) return null;
  const rest = s.replace(kmMatch[0], ' ');
  const r = rest.match(/\b(ch)\s*-?\s*(\d{1,4})\b/) || rest.match(/\bruta\s*()(\d{1,4})\b/);
  if (!r) return null;
  return { routeCode: `CH-${Number(r[2])}`, kilometer: Number(kmMatch[1].replace(',', '.')) };
}

export function isRouteSupported(code: string) { return code in ROUTE_LOADERS; }

export type RouteKmResult =
  | { status: 'found'; routeCode: string; kilometer: number; latitude: number; longitude: number; meta: RouteMeta }
  | { status: 'out_of_range'; routeCode: string; kilometer: number; minKm: number; maxKm: number; meta: RouteMeta }
  | { status: 'unsupported_route'; routeCode: string; kilometer: number };

export async function resolveRouteKm(q: RouteKmQuery): Promise<RouteKmResult> {
  if (!isRouteSupported(q.routeCode)) return { status: 'unsupported_route', ...q };
  const data = await loadRoute(q.routeCode);
  const m = q.kilometer * 1000;
  const minKm = Math.min(...data.segments.map(s => s.kmStartM)) / 1000;
  const maxKm = Math.max(...data.segments.map(s => s.kmEndM)) / 1000;
  for (const seg of data.segments) {
    if (m < seg.kmStartM || m > seg.kmEndM) continue;
    const pts = seg.points;
    // Búsqueda binaria del primer vértice con M >= m.
    let lo = 0, hi = pts.length - 1;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (pts[mid][2] < m) lo = mid + 1; else hi = mid; }
    const b = pts[lo], a = pts[Math.max(0, lo - 1)];
    const t = b[2] === a[2] ? 0 : (m - a[2]) / (b[2] - a[2]);
    return {
      status: 'found', ...q,
      latitude: +(a[0] + (b[0] - a[0]) * t).toFixed(6),
      longitude: +(a[1] + (b[1] - a[1]) * t).toFixed(6),
      meta: data.meta,
    };
  }
  return { status: 'out_of_range', ...q, minKm, maxKm, meta: data.meta };
}
