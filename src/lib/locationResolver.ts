/**
 * Location Resolver (Fase 2) — solo Consola Web.
 * Interpreta calles, avenidas, pasajes, caminos, rutas y sectores con contexto
 * geográfico (comuna / localidad) y resuelve con Nominatim (OSM) como respaldo.
 * Nunca inventa coordenadas: todo punto proviene de un resultado real de OSM.
 */

import { looksLikeLandmark, searchLandmarks } from './landmarks';

export type LocationType = 'calle' | 'avenida' | 'pasaje' | 'camino' | 'ruta' | 'sector' | 'localidad' | 'desconocido';
export type LocationConfidence = 'high' | 'medium' | 'low';

export interface ParsedLocationQuery {
  original: string;
  /** Texto de la vía o lugar principal, sin el prefijo de tipo. */
  name: string;
  /** Vía completa tal como se enviará a la búsqueda (con prefijo si lo tenía). */
  street: string;
  type: LocationType;
  /** Contextos geográficos escritos por el operador (comuna, localidad, sector). */
  context: string[];
}

export interface LocationCandidate {
  id: string;
  label: string;
  secondary: string;
  latitude: number;
  longitude: number;
  type: LocationType;
  street: string | null;
  locality: string | null;
  commune: string | null;
  region: string | null;
  confidence: LocationConfidence;
  reason: string;
  source: 'nominatim' | 'vialidad' | 'landmark';
  /** Presente cuando proviene de un punto de referencia local (puente, etc.). */
  landmark?: { type: string; routeCode: string | null; kilometer: number | null; source: string };
}

export interface ResolveOptions {
  /** Contexto por defecto (p. ej. comuna de la organización) si el operador no escribe uno. */
  defaultContext?: string | null;
  /** Punto de referencia para priorizar resultados cercanos (cuartel/organización). */
  near?: { lat: number; lng: number } | null;
  signal?: AbortSignal;
}

const NOMINATIM = 'https://nominatim.openstreetmap.org/search';

/** Minúsculas, sin tildes, espacios colapsados. Conserva la ñ como n para tolerar "Nilque". */
export function normalizeText(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const TYPE_PREFIXES: Array<{ re: RegExp; type: LocationType; canonical: string }> = [
  { re: /^(avenida|avda|av)\s+/, type: 'avenida', canonical: 'Avenida' },
  { re: /^(pasaje|psje|pje)\s+/, type: 'pasaje', canonical: 'Pasaje' },
  { re: /^(camino)\s+/, type: 'camino', canonical: 'Camino' },
  { re: /^(ruta)\s+/, type: 'ruta', canonical: 'Ruta' },
  { re: /^(sector)\s+/, type: 'sector', canonical: 'Sector' },
  { re: /^(calle)\s+/, type: 'calle', canonical: 'Calle' },
];

function titleCase(s: string) {
  return s.replace(/\S+/g, w => w.charAt(0).toUpperCase() + w.slice(1));
}

/** Separa vía / tipo / contexto: "Pasaje Los Alerces, Puyehue". */
export function parseLocationQuery(query: string): ParsedLocationQuery {
  const original = query.trim();
  const parts = original.split(/[,;]/).map(p => p.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const head = parts[0] ?? '';
  const context = parts.slice(1);
  const normHead = normalizeText(head);

  for (const p of TYPE_PREFIXES) {
    const m = normHead.match(p.re);
    if (m) {
      const rest = head.replace(/^\S+\.?\s+/, '').trim();
      return { original, name: rest, street: `${p.canonical} ${rest}`, type: p.type, context };
    }
  }
  return { original, name: head, street: head, type: 'desconocido', context };
}

type NominatimResult = {
  place_id: number;
  lat: string;
  lon: string;
  name?: string;
  display_name: string;
  addresstype?: string;
  category?: string;
  type?: string;
  importance?: number;
  boundingbox?: [string, string, string, string];
  address?: Record<string, string>;
};

const cache = new Map<string, NominatimResult[]>();
let lastCall = 0;

/** Respeta la política de uso de Nominatim: máx. 1 solicitud por segundo y caché local. */
async function nominatim(params: Record<string, string>, signal?: AbortSignal): Promise<NominatimResult[]> {
  const qs = new URLSearchParams({ format: 'jsonv2', addressdetails: '1', countrycodes: 'cl', ...params });
  const key = qs.toString();
  const hit = cache.get(key);
  if (hit) return hit;
  const wait = 1100 - (Date.now() - lastCall);
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastCall = Date.now();
  const res = await fetch(`${NOMINATIM}?${key}`, { headers: { Accept: 'application/json' }, signal });
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);
  const data = (await res.json()) as NominatimResult[];
  const list = Array.isArray(data) ? data : [];
  cache.set(key, list);
  return list;
}

function localityOf(a: Record<string, string> = {}) {
  return a.town || a.village || a.hamlet || a.suburb || a.neighbourhood || a.locality || a.city_district || null;
}
function communeOf(a: Record<string, string> = {}) {
  return a.municipality || a.city || a.county || null;
}
function isPlaceResult(r: NominatimResult) {
  return ['town', 'village', 'hamlet', 'city', 'municipality', 'suburb', 'neighbourhood', 'locality', 'county', 'isolated_dwelling'].includes(r.addresstype ?? '');
}

function typeFromResult(r: NominatimResult, fallback: LocationType): LocationType {
  const n = normalizeText(r.name ?? '');
  for (const p of TYPE_PREFIXES) if (p.re.test(n)) return p.type;
  if (isPlaceResult(r)) return 'localidad';
  if (r.category === 'highway') return fallback === 'desconocido' ? 'calle' : fallback;
  return fallback;
}

/** Todas las palabras significativas del nombre buscado deben estar en el nombre encontrado. */
function nameMatches(searched: string, found: string) {
  const f = normalizeText(found);
  const words = normalizeText(searched).split(' ').filter(w => w.length > 2 && !['los', 'las', 'del', 'de'].includes(w));
  if (!words.length) return false;
  return words.every(w => f.includes(w));
}

function contextMatches(ctx: string, a: Record<string, string> = {}) {
  const c = normalizeText(ctx);
  return Object.values(a).some(v => normalizeText(v) === c || normalizeText(v).includes(c));
}

function toCandidate(r: NominatimResult, parsed: ParsedLocationQuery, contexts: string[], mode: 'street' | 'context-only'): LocationCandidate {
  const a = r.address ?? {};
  const street = a.road || (r.category === 'highway' ? r.name : null) || null;
  const locality = localityOf(a);
  const commune = communeOf(a);
  const type = mode === 'context-only' ? 'localidad' : typeFromResult(r, parsed.type);
  const ctxOk = contexts.length > 0 && contexts.every(c => contextMatches(c, a));
  const nameOk = mode === 'street' && nameMatches(parsed.name, r.name ?? street ?? '');

  let confidence: LocationConfidence;
  let reason: string;
  if (mode === 'context-only') {
    confidence = 'low';
    reason = `No se encontró "${parsed.street}" en OpenStreetMap; solo se ubicó la localidad/comuna.`;
  } else if (nameOk && ctxOk) {
    confidence = 'high';
    reason = 'Coincide la vía y el contexto geográfico.';
  } else if (nameOk) {
    confidence = 'medium';
    reason = contexts.length ? 'Coincide la vía, pero no el contexto indicado.' : 'Coincide la vía; sin comuna/localidad para confirmar.';
  } else {
    confidence = 'low';
    reason = 'El nombre encontrado no coincide exactamente con lo buscado.';
  }

  const label = mode === 'context-only' ? (r.name || r.display_name.split(',')[0]) : (r.name || street || r.display_name.split(',')[0]);
  const secondary = [locality, commune && commune !== locality ? commune : null, a.state].filter(Boolean).join(', ');
  return {
    id: String(r.place_id),
    label,
    secondary: secondary || r.display_name,
    latitude: parseFloat(r.lat),
    longitude: parseFloat(r.lon),
    type,
    street: mode === 'street' ? street : null,
    locality,
    commune,
    region: a.state ?? null,
    confidence,
    reason,
    source: 'nominatim',
  };
}

const RANK: Record<LocationConfidence, number> = { high: 0, medium: 1, low: 2 };

/**
 * Resuelve una búsqueda escrita por el operador y devuelve candidatos ordenados por confianza.
 * El operador siempre elige; nunca se coloca un punto automáticamente.
 */
export async function resolveLocation(query: string, opts: ResolveOptions = {}): Promise<LocationCandidate[]> {
  // Prioridad 2: puntos de referencia locales (puentes). La prioridad 1 (ruta + km) se resuelve antes en la consola.
  if (looksLikeLandmark(query)) {
    const matches = await searchLandmarks(query);
    if (matches.length) {
      return matches.map(({ landmark: l, exact }) => ({
        id: l.id,
        label: l.name,
        secondary: [l.route_code ? `Ruta ${l.route_code}` : l.road_name, l.kilometer != null ? `Km ${l.kilometer}` : null].filter(Boolean).join(' — ') || l.source,
        latitude: l.latitude,
        longitude: l.longitude,
        type: 'desconocido' as LocationType,
        street: l.road_name ?? null,
        locality: null, commune: null, region: null,
        confidence: (exact ? 'high' : 'medium') as LocationConfidence,
        reason: `${exact ? 'Coincidencia exacta' : 'Coincidencia parcial'} con punto de referencia oficial (${l.source}${l.source_ref ? `, código ${l.source_ref}` : ''}).`,
        source: 'landmark' as const,
        landmark: { type: l.type, routeCode: l.route_code, kilometer: l.kilometer, source: l.source },
      }));
    }
  }

  const parsed = parseLocationQuery(query);
  if (normalizeText(parsed.name).length < 3) return [];

  const contexts = parsed.context.length ? parsed.context : opts.defaultContext ? [opts.defaultContext] : [];
  const usingDefault = parsed.context.length === 0 && contexts.length > 0;

  // 1) Ubicar el contexto (localidad/comuna) para acotar la búsqueda a su área real.
  let area: NominatimResult | null = null;
  if (contexts.length) {
    const places = await nominatim({ q: contexts.join(', '), limit: '3' }, opts.signal);
    area = places.find(isPlaceResult) ?? places[0] ?? null;
  }

  const results: LocationCandidate[] = [];
  const seen = new Set<string>();
  const push = (list: NominatimResult[], mode: 'street' | 'context-only', ctx: string[]) => {
    for (const r of list) {
      const k = `${normalizeText(r.name ?? '')}|${Number(r.lat).toFixed(3)}|${Number(r.lon).toFixed(3)}`;
      if (seen.has(k)) continue;
      seen.add(k);
      results.push(toCandidate(r, parsed, ctx, mode));
    }
  };

  // 2) Vía dentro del área del contexto (viewbox acotado, con margen).
  if (area?.boundingbox) {
    const [s, n, w, e] = area.boundingbox.map(Number);
    const pad = 0.05;
    const viewbox = `${w - pad},${n + pad},${e + pad},${s - pad}`;
    push(await nominatim({ q: parsed.street, viewbox, bounded: '1', limit: '6' }, opts.signal), 'street', contexts);
  }

  // 3) Búsqueda con texto completo (Chile). Si el contexto era por defecto, se evalúa sin exigirlo.
  if (results.length === 0) {
    const q = [parsed.street, ...parsed.context].join(', ');
    const extra: Record<string, string> = { q, limit: '6' };
    if (opts.near) {
      const d = 0.6;
      extra.viewbox = `${opts.near.lng - d},${opts.near.lat + d},${opts.near.lng + d},${opts.near.lat - d}`;
    }
    push(await nominatim(extra, opts.signal), 'street', usingDefault ? [] : contexts);
  }

  // 4) Solo se encontró el contexto: se ofrece como ubicación aproximada (baja confianza).
  if (results.length === 0 && area && parsed.context.length) {
    push([area], 'context-only', contexts);
  }

  return results.sort((a, b) => RANK[a.confidence] - RANK[b.confidence]).slice(0, 8);
}
