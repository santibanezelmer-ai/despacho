import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, ShieldCheck, Loader2 } from 'lucide-react';
import { captureReportSecret, downloadSharedReport, viewSharedReport, ReportAccessError, ACCESS_MESSAGES } from '@/lib/monthlyReportAccessClient';
import { emailFrame, reportSections, escapeHtml } from '../../supabase/functions/_shared/report-template';
import type { MonthlyReport } from '../../supabase/functions/_shared/report-data';
import logo from '@/assets/operix-logo.png';

// Executed before this public page mounts; secret retained only in memory.
const initialSecret = window.location.pathname.startsWith('/reportes/consulta') ? captureReportSecret() : '';
export default function MonthlyReportSharedPage() {
  const secret = useRef(initialSecret);
  const started = useRef(false);
  const [report, setReport] = useState<MonthlyReport>();
  const [expires, setExpires] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);
  const [downloaded, setDownloaded] = useState(false);
  const download = async () => {
    setBusy(true); setError('');
    try { await downloadSharedReport(secret.current); setDownloaded(true); }
    catch (e) { setReport(undefined); setError(e instanceof ReportAccessError ? e.message : ACCESS_MESSAGES.unavailable); }
    finally { setBusy(false); }
  };
  useEffect(() => {
    if (started.current) return; started.current = true;
    if (window.location.pathname.endsWith('/descargar')) { void download(); return; }
    void viewSharedReport(secret.current).then(data => { setReport(data.report); setExpires(data.expires_at); })
      .catch(e => setError(e instanceof ReportAccessError ? e.message : ACCESS_MESSAGES.unavailable)).finally(() => setBusy(false));
  }, []);
  useEffect(() => {
    if (!expires) return;
    const timer = window.setTimeout(() => { setReport(undefined); setError(ACCESS_MESSAGES.expired); }, Math.max(0, Date.parse(expires) - Date.now()));
    return () => window.clearTimeout(timer);
  }, [expires]);
  let html = '';
  if (report) {
    const s = reportSections(report);
    // Full approved six-block template, no navigation links or identifier selectors.
    html = emailFrame('Reporte operativo mensual', `<h2>${escapeHtml(report.organizationName)}</h2><p>Período: ${escapeHtml(report.period)}</p>` + s.summary + s.types + s.fleet + s.personnel + s.comparison);
    html = html.replace('<head>', '<head><meta name="referrer" content="no-referrer"><meta name="robots" content="noindex,nofollow">');
  }
  return <main className="min-h-screen bg-background text-foreground">
    <header className="border-b border-border px-4 py-5"><div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3"><img src={logo} alt="Operix Dispatch" className="h-12 w-12 object-contain"/><div><h1 className="text-xl font-bold">Operix Dispatch</h1><p className="text-sm text-muted-foreground">Reporte operativo mensual</p></div></div>
      <Button onClick={download} disabled={busy || !!error}><Download className="h-4 w-4"/>Descargar PDF</Button>
    </div></header>
    <div className="mx-auto max-w-4xl space-y-4 px-4 py-5">
      {busy && <p role="status" className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin"/>Consultando informe…</p>}
      {error && <div role="alert" className="border-l-4 border-destructive pl-4"><h2 className="font-semibold">Acceso no disponible</h2><p className="mt-2">{error}</p></div>}
      {downloaded && !error && <p role="status">Descarga del PDF iniciada.</p>}
      {report && <><div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-lg font-semibold">{report.organizationName}</h2><p>{report.period}</p></div><p className="flex items-center gap-2 text-sm text-muted-foreground"><ShieldCheck className="h-4 w-4"/>Vigente hasta {new Date(expires).toLocaleString('es-CL', { timeZone: 'America/Santiago' })}</p></div><iframe title="Informe mensual completo" srcDoc={html} sandbox="" referrerPolicy="no-referrer" className="min-h-[1600px] w-full border-0"/></>}
    </div>
  </main>;
}