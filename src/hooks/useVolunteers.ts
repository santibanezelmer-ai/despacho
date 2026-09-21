import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useOfflineCache } from '@/hooks/useOfflineCache';
import { useRealtimeInvalidate } from '@/hooks/useRealtimeInvalidate';

type UseVolunteersOptions = { refetchInterval?: number };

/** Respaldo de reconciliación: Realtime es el mecanismo principal. */
const RECONCILE_INTERVAL_MS = 60000;

export function useVolunteers(options: UseVolunteersOptions = {}) {
  const { orgId } = useOrganization();
  const { isOnline } = useOnlineStatus();

  const query = useQuery({
    queryKey: ['volunteers', orgId],
    queryFn: async () => {
      const q = supabase.from('volunteers').select('*, companies(name), ranks(name, is_authority)');
      const { data, error } = await (q as any).eq('organization_id', orgId).order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
    refetchInterval: isOnline
      ? Math.max(options.refetchInterval ?? RECONCILE_INTERVAL_MS, RECONCILE_INTERVAL_MS)
      : false,
    retry: isOnline ? 3 : 0,
  });

  useRealtimeInvalidate('volunteers', orgId, [['volunteers', orgId]]);

  useOfflineCache(
    ['volunteers', orgId],
    'volunteers',
    query.data as any[] | undefined,
    query.error as Error | null,
    isOnline
  );

  return query;
}
