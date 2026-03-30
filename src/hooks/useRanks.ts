import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';

export function useRanks() {
  const { orgId } = useOrganization();
  return useQuery({
    queryKey: ['ranks', orgId],
    queryFn: async () => {
      const q = supabase.from('ranks').select('*');
      const { data, error } = await (q as any).eq('organization_id', orgId).order('level');
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });
}
