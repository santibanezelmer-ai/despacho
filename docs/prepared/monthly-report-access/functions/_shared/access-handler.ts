import { hashReportToken, randomReportToken, reportAccessLinks } from './report-access.ts';
import { loadReport } from './report-data.ts';

export type AccessInput = { action: 'view' | 'download'; token: string } | { action: 'list' | 'issue' | 'revoke'; organization_id: string; period?: string; recipient_user_id?: string; access_id?: string };
export type AccessDependencies = { db: any; userId: (request: Request) => Promise<string | null>; abuseAllowed: (request: Request) => Promise<boolean>; pdf: (report: any) => Promise<ArrayBuffer> };
export async function handleReportAccess(request: Request, input: AccessInput, deps: AccessDependencies): Promise<{ body: unknown; status: number; pdf?: ArrayBuffer; filename?: string }> {
  const { db } = deps;
  if ('token' in input) {
    if (Object.keys(input).some(key => !['action', 'token'].includes(key))) return { body: { state: 'invalid' }, status: 400 };
    if (!await deps.abuseAllowed(request)) return { body: { state: 'limited' }, status: 429 };
    const hash = await hashReportToken(input.token);
    const { data, error } = await db.rpc('monthly_report_consume', { _hash: hash, _action: input.action });
    if (error) throw new Error('storage_unavailable');
    if (data?.state !== 'active') return { body: { state: data?.state ?? 'invalid' }, status: data?.state === 'invalid' ? 404 : 410 };
    if (input.action === 'download') {
      // The snapshot is server-generated, aggregate-only, never chosen by URL identifiers.
      return { body: null, status: 200, pdf: await deps.pdf(data.report), filename: `operix-reporte-${data.report.period}.pdf` };
    }
    return { body: data, status: 200 };
  }
  const actor = await deps.userId(request);
  if (!actor) return { body: { state: 'unauthorized' }, status: 401 };
  const org = input.organization_id;
  const { data: members, error: memberError } = await db.from('organization_members').select('role,company_id').eq('organization_id', org).eq('user_id', actor).eq('status', 'active');
  if (memberError) throw new Error('storage_unavailable');
  if (!members?.some((m: { role: string; company_id: string | null }) => m.role === 'admin' && m.company_id === null)) return { body: { state: 'unauthorized' }, status: 403 };
  if (input.action === 'list') {
    const { data, error } = await db.from('monthly_report_access_tokens').select('id,recipient_user_id,issued_at,expires_at,revoked_at,report_id').eq('organization_id', org).order('issued_at', { ascending: false }).limit(100);
    if (error) throw new Error('storage_unavailable');
    const { data: audit, error: auditError } = await db.from('monthly_report_access_audit').select('access_id,action,created_at').eq('organization_id', org).order('created_at', { ascending: false }).limit(500);
    if (auditError) throw new Error('storage_unavailable');
    return { body: { links: data, audit, auditLimitedTo: 500 }, status: 200 };
  }
  if (input.action === 'revoke') {
    const { data, error } = await db.rpc('monthly_report_revoke', { _org: org, _id: input.access_id, _actor: actor });
    if (error) throw new Error('storage_unavailable');
    return { body: { revoked: data }, status: data ? 200 : 409 };
  }
  if (!input.period || !input.recipient_user_id) return { body: { state: 'invalid' }, status: 400 };
  const { data: eligible, error: recipientError } = await db.from('organization_members').select('role,company_id').eq('organization_id', org).eq('user_id', input.recipient_user_id).eq('status', 'active').in('role', ['admin', 'oficial']);
  if (recipientError) throw new Error('storage_unavailable');
  if (!eligible?.some((m: { role: string; company_id: string | null }) => m.role === 'oficial' || m.role === 'admin' && m.company_id === null)) return { body: { state: 'unauthorized' }, status: 403 };
  let { data: snapshot, error: readError } = await db.from('monthly_report_snapshots').select('id').eq('organization_id', org).eq('period', input.period).maybeSingle();
  if (readError) throw new Error('storage_unavailable');
  if (!snapshot) {
    const report = await loadReport(db, org, input.period);
    const { error } = await db.from('monthly_report_snapshots').upsert({ organization_id: org, period: input.period, report }, { onConflict: 'organization_id,period', ignoreDuplicates: true });
    if (error) throw new Error('storage_unavailable');
    const read = await db.from('monthly_report_snapshots').select('id').eq('organization_id', org).eq('period', input.period).single();
    if (read.error) throw new Error('storage_unavailable');
    snapshot = read.data;
  }
  const token = randomReportToken();
  const { data: issued, error } = await db.rpc('monthly_report_issue', { _org: org, _report: snapshot.id, _recipient: input.recipient_user_id, _hash: await hashReportToken(token), _actor: actor });
  if (error) throw new Error('storage_unavailable');
  return { body: { ...issued, links: reportAccessLinks(token) }, status: 201 };
}