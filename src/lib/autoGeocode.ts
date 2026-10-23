import { matchLocalLandmarks, type LocalLandmark } from '@/lib/localLandmarks';
import { parseRouteKmQuery, resolveRouteKm, parseRouteCrossingQuery, resolveRouteCrossing } from '@/lib/routeKilometer';
import { resolveLocation } from '@/lib/locationResolver';
import { placesAutocomplete, placeDetails, newPlacesSession } from '@/lib/googlePlaces';
import { evaluateLocation, canAutoAccept, type GeoOrigin, type GeoCheck } from '@/lib/geoJurisdiction';

export type AutoGeocodeResult = { latitude: number; longitude: number; source: string; check: GeoCheck } | null;
export type AutoGeocodeOutcome = { result: AutoGeocodeResult; rejected: { source: string; check: GeoCheck }[] };

/**
 * Elige automáticamente la mejor ubicación para una dirección escrita, sin mostrar opciones.
 * Orden: punto local → cruce de rutas → ruta+km (MOP) → Google → Nominatim.
 * Solo acepta resultados que el validador central marca 'ok'; los dudosos se rechazan
 * (el operador debe revisarlos en Acciones → Ubicación).
 */
export async function autoGeocodeDetailed(
  query: string,
  opts: { landmarks: LocalLandmark[]; near: { lat: number; lng: number } | null; defaultContext: string | null; origin?: GeoOrigin | null },
): Promise<AutoGeocodeOutcome> {
  const rejected: AutoGeocodeOutcome['rejected'] = [];
  const q = query.trim();
  if (q.length < 3) return { result: null, rejected };
  const origin: GeoOrigin | null = opts.origin ?? (opts.near ? { ...opts.near, commune: opts.defaultContext } : null);

  const accept = (lat: number, lng: number, source: string, extra: { trusted?: boolean; commune?: string | null; region?: string | null }) => {
    const check = evaluateLocation({ latitude: lat, longitude: lng, ...extra }, origin);
    if (canAutoAccept(check)) return { latitude: lat, longitude: lng, source, check };
    rejected.push({ source, check });
    return null;
  };

  const local = matchLocalLandmarks(q, opts.landmarks, 1)[0];
  if (local) {
    const r = accept(local.latitude, local.longitude, 'punto local', { trusted: true });
    if (r) return { result: r, rejected };
  }

  try {
    const cq = parseRouteCrossingQuery(q);
    if (cq) {
      const cr = await resolveRouteCrossing(cq);
      if (cr.status === 'found') {
        const r = accept(cr.latitude, cr.longitude, 'cruce de rutas', { trusted: true });
        if (r) return { result: r, rejected };
      }
    }
    const rk = parseRouteKmQuery(q);
    if (rk) {
      const rr = await resolveRouteKm(rk);
      if (rr.status === 'found') {
        const r = accept(rr.latitude, rr.longitude, 'ruta y kilómetro', { trusted: true });
        if (r) return { result: r, rejected };
      }
    }
  } catch { /* continúa con otras fuentes */ }

  try {
    const session = newPlacesSession();
    const sugg = await placesAutocomplete(q, session, opts.near);
    if (sugg[0]) {
      const c = await placeDetails(sugg[0], session);
      if (Number.isFinite(c.latitude) && Number.isFinite(c.longitude)) {
        const r = accept(c.latitude, c.longitude, 'Google Maps', { commune: c.commune, region: c.region });
        if (r) return { result: r, rejected };
      }
    }
  } catch { /* fallback */ }

  try {
    const list = await resolveLocation(q, { defaultContext: opts.defaultContext, near: opts.near });
    if (list[0]) {
      const r = accept(list[0].latitude, list[0].longitude, 'mapa', { commune: list[0].commune, region: list[0].region });
      if (r) return { result: r, rejected };
    }
  } catch { /* sin resultado */ }

  return { result: null, rejected };
}

export async function autoGeocode(
  query: string,
  opts: Parameters<typeof autoGeocodeDetailed>[1],
): Promise<AutoGeocodeResult> {
  return (await autoGeocodeDetailed(query, opts)).result;
}
