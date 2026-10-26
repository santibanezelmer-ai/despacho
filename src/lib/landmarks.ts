/**
 * Puntos de referencia (Fase 4) — solo Consola Web.
 * Datos comunes de solo lectura, copiados localmente desde fuentes oficiales
 * (scripts/import-mop-bridges.py). No se consulta ningún servicio en la búsqueda.
 */
import { normalizeText } from './locationResolver';

/** Tipos preparados; por ahora solo se cargan puentes. */
export type LandmarkType =
  | 'bridge' | 'health' | 'fire_station' | 'police' | 'aed' | 'school'
  | 'sector' | 'locality' | 'crossing' | 'other';

export const LANDMARK_TYPE_LABEL: Record<LandmarkType, string> = {
  bridge: 'Puente', health: 'Salud', fire_station: 'Bomberos', police: 'Carabineros', aed: 'DEA',
  school: 'Escuela', sector: 'Sector', locality: 'Localidad', crossing: 'Cruce', other: 'Punto de referencia',
};

export interface Landmark {
  id: string;
  name: string;
  normalized_name: string;
  type: LandmarkType;
  route_code: string | null;
  road_name?: string | null;
  kilometer: number | null;
  latitude: number;
  longitude: number;
  aliases: string[];
  source: string;
  source_ref?: string | null;
  created_at: string;
  updated_at: string;
}

/** Registro de conjuntos disponibles. Para agregar otro: importar su JSON y sumarlo aquí. */
const DATASETS: Array<() => Promise<{ landmarks: Landmark[] }>> = [
  () => import('@/data/landmarks/bridges-osorno.json').then(m => (m.default ?? m) as unknown as { landmarks: Landmark[] }),
];

type Indexed = Landmark & { _keys: string[] };
let indexPromise: Promise<Indexed[]> | null = null;
function loadIndex() {
  indexPromise ??= Promise.all(DATASETS.map(l => l())).then(sets =>
    sets.flatMap(s => s.landmarks).map(l => ({
      ...l,
      _keys: [...new Set([l.normalized_name, ...l.aliases.map(normalizeText)].map(clean))],
    })),
  );
  return indexPromise;
}

const clean = (s: string) => normalizeText(s).replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

/** Palabras que indican que el operador busca un punto de referencia. */
const TRIGGER = /^(puente|pte|viaducto|paso superior)\b/;

export function looksLikeLandmark(query: string) {
  return TRIGGER.test(clean(query.split(/[,;]/)[0] ?? ''));
}

/** Contexto de ruta: "CH-215", "ruta 215", "U-709". */
function parseRouteContext(ctx: string[]): string | null {
  for (const c of ctx) {
    const s = clean(c);
    const m = s.match(/^(?:ruta\s*)?(ch)?\s*(\d{1,4})$/) ;
    if (m) return `CH-${Number(m[2])}`;
    const o = c.trim().toUpperCase().match(/^([A-Z])\s*-?\s*(\d{1,4})$/);
    if (o) return `${o[1]}-${Number(o[2])}`;
  }
  return null;
}

export interface LandmarkMatch { landmark: Landmark; exact: boolean }

/**
 * Busca puntos de referencia. Coincidencia exacta de nombre/alias o todas las palabras.
 * Si hay contexto de ruta, filtra por esa ruta. Nunca elige silenciosamente: devuelve todos.
 */
export async function searchLandmarks(query: string): Promise<LandmarkMatch[]> {
  const parts = query.split(/[,;]/).map(p => p.trim()).filter(Boolean);
  const head = clean(parts[0] ?? '');
  if (head.length < 3) return [];
  const route = parseRouteContext(parts.slice(1));
  const tokens = head.split(' ');
  const index = await loadIndex();
  const out: LandmarkMatch[] = [];
  for (const l of index) {
    if (route && l.route_code !== route) continue;
    const exact = l._keys.includes(head);
    const all = exact || l._keys.some(k => tokens.every(t => k.split(' ').some(w => w.startsWith(t))));
    if (all) out.push({ landmark: l, exact });
  }
  return out.sort((a, b) => Number(b.exact) - Number(a.exact)).slice(0, 8);
}
