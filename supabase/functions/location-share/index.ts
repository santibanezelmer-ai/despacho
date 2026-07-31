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

async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const key = Deno.env.get('GOOGLE_API_KEY');
  if (!key) return null;
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&language=es&key=${key}`,
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.results?.[0]?.formatted_address ?? null;
  } catch (_e) {
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

      let organizationName: string | null = null;
      const { data: org } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', data.organization_id)
        .maybeSingle();
      organizationName = org?.name ?? null;

      return json({ valid: true, organizationName, alreadyReceived: data.status === 'received' });
    }

    if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

    const body = await req.json().catch(() => null);
    const token = String(body?.token ?? '');
    const latitude = Number(body?.latitude);
    const longitude = Number(body?.longitude);

    if (!UUID_RE.test(token)) return json({ error: 'Token inválido' }, 400);
    if (
      !Number.isFinite(latitude) || !Number.isFinite(longitude) ||
      latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180
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

    const { data: request } = await supabase
      .from('location_requests')
      .select('id, organization_id, emergency_id, expires_at, resolved_address')
      .eq('token', token)
      .maybeSingle();

    if (!request) return json({ error: 'Enlace no válido' }, 404);
    if (new Date(request.expires_at).getTime() < Date.now()) {
      return json({ error: 'Enlace expirado' }, 410);
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

    let resolvedAddress = request.resolved_address as string | null;
    if (!resolvedAddress) {
      resolvedAddress = await reverseGeocode(latitude, longitude);
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

    if (request.emergency_id) {
      await supabase
        .from('emergencies')
        .update({ latitude, longitude })
        .eq('id', request.emergency_id);
    }

    return json({ ok: true, address: resolvedAddress });
  } catch (e) {
    console.error('location-share error', e);
    return json({ error: (e as Error).message ?? 'Error inesperado' }, 500);
  }
});
