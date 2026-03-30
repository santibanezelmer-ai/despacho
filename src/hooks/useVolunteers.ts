import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';

type UseVolunteersOptions = { refetchInterval?: number };

export function useVolunteers(options: UseVolunteersOptions = {}) {
  const { orgId } = useOrganization();
  return useQuery({
    queryKey: ['volunteers', orgId],
    queryFn: async () => {
      const q = supabase.from('volunteers').select('*, companies(name), ranks(name)');
      const { data, error } = await (q as any).eq('organization_id', orgId).order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
    refetchInterval: options.refetchInterval,
  });
}
