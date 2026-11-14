// Public volunteer self-activation with email OTP, attempt limits and consent.
// Responses are blind: they never reveal whether a RUT or email exists.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3.23.8';
import { sendTemplateEmail } from '../_shared/transactional-email-templates/send-email.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

const MAX_REQUESTS = 5;          // per IP or RUT per window
const WINDOW_MIN = 15;
const MAX_CODE_ATTEMPTS = 5;     // per challenge
const CODE_TTL_MIN = 10;

const RequestSchema = z.object({
  action: z.literal('request'),
  org: z.string().trim().min(1).max(100),
  rut: z.string().trim().max(15).optional().default(''),
  email: z.string().trim().email().max(255),
  consent: z.literal(true),
});
const VerifySchema = z.object({
  action: z.literal('verify'),
  challenge_id: z.string().uuid(),
  code: z.string().regex(/^\d{6}$/),
});

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

async function sha256(s: string) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(d)).map((b) => b.toString(16).padStart(2, '0')).join('');
}
const normRut = (r: string) => r.replace(/[^0-9kK]/g, '').toUpperCase();
const pepper = () => Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!.slice(-24);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  let body: any;
  try { body = await req.json(); } catch { return json({ status: 'invalid' }, 400); }

  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown';
  const ipHash = await sha256(`${pepper()}:${ip}`);
  const since = new Date(Date.now() - WINDOW_MIN * 60_000).toISOString();

  if (body?.action === 'request') {
    const p = RequestSchema.safeParse(body);
    if (!p.success) return json({ status: 'invalid' }, 400);
    const rut = normRut(p.data.rut);
    const email = p.data.email.toLowerCase();
    if (rut && (rut.length < 7 || rut.length > 10)) return json({ status: 'invalid' }, 400);
    // RUT optional: when omitted, the per-identity limit keys on the email.
    const rutHash = await sha256(`${pepper()}:${rut || 'email:' + email}`);

    const [{ count: ipCount }, { count: rutCount }] = await Promise.all([
      admin.from('volunteer_activation_challenges').select('id', { count: 'exact', head: true }).eq('ip_hash', ipHash).gte('created_at', since),
      admin.from('volunteer_activation_challenges').select('id', { count: 'exact', head: true }).eq('rut_norm', rutHash).gte('created_at', since),
    ]);
    if ((ipCount ?? 0) >= MAX_REQUESTS || (rutCount ?? 0) >= MAX_REQUESTS) {
      return json({ status: 'rate_limited', retry_minutes: WINDOW_MIN }, 429);
    }

    // Lookup (service role) — same normalization as claim_volunteer_activation.
    let orgId: string | null = null, volId: string | null = null, orgName = '';
    const orgCode = p.data.org.toLowerCase();
    let { data: org } = await admin.from('organizations').select('id,name').eq('slug', orgCode).eq('status', 'active').maybeSingle();
    if (!org) {
      // Previous codes keep working after a rename (links already shared).
      ({ data: org } = await admin.from('organizations').select('id,name').contains('legacy_slugs', [orgCode]).eq('status', 'active').maybeSingle());
    }
    if (org) {
      orgId = org.id; orgName = org.name ?? '';
      const { data: vols } = await admin.from('volunteers').select('id,rut,email,user_id,status').eq('organization_id', org.id).ilike('email', email);
      const matches = (vols ?? []).filter((x: any) => (x.email ?? '').trim().toLowerCase() === email && (!rut || !normRut(x.rut ?? '') || normRut(x.rut ?? '') === rut));
      // Email alone must identify exactly one volunteer; duplicates never match.
      const v = matches.length === 1 ? matches[0] : null;
      if (v && !v.user_id && v.status !== 'inactivo') volId = v.id;
    }

    const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000).padStart(6, '0');
    const { data: ch, error } = await admin.from('volunteer_activation_challenges').insert({
      organization_id: orgId, volunteer_id: volId, org_slug: p.data.org.toLowerCase(),
      rut_norm: rutHash, email_norm: await sha256(`${pepper()}:${email}`),
      code_hash: volId ? await sha256(`${pepper()}:${code}`) : null,
      ip_hash: ipHash, matched: !!volId, consent_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + CODE_TTL_MIN * 60_000).toISOString(),
    }).select('id').single();
    if (error) return json({ status: 'error' }, 500);

    if (volId) {
      try {
        await sendTemplateEmail('volunteer-activation-code', email, {
          templateData: { code, organizationName: orgName },
          idempotencyKey: `vol-activation-${ch.id}`,
        });
      } catch (e) { console.error('send failed', e); }
    }
    // Blind response: same shape whether or not data matched.
    return json({ status: 'sent', challenge_id: ch.id });
  }

  if (body?.action === 'verify') {
    const p = VerifySchema.safeParse(body);
    if (!p.success) return json({ status: 'invalid_code' }, 400);
    const { data: ch } = await admin.from('volunteer_activation_challenges').select('*').eq('id', p.data.challenge_id).maybeSingle();
    if (!ch || ch.consumed_at || new Date(ch.expires_at) < new Date() || ch.attempts >= MAX_CODE_ATTEMPTS) {
      return json({ status: 'expired' }, 400);
    }
    await admin.from('volunteer_activation_challenges').update({ attempts: ch.attempts + 1 }).eq('id', ch.id);
    const ok = ch.matched && ch.code_hash === (await sha256(`${pepper()}:${p.data.code}`));
    if (!ok) return json({ status: 'invalid_code', remaining: Math.max(0, MAX_CODE_ATTEMPTS - ch.attempts - 1) }, 400);

    const { data: res, error } = await admin.rpc('claim_volunteer_activation_by_id', { _volunteer_id: ch.volunteer_id });
    if (error) return json({ status: 'error' }, 500);
    await admin.from('volunteer_activation_challenges').update({ consumed_at: new Date().toISOString() }).eq('id', ch.id);
    return json(res);
  }

  return json({ status: 'invalid' }, 400);
});
