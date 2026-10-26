// Guardias por Compañía — push delivery for guard assignment requests.
// Drains public.guard_notification_outbox (filled by DB triggers) for ONE
// organization the caller belongs to. Separate Android channel / iOS sound
// from emergency alerts. Dedup: outbox UNIQUE(event_key,recipient) + atomic
// claim (pending→sending) + per-token dedupe. Dead tokens are removed.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.100.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_ATTEMPTS = 5;
const GUARD_CHANNEL = 'guard_requests';

function b64url(buf: Uint8Array | ArrayBuffer) {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = ''; for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
async function accessToken(sa: { client_email: string; private_key: string; token_uri: string }) {
  const now = Math.floor(Date.now() / 1000);
  const enc = new TextEncoder();
  const unsigned = `${b64url(enc.encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' })))}.${b64url(enc.encode(JSON.stringify({
    iss: sa.client_email, scope: 'https://www.googleapis.com/auth/firebase.messaging', aud: sa.token_uri, iat: now, exp: now + 3600,
  })))}`;
  const der = Uint8Array.from(atob(sa.private_key.replace(/-----(BEGIN|END) PRIVATE KEY-----/g, '').replace(/\\n/g, '').replace(/\s/g, '')), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, enc.encode(unsigned));
  const res = await fetch(sa.token_uri, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${unsigned}.${b64url(sig)}`,
  });
  const d = await res.json();
  if (!d.access_token) throw new Error(`OAuth2 ${res.status}`);
  return d.access_token as string;
}
function isDead(r: any) {
  const code = r?.error?.details?.find?.((d: any) => d?.errorCode)?.errorCode;
  return r?.error?.status === 'NOT_FOUND' || code === 'UNREGISTERED' || code === 'SENDER_ID_MISMATCH' ||
    (r?.error?.status === 'INVALID_ARGUMENT' && /registration token/i.test(r?.error?.message ?? ''));
}
function fmt(iso: string, opts: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('es-CL', { timeZone: 'America/Santiago', ...opts }).format(new Date(iso));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const auth = req.headers.get('Authorization');
    if (!auth?.startsWith('Bearer ')) return json({ error: 'unauthorized' }, 401);
    const url = Deno.env.get('SUPABASE_URL')!;
    const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
    const { data: u } = await userClient.auth.getUser(auth.slice(7));
    if (!u?.user) return json({ error: 'unauthorized' }, 401);

    const body = await req.json().catch(() => ({}));
    const org = body?.organization_id;
    if (typeof org !== 'string' || !UUID.test(org)) return json({ error: 'organization_id required' }, 400);

    const { data: member } = await userClient.from('organization_members').select('organization_id')
      .eq('user_id', u.user.id).eq('organization_id', org).eq('status', 'active').maybeSingle();
    if (!member) return json({ error: 'forbidden' }, 403);

    const svc = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const nowIso = new Date().toISOString();
    const { data: due } = await svc.from('guard_notification_outbox')
      .select('id').eq('organization_id', org).in('status', ['pending', 'failed'])
      .lt('attempts', MAX_ATTEMPTS).lte('next_attempt_at', nowIso).like('event_key', 'guard_assignment:%').limit(50);
    if (!due?.length) return json({ processed: 0 });

    // Atomic claim: only rows still pending/failed move to sending → no double send across concurrent calls.
    const { data: claimed } = await svc.from('guard_notification_outbox')
      .update({ status: 'sending' }).in('id', due.map((d) => d.id)).in('status', ['pending', 'failed'])
      .select('id, company_id, recipient_id, payload, attempts');
    if (!claimed?.length) return json({ processed: 0 });

    const saJson = Deno.env.get('FCM_SERVICE_ACCOUNT_JSON');
    let token: string | null = null; let projectId = '';
    if (saJson) { const sa = JSON.parse(saJson); projectId = sa.project_id; token = await accessToken(sa); }

    let sent = 0;
    for (const row of claimed) {
      const p = row.payload as Record<string, string>;
      // Still pending? (volunteer may have answered or shift cancelled meanwhile)
      const { data: a } = await svc.from('guard_assignments').select('status').eq('id', p.assignment_id).eq('organization_id', org).maybeSingle();
      if (!a || a.status !== 'propuesto') { await svc.from('guard_notification_outbox').update({ status: 'sent' }).eq('id', row.id); continue; }

      const { data: devices } = await svc.from('device_tokens').select('id, token, platform')
        .eq('organization_id', org).eq('user_id', row.recipient_id);
      const unique = [...new Map((devices ?? []).filter((d) => d.platform !== 'web').map((d) => [d.token, d])).values()];
      if (!token || unique.length === 0) {
        await svc.from('guard_notification_outbox').update({ status: token ? 'sent' : 'failed', attempts: row.attempts + 1,
          next_attempt_at: new Date(Date.now() + 10 * 60_000).toISOString() }).eq('id', row.id);
        continue;
      }

      const title = `Solicitud de guardia · ${p.company_name}`;
      const msg = `${fmt(p.starts_at, { weekday: 'short', day: '2-digit', month: 'short' })} · ${fmt(p.starts_at, { hour: '2-digit', minute: '2-digit' })}–${fmt(p.ends_at, { hour: '2-digit', minute: '2-digit' })}. Responda confirmando o rechazando.`;
      const path = `/voluntario/guardias?asignacion=${p.assignment_id}`;
      const dead: string[] = []; let ok = 0; let retry = false;

      for (const d of unique) {
        const message: any = {
          token: d.token,
          notification: { title, body: msg },
          data: { type: 'guard_assignment', assignment_id: String(p.assignment_id), organization_id: org, path, title, body: msg },
        };
        if (d.platform === 'ios') {
          message.apns = { headers: { 'apns-priority': '10', 'apns-push-type': 'alert', 'apns-collapse-id': `guard-${p.assignment_id}`.slice(0, 63) },
            payload: { aps: { alert: { title, body: msg }, sound: 'default', 'thread-id': 'guard_requests' } } };
        } else {
          message.android = { priority: 'HIGH', collapse_key: `guard-${p.assignment_id}`,
            notification: { channel_id: GUARD_CHANNEL, tag: `guard-${p.assignment_id}`, icon: 'ic_notification', default_sound: true } };
        }
        const res = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ message }),
        });
        const r = await res.json().catch(() => ({}));
        if (res.ok) ok++; else if (isDead(r)) dead.push(d.id); else if (res.status === 429 || res.status >= 500) retry = true;
        else console.error('[guard-push] FCM', res.status, JSON.stringify(r).slice(0, 300));
      }
      if (dead.length) await svc.from('device_tokens').delete().in('id', dead);
      const done = ok > 0 || !retry;
      await svc.from('guard_notification_outbox').update({
        status: done ? 'sent' : 'failed', attempts: row.attempts + 1,
        next_attempt_at: new Date(Date.now() + 2 ** (row.attempts + 1) * 60_000).toISOString(),
      }).eq('id', row.id);
      if (ok) sent++;
    }
    return json({ processed: claimed.length, sent });
  } catch (e) {
    console.error('[guard-push]', (e as Error).message);
    return json({ error: 'guard push failed' }, 500);
  }
});
