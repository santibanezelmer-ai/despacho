import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';

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
  return useQuery({
    queryKey: ['emergency-keys', orgId],
    queryFn: async () => {
      const q = supabase.from('emergency_keys').select('*').eq('active', true);
      const { data, error } = await (q as any).eq('organization_id', orgId).order('sort_order');
      if (error) throw error;
      return data as EmergencyKeyRow[];
    },
    enabled: !!orgId,
  });
}
