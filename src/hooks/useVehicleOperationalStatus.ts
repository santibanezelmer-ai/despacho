import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  VEHICLE_STATUS_META,
  type VehicleOperationalStatus,
} from '@/lib/vehicleOperationalStatus';

interface Params {
  /** id de la fila emergency_vehicles (asignación individual del móvil). */
  evId: string;
  emergencyId: string;
  vehicleCode: string;
  status: VehicleOperationalStatus;
  /** Hora de referencia (p. ej. la que reportó Operix Móvil). */
  at?: string;
  /** Texto extra para la bitácora. */
  logSuffix?: string;
  silent?: boolean;
}

/**
 * Cambia la clave operativa de UN móvil asignado. No toca a los demás móviles
 * ni el estado general de la emergencia; sólo queda registrado en la bitácora.
 */
export function useVehicleOperationalStatus() {
  const { orgId } = useOrganization();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ evId, emergencyId, vehicleCode, status, at, logSuffix }: Params) => {
      const meta = VEHICLE_STATUS_META[status];
      const now = at ?? new Date().toISOString();

      const update: Record<string, any> = {
        operational_status: status,
        status_updated_at: now,
      };
      if (status === 'en_lugar') update.on_scene_at = now;
      if (status === 'controlada') update.controlled_at = now;
      if (status === 'retirandose') update.withdrawing_at = now;

      const { error } = await supabase
        .from('emergency_vehicles')
        .update(update)
        .eq('id', evId);
      if (error) throw error;

      // La consola manda: cualquier sugerencia pendiente del móvil queda reemplazada.
      await supabase
        .from('vehicle_operational_requests')
        .update({ status: 'reemplazada', resolved_at: new Date().toISOString(), resolved_by: user?.id ?? null })
        .eq('emergency_vehicle_id', evId)
        .eq('status', 'pendiente');

      if (orgId) {
        await supabase.from('emergency_log').insert({
          emergency_id: emergencyId,
          organization_id: orgId,
          message: `Móvil ${vehicleCode} marcó clave ${meta.code} — ${meta.description}${logSuffix ?? ''}`,
          created_by: user?.id ?? null,
        });
      }

      return meta;
    },
    onSuccess: (meta, vars) => {
      queryClient.invalidateQueries({ queryKey: ['active-emergencies'] });
      queryClient.invalidateQueries({ queryKey: ['emergency-vehicles-assigned', vars.emergencyId] });
      queryClient.invalidateQueries({ queryKey: ['emergency-vehicles-return', vars.emergencyId] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-operational-requests'] });
      if (!vars.silent) toast.success(`${vars.vehicleCode} · ${meta.code} ${meta.label}`);
    },
    onError: (err: Error) => toast.error(err.message || 'No se pudo cambiar la clave del móvil'),
  });
}
