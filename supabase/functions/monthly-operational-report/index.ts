import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';
import { authenticateCronRequest } from '../_shared/cron-auth.ts';
import { monthlyDue, previousMonth, recipientAllowed, REPORT_DOMAIN, reportHtml, summarize, type ReportEmergency } from '../_shared/monthly-report.ts';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
const schema = z.object({ mode: z.enum(['send', 'dry-run']).default('send') }).strict();
const GATEWAY = 'https://connector-gateway.lovable.dev/resend';

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const auth = authenticateCronRequest(request);
  if (auth) return new Response(auth.body, { status: auth.status, headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  let body: unknown;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return json({ error: 'Invalid mode' }, 400);
  const dry = parsed.data.mode === 'dry-run';
  const now = new Date();
  if (!dry && !monthlyDue(now)) return json({ skipped: 'outside_monthly_window' });
  const url = Deno.env.get('SUPABASE_URL'), service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const api = Deno.env.get('LOVABLE_API_KEY'), connection = Deno.env.get('RESEND_API_KEY');
  if (!url || !service || !api || !connection) return json({ error: 'Missing server configuration' }, 503);
  const db = createClient(url, service, { auth: { persistSession: false } });
  const gatewayHeaders = { Authorization: `Bearer ${api}`, 'X-Connection-Api-Key': connection, 'Content-Type': 'application/json' };
  const { period, start, end } = previousMonth(now);
  const previous = previousMonth(new Date(start));
  const totals = { organizations: 0, eligibleRecipients: 0, sent: 0, alreadySent: 0, failed: 0 };
  try {
    const domainResponse = await fetch(`${GATEWAY}/domains`, { headers: gatewayHeaders });
    if (!domainResponse.ok) return json({ error: 'Resend domain check failed', status: domainResponse.status, details: await domainResponse.text() }, 502);
    const domains = await domainResponse.json();
    const verified = domains.data?.some((domain: { name: string; status: string }) => domain.name === REPORT_DOMAIN && domain.status === 'verified');
    if (!verified && !dry) return json({ error: 'Report sender domain not verified' }, 409);

    async function all<T>(table: string, select: string, org: string, from?: string, to?: string): Promise<T[]> {
      const rows: T[] = [];
      for (let offset = 0; ; offset += 500) {
        let query = db.from(table).select(select).eq('organization_id', org).order('id').range(offset, offset + 499);
        if (from && to) query = query.gte('dispatched_at', from).lt('dispatched_at', to);
        const { data, error } = await query;
        if (error) throw error;
        rows.push(...(data as T[]));
        if (data.length < 500) return rows;
      }
    }
    for (let offset = 0; ; offset += 100) {
      const { data: organizations, error } = await db.from('organizations').select('id,name').eq('status', 'active').order('id').range(offset, offset + 99);
      if (error) throw error;
      for (const org of organizations) {
        const members = await all<{ user_id: string; role: string; status: string }>('organization_members', 'id,user_id,role,status', org.id);
        const recipients = [...new Set(members.filter(recipientAllowed).map(m => m.user_id))];
        if (!recipients.length) continue;
        totals.organizations++;
        const select = 'id,dispatched_at,finished_at,status,emergency_key_id,emergency_vehicles(vehicle_id,on_scene_at,odometer_start,odometer_end)';
        const emergencies = await all<ReportEmergency>('emergencies', select, org.id, start, end);
        const prior = await all<ReportEmergency>('emergencies', select, org.id, previous.start, previous.end);
        const keys = await all<{ id: string; code: string; name: string }>('emergency_keys', 'id,code,name', org.id);
        const vehicles = await all<{ id: string; code: string }>('vehicles', 'id,code', org.id);
        const html = reportHtml(org.name, period, summarize(emergencies), prior.length,
          Object.fromEntries(keys.map(k => [k.id, `${k.code} · ${k.name}`])), Object.fromEntries(vehicles.map(v => [v.id, v.code])));
        for (const userId of recipients) {
          const { data: profile, error: profileError } = await db.from('profiles').select('email').eq('user_id', userId).maybeSingle();
          if (profileError) throw profileError;
          if (!profile?.email || !z.string().email().safeParse(profile.email).success) continue;
          // Recheck protected membership immediately before sending, not user-editable metadata.
          const { data: current, error: memberError } = await db.from('organization_members').select('role,status').eq('organization_id', org.id).eq('user_id', userId).eq('status', 'active').in('role', ['admin', 'oficial']);
          if (memberError) throw memberError;
          if (!current?.some(recipientAllowed)) continue;
          totals.eligibleRecipients++;
          if (dry) continue;
          const { data: existing, error: existingError } = await db.from('monthly_report_deliveries').select('id,status').eq('organization_id', org.id).eq('recipient_user_id', userId).eq('period', period).maybeSingle();
          if (existingError) throw existingError;
          if (existing?.status === 'sent') { totals.alreadySent++; continue; }
          if (!existing) {
            const { error: insertError } = await db.from('monthly_report_deliveries').insert({ organization_id: org.id, recipient_user_id: userId, period });
            if (insertError && insertError.code !== '23505') throw insertError;
          }
          // Stable event key plus persistent sent record protects reruns beyond provider's 24h window.
          const response = await fetch(`${GATEWAY}/emails`, {
            method: 'POST', headers: { ...gatewayHeaders, 'Idempotency-Key': `monthly-${org.id}-${userId}-${period}` },
            body: JSON.stringify({ from: `Operix Dispatch <reportes@${REPORT_DOMAIN}>`, to: [profile.email], subject: `Reporte operativo ${period} · ${org.name}`, html }),
          });
          if (!response.ok) {
            const details = await response.text();
            console.error('Resend report failed', response.status, details);
            const { error: logError } = await db.from('monthly_report_deliveries').update({ status: 'failed', error_status: response.status }).eq('organization_id', org.id).eq('recipient_user_id', userId).eq('period', period).neq('status', 'sent');
            if (logError) throw logError;
            totals.failed++;
            return json({ error: 'Resend send failed', status: response.status, details, period, totals }, 502);
          }
          const result = await response.json();
          const { error: logError } = await db.from('monthly_report_deliveries').update({ status: 'sent', provider_id: result.id, sent_at: new Date().toISOString(), error_status: null }).eq('organization_id', org.id).eq('recipient_user_id', userId).eq('period', period);
          if (logError) throw logError;
          totals.sent++;
          await new Promise(resolve => setTimeout(resolve, 600));
        }
      }
      if (organizations.length < 100) break;
    }
    return json({ mode: parsed.data.mode, period, start, end, senderVerified: Boolean(verified), totals });
  } catch (error) {
    console.error('Monthly report failed', error);
    return json({ error: 'Monthly report could not complete', period, totals }, 500);
  }
});