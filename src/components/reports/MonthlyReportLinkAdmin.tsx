import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Link2, RefreshCw, ShieldOff } from 'lucide-react';

type LinkRow = { id: string; recipient_user_id: string; issued_at: string; expires_at: string; revoked_at: string | null };
type AuditRow = { access_id: string; action: string; created_at: string };
export default function MonthlyReportLinkAdmin({ orgId, period }: { orgId: string; period: string }) {
  const [recipients, setRecipients] = useState<{ id: string; label: string }[]>([]);
  const [recipient, setRecipient] = useState('');
  const [rows, setRows] = useState<LinkRow[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [issued, setIssued] = useState<{ view: string; pdf: string }>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const invoke = async (body: Record<string, unknown>) => {
    const { data, error: callError } = await supabase.functions.invoke('monthly-report-access', { body });
    if (callError) throw new Error('El acceso compartido aún no está disponible. La instalación y publicación requieren autorización.');
    return data;
  };
  const refresh = async () => {
    setBusy(true); setError('');
    try { const data = await invoke({ action: 'list', organization_id: orgId }); setRows(data.links ?? []); setAudit(data.audit ?? []); }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudieron consultar los enlaces.'); }
    finally { setBusy(false); }
  };
  useEffect(() => {
    setIssued(undefined); setRecipient(''); setRows([]); setAudit([]);
    let active = true;
    void (async () => {
      const { data: members, error: memberError } = await supabase.from('organization_members').select('user_id,role,company_id').eq('organization_id', orgId).eq('status', 'active').in('role', ['admin', 'oficial']);
      if (!active) return;
      if (memberError || !members?.length) { setRecipients([]); return; }
      const eligible = members.filter(m => m.role === 'oficial' || m.company_id === null);
      const ids = eligible.map(m => m.user_id);
      if (!ids.length) { setRecipients([]); return; }
      const { data: profiles } = await supabase.from('profiles').select('user_id,display_name,email').in('user_id', ids);
      if (active) setRecipients(eligible.map(m => ({ id: m.user_id, label: profiles?.find(p => p.user_id === m.user_id)?.display_name || profiles?.find(p => p.user_id === m.user_id)?.email || `${m.role === 'admin' ? 'Administrador' : 'Oficial'} · ${m.user_id.slice(-6)}` })));
    })();
    return () => { active = false; };
  }, [orgId, period]);
  const issue = async () => {
    setBusy(true); setError(''); setIssued(undefined);
    try { const data = await invoke({ action: 'issue', organization_id: orgId, period, recipient_user_id: recipient }); setIssued(data.links); }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo emitir el enlace.'); }
    finally { setBusy(false); }
  };
  const revoke = async (id: string) => {
    setBusy(true); setError('');
    try { await invoke({ action: 'revoke', organization_id: orgId, access_id: id }); setConfirmation(''); setIssued(undefined); await refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo revocar el enlace.'); }
    finally { setBusy(false); }
  };
  const date = (s: string) => new Date(s).toLocaleString('es-CL', { timeZone: 'America/Santiago' });
  return <section className="space-y-4 border-t border-border pt-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Accesos compartidos · {period}</h2><Button onClick={refresh} disabled={busy} variant="outline" size="icon" aria-label="Consultar enlaces"><RefreshCw className="h-4 w-4"/></Button></div>
    <div className="flex flex-wrap gap-3"><Select value={recipient} onValueChange={setRecipient}><SelectTrigger className="w-full sm:w-80" aria-label="Destinatario autorizado"><SelectValue placeholder="Seleccionar destinatario"/></SelectTrigger><SelectContent>{recipients.map(r => <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>)}</SelectContent></Select><Button onClick={issue} disabled={busy || !recipient}><Link2 className="h-4 w-4"/>Generar enlace · 15 días</Button></div>
    {error && <p role="alert" className="text-destructive">{error}</p>}
    {issued && <div className="flex flex-wrap gap-4"><a href={issued.view} rel="noreferrer" target="_blank" className="text-primary underline">Ver reporte completo</a><a href={issued.pdf} rel="noreferrer" target="_blank" className="text-primary underline">Descargar PDF</a></div>}
    {rows.map(r => <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-3"><div><p className="font-medium">{recipients.find(p => p.id === r.recipient_user_id)?.label ?? 'Destinatario autorizado'}</p><p className="text-sm text-muted-foreground">Emitido {date(r.issued_at)} · Vence {date(r.expires_at)}</p><p className="text-sm">{r.revoked_at ? 'Revocado' : Date.now() >= Date.parse(r.expires_at) ? 'Expirado' : 'Vigente'} · Consultas {audit.filter(a => a.access_id === r.id && a.action === 'view').length} · Descargas {audit.filter(a => a.access_id === r.id && a.action === 'download').length}</p></div>{!r.revoked_at && <div className="flex gap-2">{confirmation === r.id ? <><Button variant="destructive" disabled={busy} onClick={() => revoke(r.id)}>Confirmar revocación</Button><Button variant="outline" onClick={() => setConfirmation('')}>Cancelar</Button></> : <Button variant="outline" onClick={() => setConfirmation(r.id)}><ShieldOff className="h-4 w-4"/>Revocar</Button>}</div>}</div>)}
    {!!rows.length && <p className="text-sm text-muted-foreground">Recuento de los últimos 500 eventos registrados; hasta 100 enlaces recientes de la organización.</p>}
  </section>;
}