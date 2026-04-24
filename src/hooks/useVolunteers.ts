import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useOfflineCache } from '@/hooks/useOfflineCache';

type UseVolunteersOptions = { refetchInterval?: number };

export function useVolunteers(options: UseVolunteersOptions = {}) {
  const { orgId } = useOrganization();
  const { isOnline } = useOnlineStatus();

  const query = useQuery({
    queryKey: ['volunteers', orgId],
    queryFn: async () => {
      const q = supabase.from('volunteers').select('*, companies(name), ranks(name)');
      const { data, error } = await (q as any).eq('organization_id', orgId).order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
    refetchInterval: isOnline ? options.refetchInterval : false,
    retry: isOnline ? 3 : 0,
  });

  useOfflineCache(
    ['volunteers', orgId],
    'volunteers',
    query.data as any[] | undefined,
    query.error as Error | null,
    isOnline
  );

  return query;
}
