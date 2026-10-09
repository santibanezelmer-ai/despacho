import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { MOBILE_KEY_TO_STATUS, VEHICLE_STATUS_META } from '@/lib/vehicleOperationalStatus';
import { useVehicleOperationalStatus } from './useVehicleOperationalStatus';

export interface VehicleOperationalRequest {
  id: string;
  emergency_id: string;
  emergency_vehicle_id: string | null;
  vehicle_id: string;
  requested_status: string;
  reported_at: string;
  odometer_end: number | null;
}

/** Solicitudes de clave enviadas por Operix Móvil y aún sin confirmar (polling 5 s). */
export function usePendingOperationalRequests() {
  const { orgId } = useOrganization();
  return useQuery({
    queryKey: ['vehicle-operational-requests', orgId],
    enabled: !!orgId,
    refetchInterval: 5000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicle_operational_requests')
        .select('id, emergency_id, emergency_vehicle_id, vehicle_id, requested_status, reported_at, odometer_end')
        .eq('organization_id', orgId!)
        .eq('status', 'pendiente')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as VehicleOperationalRequest[];
    },
  });
}

/**
 * Confirmar o descartar una sugerencia del móvil. La consola mantiene la
 * prioridad: aceptar aplica la clave con la hora reportada por el móvil.
 */
export function useResolveOperationalRequest() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const changeStatus = useVehicleOperationalStatus();

  return useMutation({
    mutationFn: async ({ request, accept, vehicleCode }: { request: VehicleOperationalRequest; accept: boolean; vehicleCode: string }) => {
      // Reserva atómica: solo si sigue pendiente (evita doble aceptación entre operadores).
      const { data: claimed, error } = await supabase
        .from('vehicle_operational_requests')
        .update({ status: accept ? 'aceptada' : 'rechazada', resolved_at: new Date().toISOString(), resolved_by: user?.id ?? null })
        .eq('id', request.id)
        .eq('status', 'pendiente')
        .select('id')
        .maybeSingle();
      if (error) throw error;
      if (!claimed) throw new Error('La solicitud ya fue resuelta por otro operador');
      if (!accept) return { accepted: false, code: request.requested_status };

      const status = MOBILE_KEY_TO_STATUS[request.requested_status];
      if (status === 'en_cuartel') {
        // 6-10 exige kilometraje: se confirma el aviso y el operador libera el móvil con km.
        return { accepted: true, code: '6-10', needsRelease: true };
      }
      if (status && request.emergency_vehicle_id) {
        try {
          await changeStatus.mutateAsync({
            evId: request.emergency_vehicle_id,
            emergencyId: request.emergency_id,
            vehicleCode,
            status,
            at: request.reported_at,
            logSuffix: ' (reportado por Operix Móvil, confirmado por Central)',
            silent: true,
          });
        } catch (e) {
          // La clave no se pudo aplicar: devolver la solicitud a pendiente
          // para que no se pierda y el operador pueda reintentarla.
          await supabase
            .from('vehicle_operational_requests')
            .update({ status: 'pendiente', resolved_at: null, resolved_by: null })
            .eq('id', request.id)
            .eq('status', 'aceptada');
          throw e;
        }
      }
      return { accepted: true, code: request.requested_status };
    },
    onSuccess: (r, vars) => {
      qc.invalidateQueries({ queryKey: ['vehicle-operational-requests'] });
      if (!r.accepted) toast.info(`${vars.vehicleCode} · ${r.code} descartado`);
      else if ((r as any).needsRelease) {
        const km = vars.request.odometer_end != null ? ` (km reportado: ${vars.request.odometer_end})` : '';
        toast.info(`${vars.vehicleCode} reporta 6-10${km}. Regístralo con kilometraje en "Liberar móviles".`, { duration: 8000 });
      } else toast.success(`${vars.vehicleCode} · ${r.code} confirmado`);
    },
    onError: (e: Error) => {
      qc.invalidateQueries({ queryKey: ['vehicle-operational-requests'] });
      toast.error(e.message);
    },
  });
}

export { VEHICLE_STATUS_META };
