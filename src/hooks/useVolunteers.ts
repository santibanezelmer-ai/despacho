import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

type UseVolunteersOptions = {
  refetchInterval?: number;
};

export function useVolunteers(options: UseVolunteersOptions = {}) {
  return useQuery({
    queryKey: ['volunteers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('volunteers')
        .select('*, companies(name), ranks(name)')
        .order('name');
      if (error) throw error;
      return data;
    },
    refetchInterval: options.refetchInterval,
  });
}
