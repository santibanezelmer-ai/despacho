import { matchLocalLandmarks, type LocalLandmark } from '@/lib/localLandmarks';
import { parseRouteKmQuery, resolveRouteKm, parseRouteCrossingQuery, resolveRouteCrossing } from '@/lib/routeKilometer';
import { resolveLocation } from '@/lib/locationResolver';
import { placesAutocomplete, placeDetails, newPlacesSession } from '@/lib/googlePlaces';

export type AutoGeocodeResult = { latitude: number; longitude: number; source: string } | null;

/**
 * Elige automáticamente la mejor ubicación para una dirección escrita, sin mostrar opciones.
 * Orden: punto local → cruce de rutas → ruta+km (MOP) → Google → Nominatim.
 */
export async function autoGeocode(
  query: string,
  opts: { landmarks: LocalLandmark[]; near: { lat: number; lng: number } | null; defaultContext: string | null },
): Promise<AutoGeocodeResult> {
  const q = query.trim();
  if (q.length < 3) return null;

  const local = matchLocalLandmarks(q, opts.landmarks, 1)[0];
  if (local) return { latitude: local.latitude, longitude: local.longitude, source: 'punto local' };

  try {
    const cq = parseRouteCrossingQuery(q);
    if (cq) {
      const cr = await resolveRouteCrossing(cq);
      if (cr.status === 'found') return { latitude: cr.latitude, longitude: cr.longitude, source: 'cruce de rutas' };
    }
    const rk = parseRouteKmQuery(q);
    if (rk) {
      const r = await resolveRouteKm(rk);
      if (r.status === 'found') return { latitude: r.latitude, longitude: r.longitude, source: 'ruta y kilómetro' };
    }
  } catch { /* continúa con otras fuentes */ }

  try {
    const session = newPlacesSession();
    const sugg = await placesAutocomplete(q, session, opts.near);
    if (sugg[0]) {
      const c = await placeDetails(sugg[0], session);
      if (Number.isFinite(c.latitude) && Number.isFinite(c.longitude)) {
        return { latitude: c.latitude, longitude: c.longitude, source: 'Google Maps' };
      }
    }
  } catch { /* fallback */ }

  try {
    const list = await resolveLocation(q, { defaultContext: opts.defaultContext, near: opts.near });
    if (list[0]) return { latitude: list[0].latitude, longitude: list[0].longitude, source: 'mapa' };
  } catch { /* sin resultado */ }

  return null;
}
