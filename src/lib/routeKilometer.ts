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
  'U-485': () => import('@/data/routes/u-485.json').then(m => (m.default ?? m) as unknown as RouteData),
  'U-483': () => import('@/data/routes/u-483.json').then(m => (m.default ?? m) as unknown as RouteData),
  'U-465': () => import('@/data/routes/u-465.json').then(m => (m.default ?? m) as unknown as RouteData),
  'U-475': () => import('@/data/routes/u-475.json').then(m => (m.default ?? m) as unknown as RouteData),
  'U-473': () => import('@/data/routes/u-473.json').then(m => (m.default ?? m) as unknown as RouteData),
  'U-481': () => import('@/data/routes/u-481.json').then(m => (m.default ?? m) as unknown as RouteData),
  'U-981-T': () => import('@/data/routes/u-981-t.json').then(m => (m.default ?? m) as unknown as RouteData),
  'U-55-V': () => import('@/data/routes/u-55-v.json').then(m => (m.default ?? m) as unknown as RouteData),
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
  const kilometer = Number(kmMatch[1].replace(',', '.'));
  // Rutas regionales "U-485", "U 981 T", "ruta u-55-v".
  const u = rest.match(/\b([a-z])\s*-?\s*(\d{1,4})(?:\s*-?\s*([a-z]))?\b/);
  if (u && u[1] !== 'k' && u[1] !== 'c') {
    const code = `${u[1].toUpperCase()}-${Number(u[2])}${u[3] ? `-${u[3].toUpperCase()}` : ''}`;
    if (code in ROUTE_LOADERS || u[1] === 'u') return { routeCode: code, kilometer };
  }
  const r = rest.match(/\b(ch)\s*-?\s*(\d{1,4})\b/) || rest.match(/\bruta\s*()(\d{1,4})\b/);
  if (!r) return null;
  return { routeCode: `CH-${Number(r[2])}`, kilometer };
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

export interface RouteNearestResult {
  routeCode: string;
  kilometer: number;
  distanceM: number;
  latitude: number;
  longitude: number;
  meta: RouteMeta;
}

/**
 * Inverso: dado un punto (marcador movido a mano), busca la ruta oficial local más
 * cercana y su km interpolado entre vértices oficiales. Devuelve null si ninguna
 * ruta está a menos de maxDistanceM. Nunca consulta servicios externos.
 */
export async function findNearestRouteKm(lat: number, lng: number, maxDistanceM = 80): Promise<RouteNearestResult | null> {
  const codes = Object.keys(ROUTE_LOADERS);
  const all = await Promise.all(codes.map(c => loadRoute(c).catch(() => null)));
  const kx = 111320 * Math.cos((lat * Math.PI) / 180), ky = 110540;
  let best: RouteNearestResult | null = null;
  all.forEach((data, i) => {
    if (!data) return;
    for (const seg of data.segments) {
      const p = seg.points;
      for (let j = 1; j < p.length; j++) {
        const a = p[j - 1], b = p[j];
        const ax = (a[1] - lng) * kx, ay = (a[0] - lat) * ky;
        const bx = (b[1] - lng) * kx, by = (b[0] - lat) * ky;
        const dx = bx - ax, dy = by - ay;
        const len2 = dx * dx + dy * dy;
        const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2));
        const px = ax + dx * t, py = ay + dy * t;
        const d = Math.hypot(px, py);
        if (d <= maxDistanceM && (!best || d < best.distanceM)) {
          best = {
            routeCode: codes[i],
            kilometer: +((a[2] + (b[2] - a[2]) * t) / 1000).toFixed(1),
            distanceM: Math.round(d),
            latitude: +(a[0] + (b[0] - a[0]) * t).toFixed(6),
            longitude: +(a[1] + (b[1] - a[1]) * t).toFixed(6),
            meta: data.meta,
          };
        }
      }
    }
  });
  return best;
}

/** Texto de dirección sugerido para una ruta+km. */
export function formatRouteKmAddress(r: { routeCode: string; kilometer: number; meta: RouteMeta }) {
  const km = r.kilometer.toLocaleString('es-CL', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return `Ruta ${r.routeCode} km ${km}${r.meta.name ? ` (${r.meta.name})` : ''}`;
}
