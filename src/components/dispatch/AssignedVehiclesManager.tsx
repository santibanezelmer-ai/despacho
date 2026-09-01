import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/contexts/AuthContext';
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
import { toast } from 'sonner';

interface Props {
  emergencyId: string;
}

interface Target {
  evId: string;
  vehicleId: string;
  code: string;
}

export default function AssignedVehiclesManager({ emergencyId }: Props) {
  const { orgId } = useOrganization();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [target, setTarget] = useState<Target | null>(null);

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

  const unassign = useMutation({
    mutationFn: async ({ evId, vehicleId, code }: Target) => {
      // Quitar personal asignado a ese móvil en la emergencia
      const { error: pErr } = await supabase
        .from('emergency_personnel')
        .delete()
        .eq('emergency_vehicle_id', evId);
      if (pErr) throw pErr;

      const { error: evErr } = await supabase
        .from('emergency_vehicles')
        .delete()
        .eq('id', evId);
      if (evErr) throw evErr;

      // Liberar el móvil si no está asignado a otra emergencia activa
      const { data: otherActive } = await supabase
        .from('emergency_vehicles')
        .select('id')
        .eq('vehicle_id', vehicleId)
        .is('released_at', null);
      if (!otherActive || otherActive.length === 0) {
        await supabase.from('vehicles').update({ status: 'disponible' as const }).eq('id', vehicleId);
      }

      await supabase.from('emergency_log').insert({
        emergency_id: emergencyId,
        organization_id: orgId!,
        message: `Asignación eliminada: móvil ${code} desasignado de la emergencia`,
        created_by: user?.id ?? null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emergency-vehicles-assigned', emergencyId] });
      queryClient.invalidateQueries({ queryKey: ['emergency-vehicles-return', emergencyId] });
      queryClient.invalidateQueries({ queryKey: ['emergency-personnel', emergencyId] });
      queryClient.invalidateQueries({ queryKey: ['emergency-vehicle-personnel', emergencyId] });
      queryClient.invalidateQueries({ queryKey: ['active-emergencies'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success('Asignación eliminada');
      setTarget(null);
    },
    onError: (err: Error) => toast.error(err.message || 'Error al eliminar la asignación'),
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
                  onClick={() => setTarget({ evId: ev.id, vehicleId: ev.vehicle_id, code: v?.code ?? '—' })}
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
                if (target) unassign.mutate(target);
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
