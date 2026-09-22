import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type CrewRoleRow = {
  emergency_vehicle_id: string | null;
  role: string | null;
};

/**
 * Roles de tripulación asignados en una emergencia (conductor / oficial a cargo).
 * Se usa para validar el cierre de la emergencia sin duplicar la lógica de asignación.
 */
export function useEmergencyCrewRoles(emergencyId: string) {
  return useQuery({
    queryKey: ['emergency-crew-roles', emergencyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('emergency_personnel')
        .select('emergency_vehicle_id, role')
        .eq('emergency_id', emergencyId);
      if (error) throw error;
      return (data ?? []) as CrewRoleRow[];
    },
    enabled: !!emergencyId,
    refetchInterval: 5000,
  });
}
