import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';

type UseVehiclesOptions = { refetchInterval?: number };

export function useVehicles(options: UseVehiclesOptions = {}) {
  const { orgId } = useOrganization();
  return useQuery({
    queryKey: ['vehicles', orgId],
    queryFn: async () => {
      const q = supabase.from('vehicles').select('*, companies(name)');
      const { data, error } = await (q as any).eq('organization_id', orgId).order('code');
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
    refetchInterval: options.refetchInterval,
  });
}
