import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';
import { handleReportAccess } from '../_shared/access-handler.ts';
import { createMonthlyReportPdf } from '../_shared/report-pdf.ts';
import { hashReportToken } from '../_shared/report-access.ts';
import { reportLogo } from '../_shared/report-logo.ts';

const publicSchema = z.object({ action: z.enum(['view', 'download']), token: z.string().regex(/^[0-9a-f]{64}$/) }).strict();
const adminSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('list'), organization_id: z.string().uuid() }).strict(),
  z.object({ action: z.literal('issue'), organization_id: z.string().uuid(), recipient_user_id: z.string().uuid(), period: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/) }).strict(),
  z.object({ action: z.literal('revoke'), organization_id: z.string().uuid(), access_id: z.string().uuid() }).strict(),
]);
const headers = { ...corsHeaders, 'Access-Control-Expose-Headers': 'Content-Disposition', 'Cache-Control': 'no-store, private', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff', 'X-Robots-Tag': 'noindex, nofollow' };
const json = (body: unknown, status: number) => new Response(JSON.stringify(body), { status, headers: { ...headers, 'Content-Type': 'application/json' } });
Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers });
  if (request.method !== 'POST' || new URL(request.url).search) return json({ state: 'invalid' }, 400);
  if (Number(request.headers.get('content-length') ?? 0) > 2048) return json({ state: 'invalid' }, 413);
  try {
    const text = await request.text();
    if (text.length > 2048) return json({ state: 'invalid' }, 413);
    const input = z.union([publicSchema, adminSchema]).safeParse(JSON.parse(text));
    // Never reflect validation details, input or tokens in errors or logs.
    if (!input.success) return json({ state: 'invalid' }, 400);
    const url = Deno.env.get('SUPABASE_URL'), key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !key) return json({ state: 'unavailable' }, 503);
    const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const result = await handleReportAccess(request, input.data, {
      db,
      userId: async req => {
        const jwt = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
        if (!jwt) return null;
        const { data, error } = await db.auth.getUser(jwt);
        return error ? null : data.user?.id ?? null;
      },
      abuseAllowed: async req => {
        if (!('token' in input.data)) return false;
        // Trust only the platform's proxy-supplied forwarding header; never body IPs.
        const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
        if (!ip) throw new Error('origin_unavailable');
        const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${key}:report-origin:${ip}`));
        const origin = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
        const { data, error } = await db.rpc('monthly_report_rate_gate', { _origin: origin, _link: await hashReportToken(input.data.token) });
        if (error) throw new Error('limiter_unavailable');
        return data === true;
      },
      pdf: async report => createMonthlyReportPdf(report, reportLogo).output('arraybuffer'),
    });
    if (result.pdf) return new Response(result.pdf, { status: 200, headers: { ...headers, 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${result.filename}"` } });
    return json(result.body, result.status);
  } catch {
    return json({ state: 'unavailable' }, 503);
  }
});