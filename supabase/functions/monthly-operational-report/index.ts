import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';
import { authenticateCronRequest } from '../_shared/cron-auth.ts';
import { previousMonth, recipientAllowed } from '../_shared/monthly-report.ts';
import { loadReport } from '../_shared/report-data.ts';
import { reportHtml } from '../_shared/report-template.ts';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
const schema = z.object({ mode: z.enum(['send', 'dry-run', 'preview']).default('dry-run'), organization_id: z.string().uuid().optional(), period: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional(), logo_url: z.string().url().optional() }).strict();
Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const url = Deno.env.get('SUPABASE_URL'), service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'), anon = Deno.env.get('SUPABASE_ANON_KEY');
  if (!url || !service || !anon) return json({ error: 'Missing server configuration' }, 503);
  const db = createClient(url, service, { auth: { persistSession: false } });
  try {
    let body: unknown;
    try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
    const parsed = schema.safeParse(body);
    if (!parsed.success) return json({ error: 'Invalid report request' }, 400);
    const input = parsed.data;
    if (input.mode === 'preview') {
      const token = request.headers.get('Authorization')?.replace(/^Bearer /, '');
      if (!token) return json({ error: 'Unauthorized' }, 401);
      const client = createClient(url, anon);
      const { data, error } = await client.auth.getUser(token);
      if (error || !data.user) return json({ error: 'Unauthorized' }, 401);
      if (!input.organization_id) return json({ error: 'Organization required' }, 400);
      const { data: members, error: membershipError } = await db.from('organization_members').select('role,status').eq('organization_id', input.organization_id).eq('user_id', data.user.id).eq('status', 'active');
      if (membershipError) throw membershipError;
      if (!members?.some(recipientAllowed)) return json({ error: 'Acceso solo para administradores y oficiales activos' }, 403);
      const report = await loadReport(db, input.organization_id, input.period ?? previousMonth().period);
      return json({ report, html: reportHtml(report, input.logo_url, true), completeHtml: reportHtml(report, input.logo_url), sendingEnabled: false });
    }
    const auth = authenticateCronRequest(request);
    if (auth) return new Response(auth.body, { status: auth.status, headers: corsHeaders });
    if (input.mode === 'send') return json({ error: 'Envíos desactivados hasta autorización expresa', sendingEnabled: false }, 423);
    const period = input.period ?? previousMonth().period;
    const totals = { organizations: 0, eligibleRecipients: 0, sent: 0 };
    for (let offset = 0; ; offset += 100) {
      let query = db.from('organizations').select('id').eq('status', 'active').order('id').range(offset, offset + 99);
      if (input.organization_id) query = query.eq('id', input.organization_id);
      const { data: organizations, error } = await query;
      if (error) throw error;
      for (const org of organizations ?? []) {
        await loadReport(db, org.id, period);
        const { data: members, error: memberError } = await db.from('organization_members').select('user_id,role,status').eq('organization_id', org.id).eq('status', 'active').in('role', ['admin', 'oficial']);
        if (memberError) throw memberError;
        totals.organizations++;
        totals.eligibleRecipients += new Set((members ?? []).filter(recipientAllowed).map(m => m.user_id)).size;
      }
      if ((organizations?.length ?? 0) < 100) break;
    }
    return json({ mode: 'dry-run', period, totals, sendingEnabled: false });
  } catch (error) {
    console.error('Monthly report read failed', error instanceof Error ? error.message : 'unknown');
    return json({ error: 'No se pudo preparar el reporte; reintenta', sendingEnabled: false }, 500);
  }
});
