import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import type { OperationalSector } from '@/lib/operationalSectors';

const EMPTY: OperationalSector[] = [];

export function useOperationalSectors() {
  const { orgId } = useOrganization();
  const q = useQuery({
    queryKey: ['operational-sectors', orgId],
    enabled: !!orgId,
    staleTime: 60_000,
    queryFn: async (): Promise<OperationalSector[]> => {
      const { data, error } = await supabase
        .from('operational_sectors')
        .select('id, kind, name, code, color, company_id, polygons, source')
        .eq('organization_id', orgId!)
        .order('kind').order('code', { nullsFirst: false }).order('name');
      if (error) throw error;
      return (data ?? []) as unknown as OperationalSector[];
    },
  });
  return { ...q, data: q.data ?? EMPTY };
}

export type SectorInput = Omit<OperationalSector, 'id'> & { id?: string };

export function useSaveSectors() {
  const { orgId } = useOrganization();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (inputs: SectorInput[]) => {
      const { data: u } = await supabase.auth.getUser();
      for (const input of inputs) {
        const { id, ...rest } = input;
        const row = { ...rest, polygons: rest.polygons as unknown as never };
        const { error } = id
          ? await supabase.from('operational_sectors').update(row).eq('id', id)
          : await supabase.from('operational_sectors').insert({ ...row, organization_id: orgId!, created_by: u.user?.id ?? null });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['operational-sectors', orgId] }),
  });
}

export function useDeleteSector() {
  const { orgId } = useOrganization();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('operational_sectors').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['operational-sectors', orgId] }),
  });
}
