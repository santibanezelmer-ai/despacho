import { EMAIL_SEND_ENABLED, sendResend } from './resend-service.ts';
import { reportHtml } from './report-template.ts';
import type { MonthlyReport } from './report-data.ts';

// Prepared transport only: links must be created by authorized monthly-report-access issuance.
export async function deliverMonthlyReport(db: any, report: MonthlyReport, userId: string, env: (key: string) => string | undefined, access: { id: string; links: { view: string; pdf: string } }) {
  if (!EMAIL_SEND_ENABLED) throw new Error('Envíos desactivados');
  const { data: grant, error: accessError } = await db.from('monthly_report_access_tokens').select('id,expires_at,revoked_at,report_id').eq('id', access.id).eq('organization_id', report.organizationId).eq('recipient_user_id', userId).single();
  if (accessError || !grant || grant.revoked_at || Date.now() >= Date.parse(grant.expires_at)) throw new Error('Acceso no disponible');
  const { data: snapshot, error: snapshotError } = await db.from('monthly_report_snapshots').select('report,period').eq('id', grant.report_id).eq('organization_id', report.organizationId).single();
  if (snapshotError || snapshot.period !== report.period) throw new Error('Reporte no disponible');
  const viewToken = access.links.view.match(/^https:\/\/operixdispatch\.com\/reportes\/consulta#([0-9a-f]{64})$/)?.[1];
  if (!viewToken || access.links.pdf !== `https://operixdispatch.com/reportes/consulta/descargar#${viewToken}`) throw new Error('Enlaces no válidos');
  const { hashReportToken } = await import('./report-access.ts');
  const { data: matching, error: hashError } = await db.from('monthly_report_access_tokens').select('id').eq('id', access.id).eq('organization_id', report.organizationId).eq('token_hash', await hashReportToken(viewToken)).single();
  if (hashError || !matching) throw new Error('Enlaces no válidos');
  const { data: recipient, error: memberError } = await db.from('organization_members').select('role,company_id').eq('organization_id', report.organizationId).eq('user_id', userId).eq('status', 'active').in('role', ['admin','oficial']);
  if (memberError || !recipient?.some((m: { role: string; company_id: string | null }) => m.role === 'oficial' || m.company_id === null)) throw new Error('Destinatario no autorizado');
  const { data: profile, error: profileError } = await db.from('profiles').select('email').eq('user_id', userId).single();
  if (profileError || !profile.email) throw new Error('Sin correo');
  const email = profile.email.trim().toLowerCase();
  const { data: suppressed, error: suppressionError } = await db.from('suppressed_emails').select('id').eq('email',email).limit(1);
  if (suppressionError) throw new Error('Correo no disponible');
  if (suppressed?.length) return { status: 'suppressed' };
  const { error: claim } = await db.from('monthly_report_deliveries').insert({ organization_id: report.organizationId, recipient_user_id: userId, period: report.period, status: 'sending' });
  if (claim?.code === '23505') return { status: 'already_claimed' };
  if (claim) throw new Error('Entrega no disponible');
  const eventKey = `monthly-${report.organizationId}-${userId}-${report.period}`;
  const sent = await sendResend({ channel: 'reports', to: email, subject: `Reporte operativo ${report.period} · ${report.organizationName}`, html: reportHtml(snapshot.report, undefined, true, access.links), eventKey }, env);
  const { error } = await db.from('monthly_report_deliveries').update({ status: 'sent', provider_id: sent.providerId, sent_at: new Date().toISOString() }).eq('organization_id', report.organizationId).eq('recipient_user_id', userId).eq('period', report.period).eq('status','sending');
  if (error) throw new Error('Estado de entrega no disponible');
  return { status: 'sent' };
}