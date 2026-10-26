import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, Clock, CheckCircle2, ListChecks, Plus, Trash2, AlertTriangle, RefreshCw, ShieldCheck, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { ShiftManageDialog, DelegationPanel, useDutyCommand } from '@/components/duty/DutyAdmin';
import { toast } from 'sonner';
import { COMPANY_DUTY_INTEGRATION, fetchManageableCompanies, type DutyShiftRow, buildDraftCommand, defaultSlotMode, dutyCompanyScope, dutyStatusOptions, incompatibleSlotIndexes, fetchDutyShifts, fetchMyDutyAssignments, visibleDutyCompanies, ownScopeCompanies, type DraftFormSlot, type DutyCompany } from '@/lib/companyDuty';

const pending = COMPANY_DUTY_INTEGRATION.message;
const STATUS: Record<string, string> = { borrador: 'Borrador', publicado: 'Publicado', en_curso: 'En curso', finalizado: 'Finalizado', cancelado: 'Cancelado', asignado: 'Asignado', propuesto: 'Propuesto', retirado: 'Retirado', reemplazado: 'Reemplazado', confirmado: 'Confirmado', rechazado: 'Rechazado' };
const fmt = (s: string) => new Date(s).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' });
const sameDay = (iso: string, day: string) => { const d = new Date(iso); return d.toLocaleDateString('sv-SE') === day; };
type FormSlot = DraftFormSlot & { id: number };
const emptySlot = (id: number, mode = 'presencial'): FormSlot => ({ id, role: '', mode, start: '', end: '', capacity: 1 });

export default function CompanyDuty({ personal = false }: { personal?: boolean }) {
  const { orgId, orgRole, currentOrg } = useOrganization();
  const scope = personal ? 'own' : dutyCompanyScope(orgRole, currentOrg?.company_id ?? null);
  const [company, setCompany] = useState('all');
  const [date, setDate] = useState('');
  const [status, setStatus] = useState('all');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ companyId: '', name: '', start: '', end: '', mode: 'presencial' });
  const [slots, setSlots] = useState<FormSlot[]>([emptySlot(0)]);
  const [check, setCheck] = useState<{ ok: boolean; lines: string[] } | null>(null);

  const companies = useQuery({
    queryKey: ['duty-companies', orgId, orgRole, currentOrg?.company_id, scope],
    enabled: !!orgId,
    retry: false,
    queryFn: async () => {
      if (!orgId) return [];
      let query = supabase.from('companies').select('id,name,number,organization_id').eq('organization_id', orgId).order('number');
      if (scope === 'company') {
        if (!currentOrg?.company_id) return [];
        query = query.eq('id', currentOrg.company_id);
      }
      const { data, error } = await query;
      if (error) throw error;
      const list = (data ?? []) as DutyCompany[];
      // Personal (own) view needs real company names for its rows; roster visibility stays governed by visibleDutyCompanies.
      return scope === 'own' ? list : visibleDutyCompanies(list, orgId, orgRole, currentOrg?.company_id ?? null);
    },
  });
  const shifts = useQuery({ queryKey: ['duty-shifts', orgId], enabled: !!orgId && scope !== 'own', retry: false, refetchInterval: 5000, queryFn: () => fetchDutyShifts(orgId!) });
  const mine = useQuery({ queryKey: ['duty-mine', orgId], enabled: !!orgId && scope === 'own', retry: false, refetchInterval: 5000, queryFn: () => fetchMyDutyAssignments(orgId!) });

  const options = companies.data ?? [];
  const manageable = useQuery({ queryKey: ['duty-manage', orgId, options.map(c => c.id).join()], enabled: !!orgId && scope !== 'own' && options.length > 0, queryFn: () => fetchManageableCompanies(orgId!, options.map(c => c.id)) });
  const canManage = (id: string) => (manageable.data ?? []).includes(id);
  const manageOptions = options.filter(c => canManage(c.id));
  const [selected, setSelected] = useState<DutyShiftRow | null>(null);
  const [rejecting, setRejecting] = useState<{ id: string; reason: string } | null>(null);
  // Push deep link: /voluntario/guardias?asignacion=<id> highlights that request.
  const [params] = useSearchParams();
  const focusId = personal ? params.get('asignacion') : null;
  useEffect(() => {
    if (!focusId || !mine.data?.some(a => a.assignment_id === focusId)) return;
    document.getElementById(`duty-row-${focusId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [focusId, mine.data]);
  const cmd = useDutyCommand(orgId, [['duty-shifts', orgId ?? ''], ['duty-mine', orgId ?? '']]);
  const names = useMemo(() => new Map(options.map(c => [c.id, `${c.number}ª · ${c.name}`])), [options]);
  const activeCompany = options.some(c => c.id === company) ? company : 'all';
  const resetFilters = () => { setCompany('all'); setDate(''); setStatus('all'); };

  const rows = (scope === 'own'
    ? (mine.data ?? []).map(a => ({ id: a.assignment_id, company_id: a.company_id, name: `${a.shift_name} · ${a.role_name}`, starts_at: a.starts_at, ends_at: a.ends_at, status: a.assignment_status, extra: STATUS[a.assignment_status] ?? a.assignment_status }))
    : (shifts.data ?? []).map(s => ({ id: s.id, company_id: s.company_id, name: s.name, starts_at: s.starts_at, ends_at: s.ends_at, status: s.status, extra: String(s.capacity) })))
    .filter(r => (activeCompany === 'all' || r.company_id === activeCompany) && (status === 'all' || r.status === status) && (!date || sameDay(r.starts_at, date)));
  const active = scope === 'own' ? mine : shifts;
  const all = scope === 'own' ? (mine.data ?? []).map(a => ({ s: a.shift_status, at: a.starts_at })) : (shifts.data ?? []).map(s => ({ s: s.status, at: s.starts_at }));
  const today = new Date().toLocaleDateString('sv-SE');
  const stats = active.data ? [all.filter(x => sameDay(x.at, today)).length, all.filter(x => x.s === 'publicado' && new Date(x.at) > new Date()).length, all.filter(x => x.s === 'en_curso').length, all.filter(x => x.s === 'finalizado').length] : null;

  const openDraft = () => { setForm({ companyId: activeCompany !== 'all' ? activeCompany : '', name: '', start: '', end: '', mode: 'presencial' }); setSlots([emptySlot(0, 'presencial')]); setCheck(null); setOpen(true); };
  const updSlot = (id: number, patch: Partial<FormSlot>) => setSlots(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));
  const validate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId) return;
    const r = buildDraftCommand({ ...form, slots }, manageOptions.map(c => c.id));
    if ('errors' in r) { setCheck({ ok: false, lines: r.errors }); return; }
    setCheck({ ok: true, lines: [`Guardando borrador con ${r.command.slots.length} cupo(s)…`] });
    cmd.mutate(r.command, {
      onSuccess: () => { toast.success('Borrador guardado.'); setOpen(false); },
      onError: (err: Error) => setCheck({ ok: false, lines: [err.message] }),
    });
  };

  const headers = scope === 'own' ? ['Fecha y horario', 'Compañía', 'Turno y función', 'Mi asignación', 'Acciones'] : ['Fecha y horario', 'Compañía', 'Turno', 'Cupos', 'Estado'];
  const errMsg = active.error ? ((active.error as { message?: string }).message?.includes('denied') ? 'No tiene autorización para consultar estas guardias.' : 'No se pudieron consultar las guardias.') : '';

  return <section className="space-y-5 p-4 md:p-6">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div><h1 className="flex items-center gap-2 text-lg font-bold"><CalendarDays className="h-5 w-5 text-info" />{personal ? 'Mis guardias' : 'Guardias por Compañía'}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{currentOrg?.organization.name}</p></div>
      {scope !== 'own' && <Button variant="outline" size="sm" onClick={openDraft} disabled={manageOptions.length === 0} title={manageOptions.length === 0 ? 'Necesita delegación de gestión del Emisor para alguna compañía.' : undefined}><Plus className="mr-2 h-4 w-4" />Preparar turno</Button>}
    </header>
    <div role="status" className="flex items-start gap-3 border-l-2 border-warning bg-warning/10 p-3 text-sm">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" /><div><p className="font-medium">Operaciones protegidas</p><p className="mt-1 text-muted-foreground">{pending}</p></div>
    </div>
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="h-4 w-4" />
      {scope === 'organization' ? 'Supervisión del Cuerpo · Gestión mediante delegación explícita' : scope === 'company' ? 'Ámbito de su compañía · Visibilidad según delegación' : 'Consulta personal · Solo sus asignaciones'}
    </div>
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {[{ name: 'Hoy', icon: CalendarDays }, { name: 'Próximas', icon: Clock }, { name: 'En curso', icon: ListChecks }, { name: 'Finalizadas', icon: CheckCircle2 }].map((item, i) => <div key={item.name} className="rounded-md border border-border bg-card p-4"><div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">{item.name}<item.icon className="h-4 w-4 text-info" /></div><p className="mt-2 text-2xl font-bold">{stats ? stats[i] : '—'}</p></div>)}
    </div>
    <div className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="space-y-1.5"><Label htmlFor="duty-company">Compañía</Label><Select value={activeCompany} onValueChange={setCompany} disabled={companies.isLoading || !!companies.error}><SelectTrigger id="duty-company"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{scope === 'own' ? 'Según sus asignaciones' : 'Todas las autorizadas'}</SelectItem>{(scope === 'own' ? ownScopeCompanies(options, (mine.data ?? []).map(a => a.company_id)) : options).map(c => <SelectItem key={c.id} value={c.id}>{c.number}ª · {c.name}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-1.5"><Label htmlFor="duty-date">Fecha</Label><Input id="duty-date" type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
      <div className="space-y-1.5"><Label htmlFor="duty-status">Estado</Label><Select value={status} onValueChange={setStatus}><SelectTrigger id="duty-status"><SelectValue /></SelectTrigger><SelectContent>{[['all','Todos'], ...dutyStatusOptions(scope).map(v => [v, STATUS[v] ?? v])].map(([value,label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
      <Button variant="ghost" onClick={resetFilters}>Limpiar filtros</Button>
    </div>
    {(companies.error || active.error) && <div role="alert" className="flex flex-wrap items-center justify-between gap-2 border border-destructive/30 bg-destructive/10 p-3 text-sm"><span>{errMsg || 'No se pudieron consultar las compañías autorizadas.'}</span><Button variant="outline" size="sm" onClick={() => { companies.refetch(); active.refetch(); }}><RefreshCw className="mr-2 h-4 w-4" />Reintentar</Button></div>}
    <Tabs defaultValue="shifts"><TabsList className="h-auto flex-wrap"><TabsTrigger value="shifts">{scope === 'own' ? 'Mis turnos' : 'Turnos'}</TabsTrigger><TabsTrigger value="confirmations">Confirmaciones</TabsTrigger><TabsTrigger value="attendance">Asistencia</TabsTrigger>{scope === 'organization' && <TabsTrigger value="permissions">Permisos</TabsTrigger>}</TabsList>
      <TabsContent value="shifts" className="space-y-3"><div className="overflow-x-auto rounded-md border border-border"><Table><TableHeader><TableRow>{headers.map(h => <TableHead key={h} className="whitespace-nowrap">{h}</TableHead>)}</TableRow></TableHeader><TableBody>
        {active.isLoading ? <TableRow><TableCell colSpan={5} className="h-32 text-center text-muted-foreground">Cargando guardias…</TableCell></TableRow>
          : rows.length === 0 ? <TableRow><TableCell colSpan={5} className="h-44 text-center"><CalendarDays className="mx-auto mb-3 h-7 w-7 text-muted-foreground" /><p className="font-medium">{scope === 'own' ? 'No tiene guardias asignadas' : 'No hay turnos para mostrar'}</p><p className="mt-1 text-sm text-muted-foreground">{scope === 'own' ? 'Solo se muestran turnos publicados asignados a usted.' : 'Solo verá turnos de compañías que pueda supervisar o gestionar.'}</p></TableCell></TableRow>
          : rows.map(r => {
            const shiftRow = scope !== 'own' ? (shifts.data ?? []).find(s => s.id === r.id) : undefined;
            const mineRow = scope === 'own' ? (mine.data ?? []).find(a => a.assignment_id === r.id) : undefined;
            const canAnswer = mineRow && mineRow.assignment_status === 'propuesto' && (mineRow.shift_status === 'publicado' || mineRow.shift_status === 'en_curso');
            return <TableRow key={r.id} id={`duty-row-${r.id}`} className={shiftRow ? 'cursor-pointer' : r.id === focusId ? 'bg-info/10 ring-2 ring-inset ring-info' : undefined} onClick={shiftRow ? () => setSelected(shiftRow) : undefined}><TableCell className="whitespace-nowrap">{fmt(r.starts_at)} – {fmt(r.ends_at)}</TableCell><TableCell>{names.get(r.company_id) ?? '—'}</TableCell><TableCell>{r.name}</TableCell><TableCell>{scope === 'own' ? <Badge variant="outline">{r.extra}</Badge> : r.extra}</TableCell><TableCell>{scope === 'own'
              ? (canAnswer ? (rejecting?.id === r.id
                ? <div className="flex flex-wrap gap-2"><Input aria-label="Motivo del rechazo" className="h-8 w-40" value={rejecting.reason} onChange={e => setRejecting({ id: r.id, reason: e.target.value })} /><Button size="sm" variant="destructive" disabled={cmd.isPending || rejecting.reason.trim().length < 3} onClick={() => cmd.mutate({ kind: 'confirm', assignmentId: r.id, accept: false, reason: rejecting.reason.trim() }, { onSuccess: () => { toast.success('Guardia rechazada.'); setRejecting(null); } })}>Enviar</Button><Button size="sm" variant="ghost" onClick={() => setRejecting(null)}>Volver</Button></div>
                : <div className="flex gap-2"><Button size="sm" disabled={cmd.isPending} onClick={() => cmd.mutate({ kind: 'confirm', assignmentId: r.id, accept: true, reason: '' }, { onSuccess: () => toast.success('Guardia confirmada.') })}>Confirmar</Button><Button size="sm" variant="outline" disabled={cmd.isPending} onClick={() => setRejecting({ id: r.id, reason: '' })}>Rechazar</Button></div>)
                : <span className="text-xs text-muted-foreground">Turno {STATUS[mineRow?.shift_status ?? ''] ?? mineRow?.shift_status}</span>)
              : <Badge variant="outline">{STATUS[r.status] ?? r.status}</Badge>}</TableCell></TableRow>;
          })}
      </TableBody></Table></div>
      {scope !== 'own' && <p className="text-xs text-muted-foreground">Seleccione un turno para ver cupos, publicar, cancelar o asignar voluntarios.</p>}</TabsContent>
      <TabsContent value="confirmations"><div className="space-y-3 border-t border-border py-8 text-center"><Users className="mx-auto h-7 w-7 text-muted-foreground" /><p>{scope === 'own' ? 'Confirme o rechace sus guardias propuestas desde la pestaña "Mis turnos".' : 'Cada voluntario confirma su propia asignación; aquí verá el estado en el detalle de cada turno.'}</p></div></TabsContent>
      <TabsContent value="attendance"><div className="space-y-3 border-t border-border py-8 text-center"><ListChecks className="mx-auto h-7 w-7 text-muted-foreground" /><p>Registro de asistencia no disponible.</p><p className="text-sm text-muted-foreground">{COMPANY_DUTY_INTEGRATION.attendanceMessage}</p><Button disabled variant="outline">Validar asistencia</Button></div></TabsContent>
      {scope === 'organization' && orgId && <TabsContent value="permissions"><DelegationPanel orgId={orgId} companies={options} /></TabsContent>}
    </Tabs>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto"><DialogHeader><DialogTitle>Preparar turno en borrador</DialogTitle><DialogDescription>Se guarda completo (turno y cupos) en una sola operación, o no se guarda nada.</DialogDescription></DialogHeader>
      <form className="space-y-4" onSubmit={validate}>
        <div className="space-y-1.5"><Label htmlFor="draft-company">Compañía</Label><Select value={form.companyId || undefined} onValueChange={v => setForm(f => ({ ...f, companyId: v }))}><SelectTrigger id="draft-company"><SelectValue placeholder="Seleccionar compañía autorizada" /></SelectTrigger><SelectContent>{manageOptions.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-1.5"><Label htmlFor="draft-name">Nombre del turno</Label><Input id="draft-name" maxLength={160} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
        <div className="grid gap-3 sm:grid-cols-2"><div className="space-y-1.5"><Label htmlFor="draft-start">Inicio</Label><Input id="draft-start" type="datetime-local" value={form.start} onChange={e => setForm(f => ({ ...f, start: e.target.value }))} /></div><div className="space-y-1.5"><Label htmlFor="draft-end">Término</Label><Input id="draft-end" type="datetime-local" value={form.end} onChange={e => setForm(f => ({ ...f, end: e.target.value }))} /></div></div>
        <div className="space-y-1.5"><Label htmlFor="draft-mode">Modalidad</Label><Select value={form.mode} onValueChange={v => setForm(f => ({ ...f, mode: v }))}><SelectTrigger id="draft-mode"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="presencial">Presencial</SelectItem><SelectItem value="domiciliaria">Domiciliaria</SelectItem><SelectItem value="mixta">Mixta</SelectItem></SelectContent></Select></div>
        {incompatibleSlotIndexes(form.mode, slots).length > 0 && <p role="alert" className="text-sm text-destructive">Cupo(s) {incompatibleSlotIndexes(form.mode, slots).join(', ')}: la modalidad no coincide con la del turno ({form.mode}). Ajústela o elija "Mixta".</p>}
        <div className="flex items-center justify-between gap-2 border-t border-border pt-4"><h2 className="font-medium">Cupos</h2><Button type="button" size="sm" variant="outline" disabled={slots.length >= 100} onClick={() => setSlots(prev => [...prev, emptySlot(Math.max(...prev.map(s => s.id)) + 1, defaultSlotMode(form.mode))])}><Plus className="mr-1 h-4 w-4" />Añadir cupo</Button></div>
        {slots.map((slot, index) => <fieldset key={slot.id} className="space-y-3 border-b border-border pb-4"><legend className="mb-2 text-sm text-muted-foreground">Cupo {index + 1}</legend><div className="grid gap-3 sm:grid-cols-2"><div className="space-y-1.5"><Label htmlFor={`role-${slot.id}`}>Función</Label><Input id={`role-${slot.id}`} maxLength={100} value={slot.role} onChange={e => updSlot(slot.id, { role: e.target.value })} /></div><div className="space-y-1.5"><Label htmlFor={`capacity-${slot.id}`}>Cantidad</Label><Input id={`capacity-${slot.id}`} type="number" min={1} max={500} value={slot.capacity} onChange={e => updSlot(slot.id, { capacity: Number(e.target.value) })} /></div><div className="space-y-1.5"><Label htmlFor={`start-${slot.id}`}>Inicio del cupo</Label><Input id={`start-${slot.id}`} type="datetime-local" value={slot.start} onChange={e => updSlot(slot.id, { start: e.target.value })} /></div><div className="space-y-1.5"><Label htmlFor={`end-${slot.id}`}>Término del cupo</Label><Input id={`end-${slot.id}`} type="datetime-local" value={slot.end} onChange={e => updSlot(slot.id, { end: e.target.value })} /></div></div><Select value={slot.mode} onValueChange={v => updSlot(slot.id, { mode: v })}><SelectTrigger aria-label={`Modalidad del cupo ${index + 1}`}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="presencial">Presencial</SelectItem><SelectItem value="domiciliaria">Domiciliaria</SelectItem></SelectContent></Select><Button type="button" variant="ghost" size="sm" disabled={slots.length === 1} onClick={() => setSlots(prev => prev.filter(s => s.id !== slot.id))}><Trash2 className="mr-1 h-4 w-4" />Quitar cupo</Button></fieldset>)}
        {check && <div role={check.ok ? 'status' : 'alert'} className={`space-y-1 border p-3 text-sm ${check.ok ? 'border-success/30 bg-success/10' : 'border-destructive/30 bg-destructive/10'}`}>{check.lines.map(l => <p key={l}>{l}</p>)}</div>}
        <div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cerrar</Button><Button type="submit" disabled={cmd.isPending}>Guardar borrador</Button></div>
      </form>
    </DialogContent></Dialog>
    {selected && orgId && <ShiftManageDialog orgId={orgId} shift={(shifts.data ?? []).find(s => s.id === selected.id) ?? selected} canManage={canManage(selected.company_id)} onClose={() => setSelected(null)} />}
  </section>;
}
