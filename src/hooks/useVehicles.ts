import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useOfflineCache } from '@/hooks/useOfflineCache';

type UseVehiclesOptions = { refetchInterval?: number };

export function useVehicles(options: UseVehiclesOptions = {}) {
  const { orgId } = useOrganization();
  const { isOnline } = useOnlineStatus();

  const query = useQuery({
    queryKey: ['vehicles', orgId],
    queryFn: async () => {
      const q = supabase.from('vehicles').select('*, companies(name)');
      const { data, error } = await (q as any).eq('organization_id', orgId).order('code');
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
    refetchInterval: isOnline ? options.refetchInterval : false,
    retry: isOnline ? 3 : 0,
  });

  useOfflineCache(
    ['vehicles', orgId],
    'vehicles',
    query.data as any[] | undefined,
    query.error as Error | null,
    isOnline
  );

  return query;
}
