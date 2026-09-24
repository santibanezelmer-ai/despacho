import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Activity, AlertTriangle, Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const DAY = 86_400_000;
const rel = (d: number | null) => {
  if (!d) return 'Sin actividad';
  const diff = Date.now() - d;
  if (diff < 3_600_000) return `hace ${Math.max(1, Math.round(diff / 60_000))} min`;
  if (diff < DAY) return `hace ${Math.round(diff / 3_600_000)} h`;
  return `hace ${Math.round(diff / DAY)} d`;
};

export default function SuperadminHealth() {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['superadmin-health'],
    refetchInterval: 60_000,
    queryFn: async () => {
      const since7 = new Date(Date.now() - 7 * DAY).toISOString();
      const sb = supabase as any;
      const [orgs, members, emgs, errs, devices, vehicles, tickets, limits] = await Promise.all([
        sb.from('organizations').select('id, name, status, is_demo, demo_expires_at, created_at').order('name'),
        sb.from('organization_members').select('organization_id, status'),
        sb.from('emergencies').select('organization_id, created_at, status'),
        sb.from('audit_log').select('organization_id, action, created_at, new_data').like('action', 'client_error%').gte('created_at', since7).order('created_at', { ascending: false }).limit(1000),
        sb.from('device_tokens').select('organization_id, user_id, last_seen_at'),
        sb.from('vehicles').select('organization_id'),
        sb.from('support_tickets').select('organization_id, status').in('status', ['abierto', 'en_proceso']),
        sb.rpc('get_demo_limits'),
      ]);
      const max = limits.data?.max_emergencies ?? 20;
      const rows = (orgs.data ?? []).map((o: any) => {
        const e = (emgs.data ?? []).filter((x: any) => x.organization_id === o.id);
        const er = (errs.data ?? []).filter((x: any) => x.organization_id === o.id);
        const dv = (devices.data ?? []).filter((x: any) => x.organization_id === o.id);
        const lastEmg = Math.max(0, ...e.map((x: any) => +new Date(x.created_at)));
        const lastDev = Math.max(0, ...dv.map((x: any) => +new Date(x.last_seen_at)));
        const lastActivity = Math.max(lastEmg, lastDev) || null;
        const activeUsers = new Set(dv.filter((x: any) => +new Date(x.last_seen_at) > Date.now() - 7 * DAY).map((x: any) => x.user_id)).size;
        const memberCount = (members.data ?? []).filter((m: any) => m.organization_id === o.id && m.status === 'active').length;
        const vehicleCount = (vehicles.data ?? []).filter((v: any) => v.organization_id === o.id).length;
        const openTickets = (tickets.data ?? []).filter((t: any) => t.organization_id === o.id).length;
        const stuck = e.filter((x: any) => !['finalizada', 'en_cuartel'].includes(x.status) && +new Date(x.created_at) < Date.now() - DAY).length;
        const alerts: { level: 'danger' | 'warn'; text: string }[] = [];
        if (o.status === 'suspended') alerts.push({ level: 'danger', text: 'Organización suspendida' });
        if (o.is_demo && o.demo_expires_at && +new Date(o.demo_expires_at) < Date.now()) alerts.push({ level: 'danger', text: 'Demo vencida' });
        else if (o.is_demo && o.demo_expires_at && +new Date(o.demo_expires_at) < Date.now() + 3 * DAY) alerts.push({ level: 'warn', text: 'Demo vence en ≤3 días' });
        if (o.is_demo && e.length >= max) alerts.push({ level: 'danger', text: 'Límite de emergencias demo alcanzado' });
        if (er.length >= 5) alerts.push({ level: 'danger', text: `${er.length} errores en 7 días` });
        else if (er.length > 0) alerts.push({ level: 'warn', text: `${er.length} error(es) en 7 días` });
        if (stuck) alerts.push({ level: 'warn', text: `${stuck} emergencia(s) abiertas hace más de 24 h` });
        if (!lastActivity || lastActivity < Date.now() - 7 * DAY) alerts.push({ level: 'warn', text: 'Sin actividad en 7 días' });
        if (vehicleCount === 0) alerts.push({ level: 'warn', text: 'Sin móviles registrados' });
        if (dv.length === 0) alerts.push({ level: 'warn', text: 'Sin dispositivos con notificaciones' });
        if (openTickets) alerts.push({ level: 'warn', text: `${openTickets} ticket(s) abiertos` });
        return { ...o, emergencies: e.length, max, errors: er.slice(0, 3), errorCount: er.length, lastActivity, activeUsers, memberCount, vehicleCount, alerts };
      });
      const score = (r: any) => r.alerts.filter((a: any) => a.level === 'danger').length * 10 + r.alerts.length;
      return rows.sort((a: any, b: any) => score(b) - score(a));
    },
  });

  const filtered = useMemo(() => (data ?? []).filter((o: any) => o.name.toLowerCase().includes(search.toLowerCase())), [data, search]);

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-foreground"><Activity className="h-5 w-5 text-info" /> Salud de organizaciones</h1>
          <p className="text-xs text-muted-foreground">Ordenadas por gravedad. Revisa aquí antes de atender un soporte. Se actualiza cada minuto.</p>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar organización..." className="h-9 pl-8 text-xs" />
        </div>
      </div>

      {isLoading ? <Loader2 className="mx-auto h-6 w-6 animate-spin text-info" /> : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((o: any) => {
            const danger = o.alerts.some((a: any) => a.level === 'danger');
            return (
              <div key={o.id} className={`rounded-lg border bg-card p-3 space-y-2 ${danger ? 'border-destructive/50' : o.alerts.length ? 'border-warning/40' : 'border-success/40'}`}>
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-foreground">{o.name}</p>
                  <Badge variant="outline" className={o.is_demo ? 'border-warning/40 text-warning' : 'border-success/40 text-success'}>{o.is_demo ? 'Demo' : 'Oficial'}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                  <span className="text-muted-foreground">Última actividad</span><span className="text-foreground">{rel(o.lastActivity)}</span>
                  <span className="text-muted-foreground">Usuarios activos (7 d)</span><span className="text-foreground">{o.activeUsers} / {o.memberCount} miembros</span>
                  <span className="text-muted-foreground">Emergencias</span><span className="text-foreground">{o.emergencies}{o.is_demo ? ` / ${o.max}` : ''}</span>
                  <span className="text-muted-foreground">Móviles</span><span className="text-foreground">{o.vehicleCount}</span>
                  <span className="text-muted-foreground">Errores (7 d)</span><span className={o.errorCount ? 'text-destructive' : 'text-foreground'}>{o.errorCount}</span>
                </div>
                {o.errors.length > 0 && (
                  <div className="space-y-0.5 rounded bg-muted/40 p-1.5">
                    {o.errors.map((e: any, i: number) => (
                      <p key={i} className="truncate text-[10px] font-mono text-muted-foreground" title={e.new_data?.message}>
                        {new Date(e.created_at).toLocaleString('es-CL')} · {e.action.replace('client_error:', '')} · {e.new_data?.message ?? ''}
                      </p>
                    ))}
                  </div>
                )}
                {o.alerts.length === 0 ? <p className="text-xs text-success">Sin alertas</p> : (
                  <ul className="space-y-0.5">
                    {o.alerts.map((a: any, i: number) => (
                      <li key={i} className={`flex items-center gap-1 text-xs ${a.level === 'danger' ? 'text-destructive' : 'text-warning'}`}>
                        <AlertTriangle className="h-3 w-3 shrink-0" /> {a.text}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
