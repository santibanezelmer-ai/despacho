import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useOfflineCache } from '@/hooks/useOfflineCache';

export function useCompanies() {
  const { orgId } = useOrganization();
  const { isOnline } = useOnlineStatus();

  const query = useQuery({
    queryKey: ['companies', orgId],
    queryFn: async () => {
      const q = supabase.from('companies').select('*');
      const { data, error } = await (q as any).eq('organization_id', orgId).order('number');
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
    retry: isOnline ? 3 : 0,
  });

  useOfflineCache(
    ['companies', orgId],
    'companies',
    query.data as any[] | undefined,
    query.error as Error | null,
    isOnline
  );

  return query;
}
