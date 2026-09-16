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

      // Enriquecido por lote: dos consultas en total, no dos por emergencia.
      const ids = (data ?? []).map((e: any) => e.id);

      const [{ data: evRows }, { data: perRows }] = ids.length
        ? await Promise.all([
            supabase
              .from('emergency_vehicles')
              .select('emergency_id, vehicle_id, released_at, vehicles(code)')
              .in('emergency_id', ids)
              .is('released_at', null),
            supabase
              .from('emergency_personnel')
              .select('emergency_id')
              .in('emergency_id', ids),
          ])
        : [{ data: [] as any[] }, { data: [] as any[] }];

      const codesByEmergency = new Map<string, Map<string, string>>();
      for (const ev of evRows ?? []) {
        const emgId = (ev as any).emergency_id as string;
        const id = (ev as any).vehicle_id as string | null;
        const code = (ev as any).vehicles?.code as string | undefined;
        if (!emgId || !id || !code) continue;
        if (!codesByEmergency.has(emgId)) codesByEmergency.set(emgId, new Map());
        const m = codesByEmergency.get(emgId)!;
        if (!m.has(id)) m.set(id, code);
      }

      const personnelByEmergency = new Map<string, number>();
      for (const p of perRows ?? []) {
        const emgId = (p as any).emergency_id as string;
        personnelByEmergency.set(emgId, (personnelByEmergency.get(emgId) ?? 0) + 1);
      }

      return (data ?? []).map((e: any) => ({
        ...e,
        vehicleCodes: Array.from((codesByEmergency.get(e.id) ?? new Map()).values()),
        personnelCount: personnelByEmergency.get(e.id) ?? 0,
      }));
    },
    enabled: !!orgId,
    refetchInterval: 5000,
  });
}
