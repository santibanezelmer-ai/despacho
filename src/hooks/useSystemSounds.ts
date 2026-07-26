import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

export interface SystemSound {
  id: string;
  organization_id: string;
  sound_key: string;
  sound_url: string;
  label: string;
}

export const SOUND_KEYS = [
  { key: 'declarado', label: 'Declarado' },
  { key: 'prueba_sirena', label: 'Prueba Sirena' },
  { key: 'mediodia', label: 'Mediodía' },
] as const;

export function useSystemSounds() {
  const { orgId } = useOrganization();
  return useQuery({
    queryKey: ['system-sounds', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_sounds')
        .select('*')
        .eq('organization_id', orgId!);
      if (error) throw error;
      return data as SystemSound[];
    },
    enabled: !!orgId,
  });
}

export function useSystemSound(key: string) {
  const { data: sounds } = useSystemSounds();
  return sounds?.find(s => s.sound_key === key);
}

export function usePlaySystemSound() {
  const { data: sounds } = useSystemSounds();
  return (key: string) => {
    const sound = sounds?.find(s => s.sound_key === key);
    if (sound?.sound_url) {
      try {
        const audio = new Audio(sound.sound_url);
        audio.play().catch(() => {});
        return audio;
      } catch { return null; }
    }
    return null;
  };
}

export function useUpsertSystemSound() {
  const { orgId } = useOrganization();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ soundKey, file }: { soundKey: string; file: File }) => {
      const path = `${orgId}/sounds/${soundKey}-${Date.now()}.mp3`;
      const { error: uploadErr } = await supabase.storage.from('tones').upload(path, file);
      if (uploadErr) throw uploadErr;
      const { data: urlData, error: signErr } = await supabase.storage.from('tones').createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (signErr || !urlData) throw signErr ?? new Error('No se pudo firmar la URL');


      // Upsert via delete + insert (unique constraint)
      await supabase.from('system_sounds').delete()
        .eq('organization_id', orgId!)
        .eq('sound_key', soundKey);

      const { error } = await supabase.from('system_sounds').insert({
        organization_id: orgId!,
        sound_key: soundKey,
        sound_url: urlData.signedUrl,
        label: SOUND_KEYS.find(s => s.key === soundKey)?.label ?? soundKey,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['system-sounds'] }); toast.success('Sonido asignado'); },
    onError: () => toast.error('Error al subir sonido'),
  });
}

export function useDeleteSystemSound() {
  const { orgId } = useOrganization();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (soundKey: string) => {
      const { error } = await supabase.from('system_sounds').delete()
        .eq('organization_id', orgId!)
        .eq('sound_key', soundKey);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['system-sounds'] }); toast.success('Sonido eliminado'); },
    onError: () => toast.error('Error al eliminar sonido'),
  });
}
