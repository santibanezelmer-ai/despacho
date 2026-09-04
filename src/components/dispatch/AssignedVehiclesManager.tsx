import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, Truck, Trash2 } from 'lucide-react';
import { useUnassignVehicle } from '@/hooks/useUnassignVehicle';

interface Props {
  emergencyId: string;
}

interface Target {
  vehicleId: string;
  code: string;
}

export default function AssignedVehiclesManager({ emergencyId }: Props) {
  const [target, setTarget] = useState<Target | null>(null);
  const unassign = useUnassignVehicle();

  const { data: assigned, isLoading } = useQuery({
    queryKey: ['emergency-vehicles-assigned', emergencyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('emergency_vehicles')
        .select('id, vehicle_id, released_at, vehicles(code, type, companies(name))')
        .eq('emergency_id', emergencyId)
        .is('released_at', null);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!emergencyId,
    refetchInterval: 5000,
  });

  if (isLoading) return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;

  const list = assigned ?? [];

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Truck className="h-3.5 w-3.5" /> Móviles Asignados
        <span className="ml-auto text-[10px] font-mono">{list.length}</span>
      </label>

      {list.length === 0 ? (
        <p className="text-xs text-muted-foreground">Sin móviles asignados</p>
      ) : (
        <div className="space-y-1">
          {list.map((ev: any) => {
            const v = ev.vehicles;
            return (
              <div
                key={ev.id}
                className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/20 px-3 py-2"
              >
                <span className="text-xs font-mono text-foreground truncate">
                  {v?.code ?? '—'} · {v?.type ?? ''}
                  {v?.companies?.name ? ` (${v.companies.name})` : ''}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setTarget({ vehicleId: ev.vehicle_id, code: v?.code ?? '—' })}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!target} onOpenChange={open => { if (!open) setTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar asignación del móvil {target?.code}?</AlertDialogTitle>
            <AlertDialogDescription>
              Se quitará el móvil {target?.code} de esta emergencia junto con el personal asignado a él.
              El móvil volverá a estado disponible y la acción quedará registrada en la bitácora de la emergencia.
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={unassign.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={unassign.isPending}
              onClick={e => {
                e.preventDefault();
                if (target) {
                  unassign.mutate(
                    { emergencyId, vehicleId: target.vehicleId, code: target.code },
                    { onSettled: () => setTarget(null) }
                  );
                }
              }}
            >
              {unassign.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Trash2 className="mr-1 h-4 w-4" />}
              Eliminar asignación
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
