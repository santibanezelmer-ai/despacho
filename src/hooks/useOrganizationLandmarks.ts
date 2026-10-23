import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import type { LocalLandmark } from '@/lib/localLandmarks';

export function useOrganizationLandmarks() {
  const { orgId } = useOrganization();
  return useQuery({
    queryKey: ['org-landmarks', orgId],
    enabled: !!orgId,
    staleTime: 60_000,
    queryFn: async (): Promise<LocalLandmark[]> => {
      const { data, error } = await supabase
        .from('organization_landmarks')
        .select('id, name, aliases, category, latitude, longitude, notes')
        .eq('organization_id', orgId!)
        .order('name');
      if (error) throw error;
      return (data ?? []) as LocalLandmark[];
    },
  });
}

export type LandmarkInput = Omit<LocalLandmark, 'id'> & { id?: string };

export function useSaveLandmark() {
  const { orgId } = useOrganization();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: LandmarkInput) => {
      const { id, ...rest } = input;
      if (id) {
        const { error } = await supabase.from('organization_landmarks').update(rest).eq('id', id);
        if (error) throw error;
      } else {
        const { data: u } = await supabase.auth.getUser();
        const { error } = await supabase.from('organization_landmarks')
          .insert({ ...rest, organization_id: orgId!, created_by: u.user?.id ?? null });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['org-landmarks', orgId] }),
  });
}

export function useDeleteLandmark() {
  const { orgId } = useOrganization();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('organization_landmarks').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['org-landmarks', orgId] }),
  });
}
