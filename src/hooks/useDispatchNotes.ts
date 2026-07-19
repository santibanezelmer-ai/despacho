import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

export interface DispatchNote {
  id: string;
  organization_id: string;
  title: string | null;
  content: string;
  created_by: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export function useDispatchNotes(onlyActive = true) {
  const { orgId } = useOrganization();
  return useQuery({
    queryKey: ['dispatch-notes', orgId, onlyActive],
    queryFn: async () => {
      let q = supabase
        .from('dispatch_notes' as any)
        .select('*')
        .eq('organization_id', orgId!)
        .order('created_at', { ascending: false });
      if (onlyActive) q = q.eq('active', true);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as DispatchNote[];
    },
    enabled: !!orgId,
    refetchInterval: 10000,
  });
}

export function useCreateDispatchNote() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { orgId } = useOrganization();
  return useMutation({
    mutationFn: async ({ title, content }: { title?: string; content: string }) => {
      const { error } = await supabase.from('dispatch_notes' as any).insert({
        organization_id: orgId!,
        title: title?.trim() || null,
        content: content.trim(),
        created_by: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dispatch-notes'] });
      toast.success('Comunicado publicado');
    },
    onError: (e: any) => toast.error(e.message || 'Error al publicar comunicado'),
  });
}

export function useArchiveDispatchNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('dispatch_notes' as any).update({ active: false }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dispatch-notes'] });
      toast.success('Comunicado archivado');
    },
    onError: () => toast.error('Error al archivar'),
  });
}
