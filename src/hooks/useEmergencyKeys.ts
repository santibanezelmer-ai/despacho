import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
  return useQuery({
    queryKey: ['emergency-keys'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('emergency_keys')
        .select('*')
        .eq('active', true)
        .order('sort_order');
      if (error) throw error;
      return data as EmergencyKeyRow[];
    },
  });
}
