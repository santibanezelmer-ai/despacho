import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3.23.8';

const URL_ = Deno.env.get('SUPABASE_URL')!;
const admin = createClient(URL_, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const anon = createClient(URL_, Deno.env.get('SUPABASE_ANON_KEY')!, { auth: { persistSession: false } });
const Body = z.object({ email: z.string().email().max(255), redirect_to: z.string().url().max(500) });
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

function device(ua: string) {
  const b = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Navegador';
  const o = /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Windows/.test(ua) ? 'Windows' : /Mac OS/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : 'sistema desconocido';
  return `${b} en ${o}`;
}
const maskIp = (ip: string) => ip.includes(':') ? ip.split(':').slice(0, 3).join(':') + ':x' : ip.split('.').slice(0, 2).join('.') + '.x.x';
async function geo(ip: string) {
  if (!ip || ip === 'unknown') return null;
  try {
    const r = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}?fields=success,city,region,country,connection`, { signal: AbortSignal.timeout(2500) });
    const d = await r.json();
    return d.success ? { city: d.city ?? '', region: d.region ?? '', country: d.country ?? '', isp: d.connection?.isp ?? d.connection?.org ?? '' } : null;
  } catch { return null; }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  let raw: unknown; try { raw = await req.json(); } catch { return json({ error: 'invalid' }, 400); }
  const p = Body.safeParse(raw);
  if (!p.success) return json({ error: 'Datos inválidos' }, 400);
  const email = p.data.email.toLowerCase().trim();
  const ok = json({ ok: true }); // blind: never reveals whether the account exists

  const since = new Date(Date.now() - 15 * 60_000).toISOString();
  const { count } = await admin.from('password_reset_context').select('id', { count: 'exact', head: true }).eq('email', email).gte('created_at', since);
  if ((count ?? 0) >= 3) return ok;

  const ip = (req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
  const ua = req.headers.get('user-agent') ?? '';
  const g = await geo(ip);
  const location = g ? [g.city, g.region, g.country].filter(Boolean).join(', ') : 'Ubicación no disponible';
  const when = new Intl.DateTimeFormat('es-CL', { timeZone: 'America/Santiago', dateStyle: 'short', timeStyle: 'short' }).format(new Date()) + ' hrs (Chile)';
  const dev = device(ua);

  await admin.from('password_reset_context').insert({ email, location, network: g?.isp ?? null, device: dev, ip_masked: maskIp(ip), requested_at_label: when });

  const { data: prof } = await admin.from('profiles').select('user_id').eq('email', email).maybeSingle();
  if (prof) {
    const { data: mems } = await admin.from('organization_members').select('organization_id').eq('user_id', prof.user_id).eq('status', 'active');
    for (const m of mems ?? []) {
      await admin.from('audit_log').insert({
        organization_id: m.organization_id, user_id: prof.user_id, action: 'PASSWORD_RESET_REQUEST', table_name: 'auth', record_id: prof.user_id,
        new_data: { ip, city: g?.city ?? null, region: g?.region ?? null, country: g?.country ?? null, isp: g?.isp ?? null, device: dev, user_agent: ua.slice(0, 300) },
      });
    }
  }

  const { error } = await anon.auth.resetPasswordForEmail(email, { redirectTo: p.data.redirect_to });
  if (error) console.error('reset', error.message);
  return ok;
});
