import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type ReturnVehicleRow = {
  id: string;
  vehicle_id: string;
  odometer_start: number | null;
  odometer_end: number | null;
  released_at: string | null;
  vehicles: { code: string; type: string; status?: string; companies?: { name: string } | null } | null;
};

/**
 * Móviles asignados a una emergencia con su estado de retorno.
 * Comparte la misma queryKey que el gestor de retornos para no duplicar consultas.
 */
export function useEmergencyReturnVehicles(emergencyId: string) {
  return useQuery({
    queryKey: ['emergency-vehicles-return', emergencyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('emergency_vehicles')
        .select('id, vehicle_id, odometer_start, odometer_end, released_at, vehicles(code, type, status, companies(name))')
        .eq('emergency_id', emergencyId);
      if (error) throw error;
      return (data ?? []) as unknown as ReturnVehicleRow[];
    },
    enabled: !!emergencyId,
    refetchInterval: 5000,
  });
}
