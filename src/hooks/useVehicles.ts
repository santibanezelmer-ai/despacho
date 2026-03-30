import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

type UseVehiclesOptions = {
  refetchInterval?: number;
};

export function useVehicles(options: UseVehiclesOptions = {}) {
  return useQuery({
    queryKey: ['vehicles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*, companies(name)')
        .order('code');
      if (error) throw error;
      return data;
    },
    refetchInterval: options.refetchInterval,
  });
}
