import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Metros entre dos coordenadas (Haversine simplificado). */
function distanceMeters(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371000;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const lat1 = (aLat * Math.PI) / 180;
  const lat2 = (bLat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const key = Deno.env.get('GOOGLE_API_KEY');
  if (!key) return null;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&language=es&key=${key}`,
      { signal: ctrl.signal },
    );
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    return data?.results?.[0]?.formatted_address ?? null;
  } catch (_e) {
    // La geocodificación es opcional: nunca debe romper el guardado del GPS.
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (req.method === 'GET') {
      const token = new URL(req.url).searchParams.get('token') ?? '';
      if (!UUID_RE.test(token)) return json({ valid: false, reason: 'invalid' }, 200);

      const { data } = await supabase
        .from('location_requests')
        .select('id, expires_at, status, organization_id')
        .eq('token', token)
        .maybeSingle();

      if (!data) return json({ valid: false, reason: 'invalid' });
      if (new Date(data.expires_at).getTime() < Date.now()) {
        return json({ valid: false, reason: 'expired' });
      }

      const { data: org } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', data.organization_id)
        .maybeSingle();

      return json({
        valid: true,
        organizationName: org?.name ?? null,
        alreadyReceived: data.status === 'received',
        expiresAt: data.expires_at,
      });
    }

    if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

    const body = await req.json().catch(() => null);
    const token = String(body?.token ?? '');
    const latitude = Number(body?.latitude);
    const longitude = Number(body?.longitude);

    if (!UUID_RE.test(token)) return json({ error: 'Token inválido' }, 400);
    if (
      !Number.isFinite(latitude) || !Number.isFinite(longitude) ||
      latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180 ||
      (latitude === 0 && longitude === 0)
    ) {
      return json({ error: 'Coordenadas inválidas' }, 400);
    }

    const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : null);
    const accuracy = num(body?.accuracy);
    const speed = num(body?.speed);
    const heading = num(body?.heading);
    const battery = num(body?.battery_level);
    const capturedAt = (() => {
      const t = body?.timestamp;
      const d = typeof t === 'number' ? new Date(t) : new Date(String(t ?? ''));
      return isNaN(d.getTime()) ? new Date() : d;
    })();

    // El token solo puede resolver SU propia solicitud (y su emergencia asociada).
    const { data: request } = await supabase
      .from('location_requests')
      .select('id, organization_id, emergency_id, expires_at, resolved_address, latitude, longitude, accuracy')
      .eq('token', token)
      .maybeSingle();

    if (!request) return json({ error: 'Enlace no válido' }, 404);
    if (new Date(request.expires_at).getTime() < Date.now()) {
      return json({ error: 'Enlace expirado' }, 410);
    }

    // Deduplicación: ignora reenvíos idénticos (reintentos offline o doble watcher).
    const { data: lastPing } = await supabase
      .from('location_pings')
      .select('latitude, longitude, captured_at')
      .eq('request_id', request.id)
      .order('captured_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const isDuplicate =
      !!lastPing &&
      Math.abs(lastPing.latitude - latitude) < 1e-6 &&
      Math.abs(lastPing.longitude - longitude) < 1e-6 &&
      new Date(lastPing.captured_at).getTime() === capturedAt.getTime();

    if (isDuplicate) {
      return json({ ok: true, duplicate: true, address: request.resolved_address ?? null });
    }

    const { error: pingErr } = await supabase.from('location_pings').insert({
      request_id: request.id,
      organization_id: request.organization_id,
      emergency_id: request.emergency_id,
      latitude,
      longitude,
      accuracy,
      speed,
      heading,
      battery_level: battery,
      captured_at: capturedAt.toISOString(),
    });
    if (pingErr) {
      console.error('ping insert failed', pingErr);
      return json({ error: 'No se pudo guardar la ubicación' }, 500);
    }

    // Geocodifica solo la primera vez o si se desplazó más de 150 m.
    let resolvedAddress = request.resolved_address as string | null;
    const movedFar =
      request.latitude == null || request.longitude == null
        ? true
        : distanceMeters(request.latitude, request.longitude, latitude, longitude) > 150;
    if (!resolvedAddress || movedFar) {
      resolvedAddress = (await reverseGeocode(latitude, longitude)) ?? resolvedAddress;
    }

    await supabase
      .from('location_requests')
      .update({
        latitude,
        longitude,
        accuracy,
        status: 'received',
        last_ping_at: capturedAt.toISOString(),
        resolved_address: resolvedAddress,
      })
      .eq('id', request.id);

    // No sobrescribe una ubicación precisa con una lectura muy imprecisa.
    if (request.emergency_id) {
      const previousAccuracy = num(request.accuracy);
      const worseThanExisting =
        request.latitude != null &&
        previousAccuracy != null &&
        accuracy != null &&
        accuracy > previousAccuracy * 3 &&
        accuracy > 500;

      if (!worseThanExisting) {
        await supabase
          .from('emergencies')
          .update({ latitude, longitude })
          .eq('id', request.emergency_id);
      }
    }

    return json({ ok: true, address: resolvedAddress, accuracy });
  } catch (e) {
    console.error('location-share error', e);
    return json({ error: (e as Error).message ?? 'Error inesperado' }, 500);
  }
});
