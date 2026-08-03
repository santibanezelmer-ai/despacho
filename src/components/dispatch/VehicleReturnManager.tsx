import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Home, Truck, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTimeFormat } from '@/hooks/useTimeFormat';

interface Props {
  emergencyId: string;
  emergencyStatus: string;
}

export default function VehicleReturnManager({ emergencyId, emergencyStatus }: Props) {
  const { formatTime } = useTimeFormat();
  const { orgId } = useOrganization();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [odometerInputs, setOdometerInputs] = useState<Record<string, string>>({});

  const { data: vehicles, isLoading } = useQuery({
    queryKey: ['emergency-vehicles-return', emergencyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('emergency_vehicles')
        .select('id, vehicle_id, odometer_start, odometer_end, released_at, vehicles(code, type, companies(name))')
        .eq('emergency_id', emergencyId);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!emergencyId,
  });

  const returnMutation = useMutation({
    mutationFn: async ({ evId, vehicleId, odometerEnd }: { evId: string; vehicleId: string; odometerEnd: number | null }) => {
      const update: Record<string, any> = {
        released_at: new Date().toISOString(),
      };
      if (odometerEnd !== null) update.odometer_end = odometerEnd;

      const { error: evErr } = await supabase
        .from('emergency_vehicles')
        .update(update)
        .eq('id', evId);
      if (evErr) throw evErr;

      // Set vehicle back to disponible and update odometer
      const vehUpdate: Record<string, any> = { status: 'disponible' as const };
      if (odometerEnd !== null) vehUpdate.odometer = odometerEnd;
      await supabase.from('vehicles').update(vehUpdate).eq('id', vehicleId);

      // Log
      await supabase.from('emergency_log').insert({
        emergency_id: emergencyId,
        organization_id: orgId!,
        message: `Móvil retornó a cuartel${odometerEnd ? ` (km: ${odometerEnd})` : ''}`,
        created_by: user?.id ?? null,
      });

      // Check if ALL vehicles have returned
      const { data: remaining } = await supabase
        .from('emergency_vehicles')
        .select('id')
        .eq('emergency_id', emergencyId)
        .is('released_at', null);

      // If this was the last one (remaining includes current before update propagates, so check <=1)
      if (!remaining || remaining.length === 0) {
        // All vehicles returned — update emergency to en_cuartel
        await supabase.from('emergencies').update({
          status: 'en_cuartel' as any,
          in_quarters_at: new Date().toISOString(),
        }).eq('id', emergencyId);

        await supabase.from('emergency_log').insert({
          emergency_id: emergencyId,
          organization_id: orgId!,
          message: 'Todos los móviles en cuartel — emergencia cerrada operativamente',
          created_by: user?.id ?? null,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emergency-vehicles-return', emergencyId] });
      queryClient.invalidateQueries({ queryKey: ['active-emergencies'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success('Móvil marcado en cuartel');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleReturn = (evId: string, vehicleId: string) => {
    const raw = odometerInputs[evId];
    const odometerEnd = raw ? parseInt(raw, 10) : null;
    if (raw && (isNaN(odometerEnd!) || odometerEnd! < 0)) {
      toast.error('Kilometraje inválido');
      return;
    }
    returnMutation.mutate({ evId, vehicleId, odometerEnd });
  };

  if (isLoading) return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;

  const allVehicles = vehicles ?? [];
  const returned = allVehicles.filter((v: any) => v.released_at);
  const pending = allVehicles.filter((v: any) => !v.released_at);

  // Show when emergency is controlada, finalizada or en_cuartel
  if (!['controlada', 'finalizada', 'en_cuartel'].includes(emergencyStatus)) return null;

  // Auto-close if finalizada with 0 vehicles or all already returned
  const canAutoClose = emergencyStatus === 'finalizada' && (allVehicles.length === 0 || pending.length === 0);

  const handleCloseEmergency = async () => {
    await supabase.from('emergencies').update({
      status: 'en_cuartel' as any,
      in_quarters_at: new Date().toISOString(),
    }).eq('id', emergencyId);

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
        <Home className="h-3.5 w-3.5" /> Retorno de Móviles
        <span className="ml-auto text-[10px] font-mono">
          {returned.length}/{allVehicles.length} en cuartel
        </span>
      </label>

      {canAutoClose && (
        <Button size="sm" className="w-full" onClick={handleCloseEmergency}>
          <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Cerrar Emergencia (En Cuartel)
        </Button>
      )}

      {/* Progress bar */}
      {allVehicles.length > 0 && (
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-success transition-all"
            style={{ width: `${(returned.length / allVehicles.length) * 100}%` }}
          />
        </div>
      )}

      {/* Pending vehicles */}
      {pending.length > 0 && (
        <div className="space-y-2">
          {pending.map((ev: any) => {
            const v = ev.vehicles;
            return (
              <div key={ev.id} className="rounded-md border border-warning/30 bg-warning/5 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-bold text-foreground flex items-center gap-1.5">
                    <Truck className="h-3.5 w-3.5 text-warning" />
                    {v?.code ?? '—'} · {v?.type ?? ''} {v?.companies?.name ? `(${v.companies.name})` : ''}
                  </span>
                  <span className="text-[10px] font-mono text-warning">PENDIENTE</span>
                </div>
                <div className="flex items-center gap-2">
                  {ev.odometer_start != null && (
                    <span className="text-[10px] text-muted-foreground font-mono">
                      Km salida: {ev.odometer_start}
                    </span>
                  )}
                  <Input
                    type="number"
                    placeholder="Km llegada"
                    value={odometerInputs[ev.id] ?? ''}
                    onChange={e => setOdometerInputs(prev => ({ ...prev, [ev.id]: e.target.value }))}
                    className="h-7 w-28 text-xs bg-muted/50"
                  />
                  <Button
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => handleReturn(ev.id, ev.vehicle_id)}
                    disabled={returnMutation.isPending}
                  >
                    {returnMutation.isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <><Home className="h-3 w-3 mr-1" /> En Cuartel</>
                    )}
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
        </div>
      )}

      {/* Returned vehicles */}
      {returned.length > 0 && (
        <div className="space-y-1">
          {returned.map((ev: any) => {
            const v = ev.vehicles;
            const kmTotal = ev.odometer_start != null && ev.odometer_end != null
              ? ev.odometer_end - ev.odometer_start
              : null;
            return (
              <div key={ev.id} className="flex items-center justify-between rounded-md bg-success/5 border border-success/20 px-3 py-2">
                <span className="text-xs font-mono text-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                  {v?.code ?? '—'}
                </span>
                <div className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground">
                  {ev.odometer_end != null && <span>Km: {ev.odometer_end}</span>}
                  {kmTotal != null && <span>({kmTotal} km)</span>}
                  <span>{formatTime(ev.released_at)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {allVehicles.length === 0 && (
        <p className="text-xs text-muted-foreground">Sin móviles asignados</p>
      )}
    </div>
  );
}
