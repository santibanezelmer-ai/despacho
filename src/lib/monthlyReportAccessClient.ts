import type { MonthlyReport } from '../../supabase/functions/_shared/report-data';

export const ACCESS_MESSAGES: Record<string, string> = {
  expired: 'Este enlace ha cumplido sus 15 días de vigencia. Solicita un nuevo enlace al administrador de tu organización.',
  revoked: 'El administrador ha revocado este acceso. Solicita un nuevo enlace si necesitas consultar el informe.',
  invalid: 'Este enlace no es válido. Revisa el correo original o solicita un nuevo enlace.',
  limited: 'Se han realizado demasiadas solicitudes. Espera 10 minutos antes de volver a intentarlo.',
  unavailable: 'No es posible consultar el informe ahora. Inténtalo nuevamente más tarde.',
};
export class ReportAccessError extends Error {
  constructor(public state: string) { super(ACCESS_MESSAGES[state] ?? ACCESS_MESSAGES.unavailable); }
}
export function captureReportSecret() {
  const token = window.location.hash.slice(1);
  // Discard URL parameters completely. No organization/period selectors in this flow.
  window.history.replaceState(null, '', window.location.pathname);
  const meta = document.createElement('meta');
  meta.name = 'referrer'; meta.content = 'no-referrer'; document.head.append(meta);
  const robots = document.createElement('meta');
  robots.name = 'robots'; robots.content = 'noindex, nofollow'; document.head.append(robots);
  return /^[0-9a-f]{64}$/.test(token) ? token : '';
}
export async function requestReportAccess(token: string, action: 'view' | 'download') {
  if (!/^[0-9a-f]{64}$/.test(token)) throw new ReportAccessError('invalid');
  const response = await fetch(`https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/monthly-report-access`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
    body: JSON.stringify({ token, action }), cache: 'no-store', referrerPolicy: 'no-referrer', credentials: 'omit', signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({ state: 'unavailable' }));
    throw new ReportAccessError(typeof data.state === 'string' ? data.state : 'unavailable');
  }
  return response;
}
export async function viewSharedReport(token: string): Promise<{ report: MonthlyReport; expires_at: string }> {
  return (await requestReportAccess(token, 'view')).json();
}
export async function downloadSharedReport(token: string) {
  // Always revalidate at the server; never use the previously loaded report to download.
  const response = await requestReportAccess(token, 'download');
  const blob = await response.blob();
  if (!blob.type.includes('application/pdf')) throw new ReportAccessError('unavailable');
  const filename = response.headers.get('Content-Disposition')?.match(/filename="(operix-reporte-\d{4}-\d{2}\.pdf)"/)?.[1] ?? 'operix-reporte.pdf';
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename;
  document.body.append(anchor); anchor.click(); anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}