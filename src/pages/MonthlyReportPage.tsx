import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Download, Mail, FileText, RefreshCw } from 'lucide-react';
import { readMonthlyReport, previousMonth } from '@/lib/monthlyReportClient';
import { downloadMonthlyReportPdf } from '@/lib/monthlyReportPdf';
import { reportHtml, communicationHtml } from '../../supabase/functions/_shared/report-template';
import logo from '@/assets/operix-report-logo.png.asset.json';
import localLogo from '@/assets/operix-logo.png';

export default function MonthlyReportPage() {
  const { orgId, memberships, setCurrentOrgId } = useOrganization();
  const [params, setParams] = useSearchParams();
  const targetOrg = params.get('org') ?? orgId;
  const period = params.get('period') ?? previousMonth().period;
  const [view, setView] = useState('report');
  const [downloaded, setDownloaded] = useState('');
  const reportQuery = useQuery({ queryKey: ['monthly-report', targetOrg, period], queryFn: () => { if (!targetOrg) throw new Error('Selecciona organización'); return readMonthlyReport(targetOrg, period); }, enabled: !!targetOrg, retry: false });
  useEffect(() => { if (targetOrg && targetOrg !== orgId && memberships.some(m => m.organization_id === targetOrg)) setCurrentOrgId(targetOrg); }, [targetOrg, orgId, memberships, setCurrentOrgId]);
  const r = reportQuery.data;
  useEffect(() => { const key = `${targetOrg}-${period}`; if (r && params.get('download') === 'pdf' && downloaded !== key) { downloadMonthlyReportPdf(r); setDownloaded(key); } }, [r, params, downloaded, targetOrg, period]);
  const logoUrl = `https://operixdispatch.com${logo.url}`;
  let html = '';
  if (r) {
    if (view === 'report' || view === 'mail') html = reportHtml(r, logoUrl, view === 'mail');
    else if (view === 'administrative' || view === 'operational' || view === 'invitation' || view === 'system') html = communicationHtml(view, { administrative: 'Notificación administrativa', operational: 'Alerta operativa', invitation: 'Invitación a la organización', system: 'Comunicación del sistema' }[view], 'Vista previa de plantilla: no se ha enviado ningún correo.', r.organizationName, undefined, logoUrl);
    // Allow the existing private logo to display locally, without changing emailed URLs.
    html = html.split(logoUrl).join(import.meta.env.DEV ? localLogo : logo.url);
  }
  return <div className="p-4 space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-xl font-bold">Reporte mensual</h1><p className="text-sm text-muted-foreground">Envíos desactivados</p></div><div className="flex gap-2"><Input type="month" aria-label="Período informado" value={period} onChange={e => { if (e.target.value) setParams({ org: targetOrg ?? '', period: e.target.value }); }} className="w-44"/><Button variant="outline" size="icon" aria-label="Actualizar reporte" onClick={() => reportQuery.refetch()}><RefreshCw/></Button><Button disabled={!r} onClick={() => r && downloadMonthlyReportPdf(r)}><Download/>PDF</Button></div></div>
    <div className="flex flex-wrap gap-2">{[['report','Reporte completo'],['mail','Correo mensual'],['administrative','Administrativas'],['operational','Operativas'],['invitation','Invitaciones'],['system','Sistema']].map(([key,label]) => <Button key={key} variant={view===key?'default':'outline'} onClick={() => setView(key)}>{key==='mail'?<Mail/>:<FileText/>}{label}</Button>)}</div>
    {reportQuery.isPending && <p>Cargando reporte…</p>}{reportQuery.isError && <div role="alert" className="text-destructive">{reportQuery.error.message}</div>}
    {r && <iframe title="Vista previa del reporte mensual" sandbox="allow-same-origin" srcDoc={html} className="w-full border border-border min-h-[1400px]"/>}
  </div>;
}
