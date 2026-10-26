// Pantallas remotas (Smart TV / monitores) sin inicio de sesión.
// La pantalla obtiene un PIN y un secreto propio; un operador con sesión la vincula
// a su organización. Luego la pantalla solo puede LEER datos operativos de esa org.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const VIEWS = ['central', 'mapa', 'emergencias'];

async function sha256(v: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(v));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}
const randomPin = () => String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, '0');
const randomSecret = () => Array.from(crypto.getRandomValues(new Uint8Array(32))).map((b) => b.toString(16).padStart(2, '0')).join('');

async function screenBySecret(secret: unknown) {
  if (typeof secret !== 'string' || secret.length < 32) return null;
  const { data } = await admin.from('screen_pairings').select('*').eq('secret_hash', await sha256(secret)).maybeSingle();
  return data;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const action = body?.action;

    if (action === 'create') {
      // Limpia PIN vencidos sin vincular
      await admin.from('screen_pairings').delete().is('organization_id', null).lt('pin_expires_at', new Date().toISOString());
      for (let i = 0; i < 5; i++) {
        const pin = randomPin();
        const secret = randomSecret();
        const { error } = await admin.from('screen_pairings').insert({ pin, secret_hash: await sha256(secret) });
        if (!error) return json({ pin, secret, expiresInMinutes: 15 });
      }
      return json({ error: 'No se pudo generar el código' }, 500);
    }

    if (action === 'pair') {
      const auth = req.headers.get('Authorization') ?? '';
      const jwt = auth.replace(/^Bearer\s+/i, '').trim();
      if (!jwt) return json({ error: 'Sesión requerida' }, 401);
      const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      // Verifica la firma del token (igual que las políticas de la base de datos),
      // sin depender de que la sesión siga registrada en el servidor.
      const { data: claims, error: claimsErr } = await userClient.auth.getClaims(jwt);
      const userId = claims?.claims?.sub as string | undefined;
      if (claimsErr || !userId) {
        console.warn('pair: token inválido', claimsErr?.message);
        return json({ error: 'Sesión requerida' }, 401);
      }
      const u = { user: { id: userId } };
      const pin = String(body.pin ?? '').replace(/\D/g, '');
      const orgId = String(body.organizationId ?? '');
      const view = VIEWS.includes(body.view) ? body.view : 'central';
      const name = String(body.name ?? '').slice(0, 60) || 'Pantalla';
      const [{ data: m }, { data: sa }] = await Promise.all([
        admin.from('organization_members').select('role')
          .eq('user_id', u.user.id).eq('organization_id', orgId).eq('status', 'active').maybeSingle(),
        admin.from('superadmins').select('id').eq('user_id', u.user.id).maybeSingle(),
      ]);
      if (!sa && (!m || m.role === 'voluntario')) return json({ error: 'Sin permiso en esta organización' }, 403);
      const { data: row } = await admin.from('screen_pairings').select('id, pin_expires_at')
        .eq('pin', pin).is('organization_id', null).maybeSingle();
      if (!row || new Date(row.pin_expires_at).getTime() < Date.now()) return json({ error: 'Código inválido o vencido' }, 404);
      await admin.from('screen_pairings').update({
        organization_id: orgId, view, name, paired_by: u.user.id, paired_at: new Date().toISOString(),
      }).eq('id', row.id);
      return json({ ok: true, id: row.id });
    }

    const screen = await screenBySecret(body?.secret);
    if (!screen) return json({ status: 'invalid' });
    if (screen.revoked_at) return json({ status: 'revoked' });
    if (!screen.organization_id) {
      if (new Date(screen.pin_expires_at).getTime() < Date.now()) return json({ status: 'expired' });
      return json({ status: 'pending', pin: screen.pin });
    }
    const orgId = screen.organization_id;
    await admin.from('screen_pairings').update({ last_seen_at: new Date().toISOString() }).eq('id', screen.id);
    const { data: org } = await admin.from('organizations').select('name, latitude, longitude, time_format').eq('id', orgId).maybeSingle();
    const base = { status: 'paired', view: screen.view, name: screen.name, organization: org };
    if (action === 'status') return json(base);

    if (action === 'data') {
      const { data: ems } = await admin.from('emergencies')
        .select('id, folio, address, status, latitude, longitude, created_at, dispatched_at, emergency_keys(code, name, color)')
        .eq('organization_id', orgId).not('status', 'in', '("en_cuartel","finalizada")')
        .order('created_at', { ascending: false }).limit(50);
      const ids = (ems ?? []).map((e) => e.id);
      const [{ data: ev }, { data: vehicles }, { data: vols }, { data: positions }] = await Promise.all([
        ids.length
          ? admin.from('emergency_vehicles').select('emergency_id, vehicle_id, operational_status, vehicles(code)').in('emergency_id', ids).is('released_at', null)
          : Promise.resolve({ data: [] as any[] }),
        admin.from('vehicles').select('id, code, type, status, companies(name)').eq('organization_id', orgId).order('code'),
        admin.from('volunteers').select('id, name, available, status, ranks(name, is_authority), companies(name)').eq('organization_id', orgId).eq('status', 'activo'),
        admin.from('vehicle_last_positions').select('vehicle_id, latitude, longitude, heading, speed, captured_at, emergency_id').eq('organization_id', orgId),
      ]);
      return json({
        ...base,
        emergencies: ems ?? [],
        emergencyVehicles: ev ?? [],
        vehicles: vehicles ?? [],
        // Solo nombre/cargo de autoridades: sin teléfonos, RUT ni correos.
        authorities: (vols ?? []).filter((v: any) => v.ranks?.is_authority).map((v: any) => ({
          id: v.id, name: v.name, rank: v.ranks?.name ?? null, company: v.companies?.name ?? null, available: v.available,
        })),
        positions: positions ?? [],
        serverTime: new Date().toISOString(),
      });
    }
    return json({ error: 'Acción no válida' }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
