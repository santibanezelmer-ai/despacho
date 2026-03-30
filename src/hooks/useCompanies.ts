import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';

export function useCompanies() {
  const { orgId } = useOrganization();
  return useQuery({
    queryKey: ['companies', orgId],
    queryFn: async () => {
      const q = supabase.from('companies').select('*');
      const { data, error } = await (q as any).eq('organization_id', orgId).order('number');
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });
}
