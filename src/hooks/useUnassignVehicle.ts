import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface UnassignVehicleInput {
  emergencyId: string;
  vehicleId: string;
  code: string;
}

/**
 * Quita un móvil de una emergencia: elimina el personal asignado a ese móvil,
 * borra la asignación, libera el móvil si no está en otra emergencia activa
 * y deja registro en la bitácora de la emergencia.
 */
export function useUnassignVehicle() {
  const { orgId } = useOrganization();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ emergencyId, vehicleId, code }: UnassignVehicleInput) => {
      const { data: evRows, error: evFindErr } = await supabase
        .from('emergency_vehicles')
        .select('id')
        .eq('emergency_id', emergencyId)
        .eq('vehicle_id', vehicleId)
        .is('released_at', null);
      if (evFindErr) throw evFindErr;

      const evIds = (evRows ?? []).map(r => r.id);
      if (evIds.length === 0) throw new Error('El móvil ya no está asignado a esta emergencia');

      const { error: pErr } = await supabase
        .from('emergency_personnel')
        .delete()
        .in('emergency_vehicle_id', evIds);
      if (pErr) throw pErr;

      const { error: evErr } = await supabase.from('emergency_vehicles').delete().in('id', evIds);
      if (evErr) throw evErr;

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
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['emergency-vehicles-assigned', vars.emergencyId] });
      queryClient.invalidateQueries({ queryKey: ['emergency-vehicles-return', vars.emergencyId] });
      queryClient.invalidateQueries({ queryKey: ['emergency-personnel', vars.emergencyId] });
      queryClient.invalidateQueries({ queryKey: ['emergency-vehicle-personnel', vars.emergencyId] });
      queryClient.invalidateQueries({ queryKey: ['active-emergencies'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success(`Móvil ${vars.code} desasignado`);
    },
    onError: (err: Error) => toast.error(err.message || 'Error al eliminar la asignación'),
  });
}
