// Operix Móvil — API de dispositivos instalados en móviles de emergencia.
// Esta función NO es la aplicación móvil: es la infraestructura que la futura
// aplicación "Operix Móvil" consumirá. Los dispositivos NO usan cuenta de
// usuario: se activan con un código temporal de un solo uso y luego se
// autentican con un token propio (header `x-device-token`).
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const headers = { ...corsHeaders, 'Content-Type': 'application/json' };
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers });

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const VEHICLE_STATUSES = ['disponible', 'en_servicio', 'mantencion', 'fuera_servicio'] as const;

async function sha256(value: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function newDeviceToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(36));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const num = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null;

/** Resuelve el dispositivo a partir del header `x-device-token`. */
async function authDevice(req: Request) {
  const token = req.headers.get('x-device-token') ?? '';
  if (token.length < 20) return null;
  const { data } = await supabase
    .from('vehicle_devices')
    .select('id, organization_id, vehicle_id, name, status')
    .eq('token_hash', await sha256(token))
    .maybeSingle();
  if (!data || data.status !== 'active') return null;
  return data;
}

/** Emergencia activa a la que está asignado el móvil (lógica existente). */
async function activeEmergencyForVehicle(orgId: string, vehicleId: string) {
  const { data: links } = await supabase
    .from('emergency_vehicles')
    .select('emergency_id, assigned_at, released_at')
    .eq('organization_id', orgId)
    .eq('vehicle_id', vehicleId)
    .is('released_at', null)
    .order('assigned_at', { ascending: false })
    .limit(5);

  for (const link of links ?? []) {
    const { data: emg } = await supabase
      .from('emergencies')
      .select('id, folio, status, address, reference, observations, latitude, longitude, created_at, emergency_keys(code, name, color)')
      .eq('id', link.emergency_id)
      .neq('status', 'finalizada')
      .maybeSingle();
    if (emg) return emg;
  }
  return null;
}

async function vehiclesOfOrg(orgId: string) {
  const { data } = await supabase
    .from('vehicles')
    .select('id, code, type, status, companies(name)')
    .eq('organization_id', orgId)
    .order('code');
  return data ?? [];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const action = new URL(req.url).pathname.split('/').filter(Boolean).pop() ?? '';
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};

    // ---------- 1. Activación del dispositivo ----------
    if (action === 'activate') {
      const code = String(body?.code ?? '').trim().toUpperCase();
      if (code.length < 6) return json({ error: 'Código no válido' }, 400);

      const { data: codeRow } = await supabase
        .from('vehicle_device_codes')
        .select('id, organization_id, label, expires_at, used_at')
        .eq('code', code)
        .maybeSingle();

      if (!codeRow) return json({ error: 'Código no válido' }, 404);
      if (codeRow.used_at) return json({ error: 'El código ya fue utilizado' }, 410);
      if (new Date(codeRow.expires_at).getTime() < Date.now()) {
        return json({ error: 'El código ha expirado' }, 410);
      }

      const token = newDeviceToken();
      const { data: device, error } = await supabase
        .from('vehicle_devices')
        .insert({
          organization_id: codeRow.organization_id,
          name: String(body?.device_name ?? codeRow.label ?? 'Dispositivo móvil').slice(0, 80),
          platform: String(body?.platform ?? 'unknown').slice(0, 40),
          token_hash: await sha256(token),
        })
        .select('id, organization_id, name')
        .single();
      if (error) return json({ error: error.message }, 400);

      // Consumo de un solo uso.
      await supabase
        .from('vehicle_device_codes')
        .update({ used_at: new Date().toISOString(), used_by_device_id: device.id })
        .eq('id', codeRow.id)
        .is('used_at', null);

      const { data: org } = await supabase
        .from('organizations')
        .select('id, name, time_format')
        .eq('id', device.organization_id)
        .maybeSingle();

      return json({
        device_id: device.id,
        device_token: token,
        device_name: device.name,
        organization: org,
        vehicles: await vehiclesOfOrg(device.organization_id),
      });
    }

    // ---------- Rutas autenticadas por dispositivo ----------
    const device = await authDevice(req);
    if (!device) return json({ error: 'Dispositivo no autorizado' }, 401);

    if (action === 'vehicles') {
      return json({ vehicles: await vehiclesOfOrg(device.organization_id) });
    }

    // ---------- 2. Asociación dispositivo → móvil ----------
    if (action === 'select-vehicle') {
      const vehicleId = String(body?.vehicle_id ?? '');
      const { data: vehicle } = await supabase
        .from('vehicles')
        .select('id, code, status')
        .eq('id', vehicleId)
        .eq('organization_id', device.organization_id)
        .maybeSingle();
      if (!vehicle) return json({ error: 'Móvil no encontrado en esta organización' }, 404);

      await supabase
        .from('vehicle_devices')
        .update({
          vehicle_id: vehicle.id,
          vehicle_changed_at: new Date().toISOString(),
          last_seen_at: new Date().toISOString(),
        })
        .eq('id', device.id);

      return json({ ok: true, vehicle });
    }

    if (action === 'session') {
      const vehicle = device.vehicle_id
        ? (await supabase
            .from('vehicles')
            .select('id, code, type, status, companies(name)')
            .eq('id', device.vehicle_id)
            .maybeSingle()).data
        : null;
      const last = device.vehicle_id
        ? (await supabase
            .from('vehicle_last_positions')
            .select('latitude, longitude, accuracy, speed, heading, captured_at, updated_at')
            .eq('vehicle_id', device.vehicle_id)
            .maybeSingle()).data
        : null;

      await supabase
        .from('vehicle_devices')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('id', device.id);

      return json({
        device: { id: device.id, name: device.name, organization_id: device.organization_id },
        vehicle,
        last_position: last,
        emergency: vehicle ? await activeEmergencyForVehicle(device.organization_id, vehicle.id) : null,
      });
    }

    // ---------- 3. Ubicación GPS (individual o por lotes) ----------
    if (action === 'position') {
      if (!device.vehicle_id) return json({ error: 'El dispositivo no tiene un móvil asociado' }, 409);

      const incoming = Array.isArray(body?.positions) ? body.positions : [body];
      const emergency = await activeEmergencyForVehicle(device.organization_id, device.vehicle_id);

      const rows = incoming
        .map((p: any) => {
          const lat = num(p?.latitude);
          const lng = num(p?.longitude);
          if (lat === null || lng === null || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
          const ts = p?.timestamp ?? p?.captured_at;
          const captured = ts ? new Date(ts) : new Date();
          return {
            organization_id: device.organization_id,
            device_id: device.id,
            vehicle_id: device.vehicle_id,
            emergency_id: emergency?.id ?? null,
            latitude: lat,
            longitude: lng,
            accuracy: num(p?.accuracy),
            speed: num(p?.speed),
            heading: num(p?.heading),
            captured_at: Number.isNaN(captured.getTime())
              ? new Date().toISOString()
              : captured.toISOString(),
          };
        })
        .filter(Boolean);

      if (!rows.length) return json({ error: 'Coordenadas no válidas' }, 400);

      const { error } = await supabase.from('vehicle_positions').insert(rows as any[]);
      if (error) return json({ error: error.message }, 400);

      await supabase
        .from('vehicle_devices')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('id', device.id);

      return json({ ok: true, accepted: rows.length, emergency_id: emergency?.id ?? null });
    }

    // ---------- 4. Estado operacional (estados existentes) ----------
    if (action === 'vehicle-status') {
      if (!device.vehicle_id) return json({ error: 'El dispositivo no tiene un móvil asociado' }, 409);
      const status = String(body?.status ?? '');
      if (!VEHICLE_STATUSES.includes(status as any)) {
        return json({ error: 'Estado no válido', allowed: VEHICLE_STATUSES }, 400);
      }
      const { error } = await supabase
        .from('vehicles')
        .update({ status })
        .eq('id', device.vehicle_id)
        .eq('organization_id', device.organization_id);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true, status });
    }

    return json({ error: 'Acción no soportada' }, 404);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
