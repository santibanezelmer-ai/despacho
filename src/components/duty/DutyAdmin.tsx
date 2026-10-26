import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { executeDutyCommand, fetchShiftDetail, type DutyCommand, type DutyShiftRow, type DutyCompany } from '@/lib/companyDuty';

const fmt = (s: string) => new Date(s).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' });

export function useDutyCommand(orgId: string | null, invalidate: string[][]) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (c: DutyCommand) => executeDutyCommand(orgId!, c),
    onSuccess: () => { invalidate.forEach(k => qc.invalidateQueries({ queryKey: k })); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function ShiftManageDialog({ orgId, shift, canManage, onClose }: { orgId: string; shift: DutyShiftRow | null; canManage: boolean; onClose: () => void }) {
  const [reason, setReason] = useState('');
  const [slotId, setSlotId] = useState('');
  const [volId, setVolId] = useState('');
  const detail = useQuery({ queryKey: ['duty-shift', orgId, shift?.id], enabled: !!shift, queryFn: () => fetchShiftDetail(orgId, shift!.id) });
  const vols = useQuery({
    queryKey: ['duty-vols', orgId, shift?.company_id], enabled: !!shift && canManage,
    queryFn: async () => {
      const { data, error } = await supabase.from('volunteers').select('id,name,status').eq('organization_id', orgId).eq('company_id', shift!.company_id).eq('status', 'activo').order('name');
      if (error) throw error; return data ?? [];
    },
  });
  const cmd = useDutyCommand(orgId, [['duty-shifts', orgId], ['duty-shift', orgId, shift?.id ?? '']]);
  if (!shift) return null;
  const names = new Map((vols.data ?? []).map(v => [v.id, v.name]));
  const run = (c: DutyCommand, ok: string, after?: () => void) => cmd.mutate(c, { onSuccess: () => { toast.success(ok); after?.(); } });
  const cancellable = ['borrador', 'publicado', 'en_curso'].includes(shift.status);
  const busy = cmd.isPending;

  return <Dialog open onOpenChange={o => !o && onClose()}><DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
    <DialogHeader><DialogTitle>{shift.name}</DialogTitle><DialogDescription>{fmt(shift.starts_at)} – {fmt(shift.ends_at)} · {shift.status}</DialogDescription></DialogHeader>
    {!canManage && <p role="status" className="text-sm text-muted-foreground">Consulta de supervisión. Para gestionar este turno necesita delegación del Emisor para la compañía.</p>}
    <section className="space-y-2"><h2 className="font-medium">Cupos y asignaciones</h2>
      {detail.isLoading ? <p className="text-sm text-muted-foreground">Cargando…</p> : detail.error ? <p role="alert" className="text-sm text-destructive">No se pudieron consultar los cupos.</p> :
        (detail.data?.slots ?? []).map(s => {
          const as = (detail.data?.assignments ?? []).filter(a => a.slot_id === s.id);
          const active = as.filter(a => a.status === 'propuesto' || a.status === 'confirmado').length;
          return <div key={s.id} className="rounded-md border border-border p-3 text-sm">
            <div className="flex flex-wrap justify-between gap-2"><span className="font-medium">{s.role_name} · {s.mode}</span><span>{active}/{s.capacity}</span></div>
            <ul className="mt-2 space-y-1">{as.map(a => <li key={a.id} className="flex justify-between gap-2"><span>{names.get(a.volunteer_id) ?? 'Voluntario'}</span><Badge variant="outline">{a.status}</Badge></li>)}</ul>
          </div>;
        })}
    </section>
    {canManage && <>
      {(shift.status === 'publicado' || shift.status === 'en_curso') && <section className="space-y-2 border-t border-border pt-3"><h2 className="font-medium">Asignar voluntario</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          <Select value={slotId || undefined} onValueChange={setSlotId}><SelectTrigger aria-label="Cupo"><SelectValue placeholder="Cupo" /></SelectTrigger><SelectContent>{(detail.data?.slots ?? []).map(s => <SelectItem key={s.id} value={s.id}>{s.role_name}</SelectItem>)}</SelectContent></Select>
          <Select value={volId || undefined} onValueChange={setVolId}><SelectTrigger aria-label="Voluntario"><SelectValue placeholder="Voluntario de la compañía" /></SelectTrigger><SelectContent>{(vols.data ?? []).map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}</SelectContent></Select>
        </div>
        <Button size="sm" disabled={!slotId || !volId || busy} onClick={() => run({ kind: 'assign', slotId, volunteerId: volId }, 'Voluntario asignado; queda pendiente su confirmación.', () => setVolId(''))}>Asignar</Button>
      </section>}
      <section className="space-y-2 border-t border-border pt-3">
        {shift.status === 'borrador' && <Button disabled={busy} onClick={() => run({ kind: 'publish', shiftId: shift.id, expected: 'borrador', reason: '' }, 'Turno publicado.')}>Publicar turno</Button>}
        {cancellable && <div className="space-y-2"><Label htmlFor="cancel-reason">Motivo de cancelación</Label><Input id="cancel-reason" maxLength={1000} value={reason} onChange={e => setReason(e.target.value)} />
          <Button variant="destructive" disabled={busy || reason.trim().length < 3} onClick={() => { if (window.confirm('¿Cancelar el turno? Las asignaciones activas quedarán retiradas.')) run({ kind: 'cancel', shiftId: shift.id, expected: shift.status as 'borrador' | 'publicado' | 'en_curso', reason: reason.trim() }, 'Turno cancelado.', onClose); }}>Cancelar turno</Button></div>}
      </section>
    </>}
  </DialogContent></Dialog>;
}

export function DelegationPanel({ orgId, companies }: { orgId: string; companies: DutyCompany[] }) {
  const isSuper = useQuery({ queryKey: ['is-superadmin'], queryFn: async () => (await supabase.rpc('is_superadmin')).data === true });
  const members = useQuery({
    queryKey: ['duty-members', orgId],
    queryFn: async () => {
      const [{ data: m, error }, { data: p }] = await Promise.all([
        supabase.from('organization_members').select('user_id,role,company_id').eq('organization_id', orgId).eq('status', 'active'),
        supabase.rpc('get_member_profiles'),
      ]);
      if (error) throw error;
      const names = new Map(((p ?? []) as { user_id: string; display_name: string }[]).map(x => [x.user_id, x.display_name]));
      return (m ?? []).map(x => ({ ...x, name: names.get(x.user_id) || 'Miembro sin nombre' }));
    },
  });
  // UI hint only: the server (guard_is_issuer) remains the authority. Reads the latest audited issuer event.
  const currentIssuer = useQuery({
    queryKey: ['duty-issuer', orgId],
    queryFn: async () => {
      const [{ data: u }, { data }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from('audit_log').select('new_data').eq('organization_id', orgId).eq('table_name', 'guard_permission_issuers').in('action', ['GUARD_ISSUER', 'GUARD_ISSUER_INVALIDATE']).order('created_at', { ascending: false }).limit(1),
      ]);
      const after = (data?.[0]?.new_data as { entity_after?: { user_id?: string; revoked_at?: string | null } } | undefined)?.entity_after;
      return { me: u.user?.id ?? null, issuerId: after && !after.revoked_at ? after.user_id ?? null : null };
    },
  });
  const cmd = useDutyCommand(orgId, [['duty-issuer', orgId]]);
  const [issuer, setIssuer] = useState({ target: '', grant: 'true', reason: '' });
  const [perm, setPerm] = useState({ company: '', target: '', action: 'manage', grant: 'true', reason: '' });
  const list = members.data ?? [];
  const label = (m: { name: string; role: string }) => `${m.name} · ${m.role}`;
  const issuerId = currentIssuer.data?.issuerId ?? null;
  const issuerName = issuerId ? list.find(m => m.user_id === issuerId)?.name ?? 'Administrador designado' : null;
  const iAmIssuer = !!issuerId && issuerId === currentIssuer.data?.me;
  const targets = list.filter(m => m.user_id !== currentIssuer.data?.me && (perm.action === 'manage' ? m.role === 'admin' && (!m.company_id || m.company_id === perm.company) : m.role === 'oficial' && (!m.company_id || m.company_id === perm.company)));

  return <div className="space-y-6">
    {isSuper.data && <section className="space-y-2 rounded-md border border-border p-4"><h2 className="font-medium">Emisor autorizado (superadministrador)</h2>
      <p className="text-sm text-muted-foreground">El Emisor debe ser un administrador del Cuerpo distinto de usted.</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <Select value={issuer.target || undefined} onValueChange={v => setIssuer(s => ({ ...s, target: v }))}><SelectTrigger aria-label="Administrador"><SelectValue placeholder="Administrador del Cuerpo" /></SelectTrigger><SelectContent>{list.filter(m => m.role === 'admin' && !m.company_id).map(m => <SelectItem key={m.user_id} value={m.user_id}>{label(m)}</SelectItem>)}</SelectContent></Select>
        <Select value={issuer.grant} onValueChange={v => setIssuer(s => ({ ...s, grant: v }))}><SelectTrigger aria-label="Acción"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="true">Designar</SelectItem><SelectItem value="false">Revocar</SelectItem></SelectContent></Select>
      </div>
      <Input aria-label="Motivo" placeholder="Motivo (obligatorio)" maxLength={1000} value={issuer.reason} onChange={e => setIssuer(s => ({ ...s, reason: e.target.value }))} />
      <Button size="sm" disabled={!issuer.target || issuer.reason.trim().length < 3 || cmd.isPending} onClick={() => cmd.mutate({ kind: 'setIssuer', targetUserId: issuer.target, grant: issuer.grant === 'true', reason: issuer.reason.trim() }, { onSuccess: () => { toast.success('Emisor actualizado.'); setIssuer({ target: '', grant: 'true', reason: '' }); } })}>Guardar</Button>
    </section>}
    <section className="space-y-2 rounded-md border border-border p-4"><h2 className="font-medium">Delegar permisos por compañía (Emisor)</h2>
      <p className="text-sm text-muted-foreground">Solo el Emisor autorizado puede delegar; el servidor rechaza cualquier otro intento.</p>
      <p role="status" className="text-sm">{issuerName ? <>Emisor vigente: <strong>{issuerName}</strong>{iAmIssuer ? ' (usted)' : ''}</> : 'No hay Emisor vigente designado.'}</p>
      {issuerName && !iAmIssuer && <p role="alert" className="text-sm text-destructive">Su cuenta no es el Emisor. Para delegar, inicie sesión con la cuenta de {issuerName}.</p>}
      <div className="grid gap-2 sm:grid-cols-2">
        <Select value={perm.company || undefined} onValueChange={v => setPerm(s => ({ ...s, company: v, target: '' }))}><SelectTrigger aria-label="Compañía"><SelectValue placeholder="Compañía" /></SelectTrigger><SelectContent>{companies.map(c => <SelectItem key={c.id} value={c.id}>{c.number}ª · {c.name}</SelectItem>)}</SelectContent></Select>
        <Select value={perm.action} onValueChange={v => setPerm(s => ({ ...s, action: v, target: '' }))}><SelectTrigger aria-label="Permiso"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="manage">Gestionar guardias</SelectItem><SelectItem value="validate_attendance">Validar asistencia</SelectItem></SelectContent></Select>
        <Select value={perm.target || undefined} onValueChange={v => setPerm(s => ({ ...s, target: v }))} disabled={!perm.company}><SelectTrigger aria-label="Persona"><SelectValue placeholder="Persona" /></SelectTrigger><SelectContent>{targets.map(m => <SelectItem key={m.user_id} value={m.user_id}>{label(m)}</SelectItem>)}</SelectContent></Select>
        <Select value={perm.grant} onValueChange={v => setPerm(s => ({ ...s, grant: v }))}><SelectTrigger aria-label="Acción"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="true">Otorgar</SelectItem><SelectItem value="false">Revocar</SelectItem></SelectContent></Select>
      </div>
      <Input aria-label="Motivo de delegación" placeholder="Motivo (obligatorio)" maxLength={1000} value={perm.reason} onChange={e => setPerm(s => ({ ...s, reason: e.target.value }))} />
      <Button size="sm" disabled={!iAmIssuer || !perm.company || !perm.target || perm.reason.trim().length < 3 || cmd.isPending} onClick={() => cmd.mutate({ kind: 'setPermission', companyId: perm.company, targetUserId: perm.target, action: perm.action as 'manage' | 'validate_attendance', grant: perm.grant === 'true', reason: perm.reason.trim() }, { onSuccess: () => { toast.success('Permiso actualizado.'); setPerm(s => ({ ...s, target: '', reason: '' })); } })}>Guardar</Button>
    </section>
  </div>;
}
