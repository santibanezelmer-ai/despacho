import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useOfflineCache } from '@/hooks/useOfflineCache';
import { useRealtimeInvalidate } from '@/hooks/useRealtimeInvalidate';

type UseVehiclesOptions = { refetchInterval?: number };

/** Respaldo de reconciliación: Realtime es el mecanismo principal. */
const RECONCILE_INTERVAL_MS = 60000;

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
    refetchInterval: isOnline
      ? Math.max(options.refetchInterval ?? RECONCILE_INTERVAL_MS, RECONCILE_INTERVAL_MS)
      : false,
    retry: isOnline ? 3 : 0,
  });

  useRealtimeInvalidate('vehicles', orgId, [['vehicles', orgId]]);

  useOfflineCache(
    ['vehicles', orgId],
    'vehicles',
    query.data as any[] | undefined,
    query.error as Error | null,
    isOnline
  );

  return query;
}
