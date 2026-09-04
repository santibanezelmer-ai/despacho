import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';

export function useMobileEmergencies(filter: 'all' | 'live' | 'finished' = 'all') {
  const { orgId } = useOrganization();

  return useQuery({
    queryKey: ['mobile-emergencies', orgId, filter],
    queryFn: async () => {
      let q = supabase
        .from('emergencies')
        .select('*, emergency_keys(code, name, color)')
        .order('created_at', { ascending: false })
        .limit(100);

      q = (q as any).eq('organization_id', orgId);

      if (filter === 'live') {
        q = (q as any).neq('status', 'finalizada');
      } else if (filter === 'finished') {
        q = (q as any).eq('status', 'finalizada');
      }

      const { data, error } = await q;
      if (error) throw error;

      // Enrich with vehicle codes and personnel count
      const enriched = await Promise.all(
        (data ?? []).map(async (e: any) => {
          const { data: evData } = await supabase
            .from('emergency_vehicles')
            .select('vehicle_id, released_at, vehicles(code)')
            .eq('emergency_id', e.id)
            .is('released_at', null);

          const { count } = await supabase
            .from('emergency_personnel')
            .select('id', { count: 'exact', head: true })
            .eq('emergency_id', e.id);

          const codes = new Map<string, string>();
          for (const ev of evData ?? []) {
            const id = (ev as any).vehicle_id as string | null;
            const code = (ev as any).vehicles?.code as string | undefined;
            if (!id || !code || codes.has(id)) continue;
            codes.set(id, code);
          }

          return {
            ...e,
            vehicleCodes: Array.from(codes.values()),
            personnelCount: count ?? 0,
          };
        })
      );

      return enriched;
    },
    enabled: !!orgId,
    refetchInterval: 5000,
  });
}
