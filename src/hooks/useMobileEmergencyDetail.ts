import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';

export function useMobileEmergencyDetail(id: string | undefined) {
  const { orgId } = useOrganization();

  return useQuery({
    queryKey: ['mobile-emergency-detail', id],
    queryFn: async () => {
      // Fetch emergency
      const { data: emergency, error } = await (supabase as any)
        .from('emergencies')
        .select('*, emergency_keys(code, name, color)')
        .eq('id', id)
        .single();
      if (error) throw error;

      // Verify org ownership
      if (emergency.organization_id !== orgId) {
        throw new Error('ACCESS_DENIED');
      }

      // Vehicles
      const { data: vehicles } = await supabase
        .from('emergency_vehicles')
        .select('*, vehicles(code, type, status, companies(name))')
        .eq('emergency_id', id!);

      // Personnel
      const { data: personnel } = await supabase
        .from('emergency_personnel')
        .select('*, volunteers(name, phone)')
        .eq('emergency_id', id!);

      // Log
      const { data: logs } = await supabase
        .from('emergency_log')
        .select('*')
        .eq('emergency_id', id!)
        .order('created_at', { ascending: true });

      // Nearby hydrants (within ~2km using simple box filter)
      let nearbyHydrants: any[] = [];
      if (emergency.latitude && emergency.longitude) {
        const delta = 0.02; // ~2km
        const lat = emergency.latitude;
        const lng = emergency.longitude;

        const { data: orgHydrants } = await (supabase as any)
          .from('hydrants')
          .select('*')
          .eq('organization_id', orgId)
          .gte('latitude', lat - delta)
          .lte('latitude', lat + delta)
          .gte('longitude', lng - delta)
          .lte('longitude', lng + delta)
          .limit(20);

        const { data: sharedH } = await supabase
          .from('shared_hydrants')
          .select('*')
          .gte('latitude', lat - delta)
          .lte('latitude', lat + delta)
          .gte('longitude', lng - delta)
          .lte('longitude', lng + delta)
          .limit(30);

        // Calculate distances and merge
        const calcDist = (hLat: number, hLng: number) => {
          const R = 6371000;
          const dLat = ((hLat - lat) * Math.PI) / 180;
          const dLng = ((hLng - lng) * Math.PI) / 180;
          const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat * Math.PI) / 180) * Math.cos((hLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
          return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        };

        const all = [
          ...(orgHydrants ?? []).map((h: any) => ({ ...h, source: 'org', distance: calcDist(h.latitude, h.longitude) })),
          ...(sharedH ?? []).map((h: any) => ({ ...h, source: 'shared', distance: calcDist(h.latitude, h.longitude) })),
        ];

        nearbyHydrants = all.sort((a, b) => a.distance - b.distance).slice(0, 15);
      }

      return {
        emergency,
        vehicles: vehicles ?? [],
        personnel: personnel ?? [],
        logs: logs ?? [],
        nearbyHydrants,
      };
    },
    enabled: !!id && !!orgId,
    refetchInterval: 10000,
  });
}
