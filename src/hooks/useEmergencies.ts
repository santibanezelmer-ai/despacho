import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import type { Tables } from '@/integrations/supabase/types';

export type EmergencyRow = Tables<'emergencies'> & {
  emergency_keys: { code: string; name: string; color: string } | null;
};

export function useActiveEmergencies() {
  const { orgId } = useOrganization();
  return useQuery({
    queryKey: ['active-emergencies', orgId],
    queryFn: async () => {
      const q = supabase
        .from('emergencies')
        .select('*, emergency_keys(code, name, color)')
        .neq('status', 'finalizada')
        .order('created_at', { ascending: false });
      const { data, error } = await (q as any).eq('organization_id', orgId);
      if (error) throw error;

      const enriched = await Promise.all(
        (data ?? []).map(async (e: any) => {
          const { data: evData } = await supabase
            .from('emergency_vehicles')
            .select('vehicle_id, vehicles(code)')
            .eq('emergency_id', e.id);

          const { count: personnelCount } = await supabase
            .from('emergency_personnel')
            .select('id', { count: 'exact', head: true })
            .eq('emergency_id', e.id);

          return {
            ...e,
            vehicleCodes: (evData ?? []).map((ev: any) => ev.vehicles?.code).filter(Boolean) as string[],
            personnelCount: personnelCount ?? 0,
          };
        })
      );

      return enriched;
    },
    enabled: !!orgId,
    refetchInterval: 5000,
  });
}
