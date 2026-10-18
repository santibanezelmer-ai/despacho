import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Home, Truck, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useTimeFormat } from '@/hooks/useTimeFormat';
import { useEmergencyReturnVehicles } from '@/hooks/useEmergencyReturnVehicles';
import { parseReturnOdometer, returnVehicleToQuarters, runSequential, type BatchResult } from '@/lib/vehicleReturn';

interface Props {
  emergencyId: string;
  emergencyStatus: string;
  /** Mostrar aunque la emergencia no esté controlada/finalizada (validación previa al cierre). */
  forceVisible?: boolean;
  /** Oculta el botón de cierre propio (el cierre lo maneja el diálogo de finalización). */
  hideCloseButton?: boolean;
  /** Compatibilidad: la emergencia nunca se cierra sola al liberar móviles. */
  deferQuarters?: boolean;
}

export default function VehicleReturnManager({ emergencyId, emergencyStatus, forceVisible, hideCloseButton }: Props) {
  const { formatTime } = useTimeFormat();
  const { orgId } = useOrganization();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [odometerInputs, setOdometerInputs] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [confirming, setConfirming] = useState(false);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<BatchResult[] | null>(null);
  const busy = useRef(false);

  const { data: vehicles, isLoading } = useEmergencyReturnVehicles(emergencyId);

  if (isLoading) return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;

  const allVehicles = vehicles ?? [];
  const returned = allVehicles.filter(v => v.released_at);
  const pending = allVehicles.filter(v => !v.released_at);

  if (!forceVisible && !['controlada', 'finalizada', 'en_cuartel'].includes(emergencyStatus)) return null;

  const chosen = pending.filter(v => selected[v.id]).map(v => ({
    ev: v,
    code: v.vehicles?.code ?? 'Móvil',
    check: parseReturnOdometer(odometerInputs[v.id], v.odometer_start),
  }));
  const invalid = chosen.filter(c => !c.check.ok);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['emergency-vehicles-return', emergencyId] });
    queryClient.invalidateQueries({ queryKey: ['emergency-vehicles-assigned', emergencyId] });
    queryClient.invalidateQueries({ queryKey: ['active-emergencies'] });
    queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    queryClient.invalidateQueries({ queryKey: ['vehicle-operational-requests'] });
  };

  /** Ejecuta 6-10 para la lista dada; bloquea envíos duplicados mientras corre. */
  const execute = async (items: typeof chosen) => {
    if (busy.current || !orgId) return;
    busy.current = true;
    setRunning(true);
    try {
      const res = await runSequential(items, c => returnVehicleToQuarters({
        evId: c.ev.id,
        vehicleId: c.ev.vehicle_id,
        code: c.code,
        odometerEnd: (c.check as { ok: true; value: number }).value,
        emergencyId,
        orgId,
        userId: user?.id ?? null,
      }));
      setResults(res);
      const okCount = res.filter(r => r.ok).length;
      const failed = res.length - okCount;
      if (failed === 0) toast.success(`${okCount} móvil(es) en cuartel (6-10)`);
      else toast.error(`${failed} de ${res.length} móvil(es) no se guardaron. Revise el detalle.`);
      setSelected(prev => {
        const next = { ...prev };
        res.forEach((r, i) => { if (r.ok) delete next[items[i].ev.id]; });
        return next;
      });
    } finally {
      busy.current = false;
      setRunning(false);
      setConfirming(false);
      refresh();
    }
  };

  const handleSingle = (v: (typeof pending)[number]) => {
    const check = parseReturnOdometer(odometerInputs[v.id], v.odometer_start);
    if (check.ok === false) { toast.error(check.error); return; }
    void execute([{ ev: v, code: v.vehicles?.code ?? 'Móvil', check }]);
  };

  const canAutoClose =
    !hideCloseButton && emergencyStatus === 'finalizada' && (allVehicles.length === 0 || pending.length === 0);

  const handleCloseEmergency = async () => {
    if (!window.confirm('¿Cerrar definitivamente la emergencia? Dejará de estar activa.')) return;
    const { data, error } = await supabase.from('emergencies').update({
      status: 'en_cuartel' as any,
      in_quarters_at: new Date().toISOString(),
    }).eq('id', emergencyId).eq('status', 'finalizada').select('id');
    if (error || !data?.length) { toast.error('No se pudo cerrar la emergencia'); return; }
    await supabase.from('emergency_log').insert({
      emergency_id: emergencyId,
      organization_id: orgId!,
      message: 'Emergencia cerrada — todos los móviles en cuartel',
      created_by: user?.id ?? null,
    });
    queryClient.invalidateQueries({ queryKey: ['active-emergencies'] });
    toast.success('Emergencia cerrada');
  };

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Home className="h-3.5 w-3.5" /> Retorno de Móviles (6-10)
        <span className="ml-auto text-[10px] font-mono">
          {returned.length}/{allVehicles.length} en cuartel
        </span>
      </label>

      {canAutoClose && (
        <Button size="sm" className="w-full" onClick={handleCloseEmergency}>
          <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Cerrar Emergencia (En Cuartel)
        </Button>
      )}

      {allVehicles.length > 0 && (
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full bg-success transition-all" style={{ width: `${(returned.length / allVehicles.length) * 100}%` }} />
        </div>
      )}

      {pending.length > 0 && (
        <div className="space-y-2">
          {pending.length > 1 && (
            <p className="text-[10px] text-muted-foreground">
              Marque los móviles que regresaron, ingrese su km y regístrelos juntos. Los no marcados quedan como están.
            </p>
          )}
          {pending.map(ev => {
            const v = ev.vehicles;
            return (
              <div key={ev.id} className="rounded-md border border-warning/30 bg-warning/5 p-3">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-mono font-bold text-foreground flex items-center gap-1.5 cursor-pointer">
                    <Checkbox
                      checked={!!selected[ev.id]}
                      disabled={running}
                      onCheckedChange={c => setSelected(prev => ({ ...prev, [ev.id]: c === true }))}
                      aria-label={`Seleccionar ${v?.code ?? 'móvil'} para 6-10`}
                    />
                    <Truck className="h-3.5 w-3.5 text-warning" />
                    {v?.code ?? '—'} · {v?.type ?? ''} {v?.companies?.name ? `(${v.companies.name})` : ''}
                  </label>
                  <span className="text-[10px] font-mono text-warning">PENDIENTE</span>
                </div>
                <div className="flex items-center gap-2">
                  {ev.odometer_start != null && (
                    <span className="text-[10px] text-muted-foreground font-mono">Km salida: {ev.odometer_start}</span>
                  )}
                  <Input
                    type="number"
                    placeholder="Km llegada"
                    value={odometerInputs[ev.id] ?? ''}
                    onChange={e => setOdometerInputs(prev => ({ ...prev, [ev.id]: e.target.value }))}
                    className="h-7 w-28 text-xs bg-muted/50"
                  />
                  <Button size="sm" className="h-7 text-xs" onClick={() => handleSingle(ev)} disabled={running}>
                    {running ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Home className="h-3 w-3 mr-1" /> En Cuartel</>}
                  </Button>
                </div>
                {ev.odometer_start != null && odometerInputs[ev.id] && (
                  <p className="mt-1 text-[10px] text-muted-foreground font-mono">
                    Recorrido estimado: {Math.max(0, parseInt(odometerInputs[ev.id], 10) - ev.odometer_start)} km
                  </p>
                )}
              </div>
            );
          })}

          {chosen.length > 0 && !confirming && (
            <Button size="sm" variant="outline" className="w-full" disabled={running} onClick={() => setConfirming(true)}>
              <Home className="h-3.5 w-3.5 mr-1.5" /> Registrar 6-10 para {chosen.length} móvil(es) seleccionado(s)
            </Button>
          )}

          {confirming && (
            <div role="alertdialog" aria-label="Confirmar retorno a cuartel" className="rounded-md border border-primary/40 bg-primary/5 p-3 space-y-2">
              <p className="text-xs font-semibold text-foreground">Confirmar 6-10 — en cuartel</p>
              <ul className="space-y-1 text-xs font-mono">
                {chosen.map(c => (
                  <li key={c.ev.id} className={c.check.ok ? 'text-foreground' : 'text-destructive'}>
                    {c.code}: {c.check.ok === true ? `km ${c.check.value}` : c.check.error}
                  </li>
                ))}
              </ul>
              {invalid.length > 0 && (
                <p className="text-[11px] text-destructive">Corrija el kilometraje de los móviles marcados en rojo.</p>
              )}
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" disabled={running} onClick={() => setConfirming(false)}>Volver</Button>
                <Button size="sm" disabled={running || invalid.length > 0} onClick={() => execute(chosen)}>
                  {running ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1" />}
                  Confirmar {chosen.length}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {results && results.some(r => !r.ok) && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-2 space-y-1">
          <p className="text-[11px] font-semibold text-destructive">Resultado del último registro</p>
          {results.map(r => (
            <p key={r.code} className={`flex items-center gap-1.5 text-[11px] font-mono ${r.ok ? 'text-success' : 'text-destructive'}`}>
              {r.ok ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
              {r.code}: {r.ok ? 'en cuartel' : r.error}
            </p>
          ))}
        </div>
      )}

      {returned.length > 0 && (
        <div className="space-y-1">
          {returned.map(ev => {
            const v = ev.vehicles;
            const kmTotal = ev.odometer_start != null && ev.odometer_end != null ? ev.odometer_end - ev.odometer_start : null;
            return (
              <div key={ev.id} className="flex items-center justify-between rounded-md bg-success/5 border border-success/20 px-3 py-2">
                <span className="text-xs font-mono text-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                  {v?.code ?? '—'}
                </span>
                <div className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground">
                  {ev.odometer_end != null && <span>Km: {ev.odometer_end}</span>}
                  {kmTotal != null && <span>({kmTotal} km)</span>}
                  <span>{formatTime(ev.released_at!)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {allVehicles.length === 0 && <p className="text-xs text-muted-foreground">Sin móviles asignados</p>}
    </div>
  );
}
