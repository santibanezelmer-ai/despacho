import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TablesUpdate } from '@/integrations/supabase/types';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  VEHICLE_STATUS_META,
  EMERGENCY_STATUS_LABEL,
  EMERGENCY_STATUS_TIMESTAMP,
  emergencyStatusFromVehicle,
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

      const update: TablesUpdate<'emergency_vehicles'> = {
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

      // La consola reemplaza claves pendientes, no los pre-informes independientes.
      await supabase
        .from('vehicle_operational_requests')
        .update({ status: 'reemplazada', resolved_at: new Date().toISOString(), resolved_by: user?.id ?? null })
        .eq('emergency_vehicle_id', evId)
        .eq('status', 'pendiente')
        .neq('requested_status', 'PRE-INFORME');

      if (orgId) {
        await supabase.from('emergency_log').insert({
          emergency_id: emergencyId,
          organization_id: orgId,
          message: `Móvil ${vehicleCode} marcó clave ${meta.code} — ${meta.description}${logSuffix ?? ''}`,
          created_by: user?.id ?? null,
        });
      }

      // Sincroniza el estado general de la emergencia (solo avanza, nunca finaliza).
      const { data: em } = await supabase
        .from('emergencies').select('status').eq('id', emergencyId).maybeSingle();
      const next = em ? emergencyStatusFromVehicle(em.status, status) : null;
      if (next && em) {
        const emUpdate: TablesUpdate<'emergencies'> = { status: next as TablesUpdate<'emergencies'>['status'], [EMERGENCY_STATUS_TIMESTAMP[next]]: now };
        const { error: e2 } = await supabase
          .from('emergencies').update(emUpdate).eq('id', emergencyId).eq('status', em.status);
        if (!e2 && orgId) {
          await supabase.from('emergency_log').insert({
            emergency_id: emergencyId,
            organization_id: orgId,
            message: `Emergencia pasó a ${EMERGENCY_STATUS_LABEL[next]} por clave ${meta.code} de ${vehicleCode}`,
            created_by: user?.id ?? null,
          });
        }
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
