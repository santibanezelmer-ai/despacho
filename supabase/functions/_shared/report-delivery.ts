import { EMAIL_SEND_ENABLED, sendResend } from './resend-service.ts';
import { recipientAllowed } from './monthly-report.ts';
import { reportHtml } from './report-template.ts';
import type { MonthlyReport } from './report-data.ts';
// Prepared but deliberately not wired into the function until activation approval.
export async function deliverMonthlyReport(db: any, report: MonthlyReport, userId: string, env: (key: string) => string | undefined) {
  if (!EMAIL_SEND_ENABLED) throw new Error('Envíos desactivados');
  const org = report.organizationId;
  const { data: members, error: memberError } = await db.from('organization_members').select('role,status').eq('organization_id',org).eq('user_id',userId).eq('status','active');
  if (memberError) throw memberError;
  if (!members?.some(recipientAllowed)) throw new Error('Destinatario no autorizado');
  const { data: profile, error: profileError } = await db.from('profiles').select('email').eq('user_id',userId).single();
  if (profileError) throw profileError;
  const email=profile.email?.trim().toLowerCase();
  if (!email) throw new Error('Sin correo');
  const {data: suppressed,error: suppressionError}=await db.from('suppressed_emails').select('id').eq('email',email).limit(1);
  if(suppressionError) throw suppressionError;
  if(suppressed?.length) return {status:'suppressed'};
  // Unique INSERT is an atomic claim. Existing sending/failed rows are NOT blindly
  // retried beyond Resend's 24h idempotency window: operator reconciliation required.
  const {error: claimError}=await db.from('monthly_report_deliveries').insert({organization_id:org,recipient_user_id:userId,period:report.period,status:'sending'});
  if(claimError?.code==='23505') return {status:'already_claimed'};
  if(claimError) throw claimError;
  const eventKey=`monthly-${org}-${userId}-${report.period}`;
  try {
    const sent=await sendResend({channel:'reports',to:email,subject:`Reporte operativo ${report.period} · ${report.organizationName}`,html:reportHtml(report,undefined,true),eventKey},env);
    const {error}=await db.from('monthly_report_deliveries').update({status:'sent',provider_id:sent.providerId,sent_at:new Date().toISOString(),error_status:null}).eq('organization_id',org).eq('recipient_user_id',userId).eq('period',report.period).eq('status','sending');
    if(error) throw error;
    return {status:'sent',eventKey};
  } catch(error) {
    await db.from('monthly_report_deliveries').update({status:'failed',error_status:502}).eq('organization_id',org).eq('recipient_user_id',userId).eq('period',report.period).eq('status','sending');
    throw error;
  }
}
