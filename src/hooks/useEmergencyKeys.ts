import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useOfflineCache } from '@/hooks/useOfflineCache';

export interface EmergencyKeyRow {
  id: string;
  code: string;
  name: string;
  color: string;
  sort_order: number;
  active: boolean;
  tone_url: string | null;
}

export function useEmergencyKeys() {
  const { orgId } = useOrganization();
  const { isOnline } = useOnlineStatus();

  const query = useQuery({
    queryKey: ['emergency-keys', orgId],
    queryFn: async () => {
      const q = supabase.from('emergency_keys').select('*').eq('active', true);
      const { data, error } = await (q as any).eq('organization_id', orgId).order('sort_order');
      if (error) throw error;
      return data as EmergencyKeyRow[];
    },
    enabled: !!orgId,
    retry: isOnline ? 3 : 0,
  });

  useOfflineCache(
    ['emergency-keys', orgId],
    'emergency_keys',
    query.data,
    query.error as Error | null,
    isOnline
  );

  return query;
}
