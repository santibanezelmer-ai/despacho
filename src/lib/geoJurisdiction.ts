// Validador geográfico centralizado: único lugar donde se decide si una coordenada
// puede aceptarse automáticamente, requiere revisión del operador o queda fuera del radio.
// El radio es un cinturón de seguridad, no prueba de jurisdicción (eso es TerritoryStatus).

export const DEFAULT_SAFETY_RADIUS_KM = 50;

export type GeoOrigin = { lat: number; lng: number; commune?: string | null; region?: string | null };

export type GeoCheckInput = {
  latitude: number;
  longitude: number;
  commune?: string | null;
  region?: string | null;
  /** Fuentes locales verificadas (puntos locales, rutas MOP, cruces) no se contrastan por comuna. */
  trusted?: boolean;
};

export type GeoCheckStatus = 'ok' | 'review' | 'outside' | 'unknown';

export type GeoCheck = {
  status: GeoCheckStatus;
  distanceKm: number | null;
  reasons: string[];
};

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/^(region|región)\s+(de\s+)?(los\s+|la\s+)?/, '').trim();

export function evaluateLocation(
  input: GeoCheckInput,
  origin: GeoOrigin | null,
  radiusKm: number = DEFAULT_SAFETY_RADIUS_KM,
): GeoCheck {
  if (!Number.isFinite(input.latitude) || !Number.isFinite(input.longitude)) {
    return { status: 'outside', distanceKm: null, reasons: ['Coordenadas inválidas.'] };
  }
  if (!origin || !Number.isFinite(origin.lat) || !Number.isFinite(origin.lng)) {
    return { status: 'unknown', distanceKm: null, reasons: ['La organización no tiene coordenadas de referencia.'] };
  }
  const distanceKm = haversineKm(origin, { lat: input.latitude, lng: input.longitude });
  const reasons: string[] = [];
  if (distanceKm > radiusKm) {
    reasons.push(`Está a ${distanceKm.toFixed(1)} km de la central (límite de seguridad ${radiusKm} km).`);
    return { status: 'outside', distanceKm, reasons };
  }
  if (!input.trusted) {
    if (input.region && origin.region && norm(input.region) !== norm(origin.region)) {
      reasons.push(`Región detectada «${input.region}» distinta de «${origin.region}».`);
    }
    if (input.commune && origin.commune && norm(input.commune) !== norm(origin.commune)) {
      reasons.push(`Comuna detectada «${input.commune}» distinta de «${origin.commune}».`);
    }
  }
  return { status: reasons.length ? 'review' : 'ok', distanceKm, reasons };
}

/** Solo una ubicación 'ok' puede confirmarse sin intervención del operador. */
export const canAutoAccept = (c: GeoCheck) => c.status === 'ok';
