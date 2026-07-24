import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Button } from '@/components/ui/button';
import { Image as ImageIcon, Loader2 } from 'lucide-react';
import LogoUploadField from './LogoUploadField';
import { toast } from 'sonner';

export default function OrganizationBrandingCard() {
  const { orgId, isOrgAdmin } = useOrganization();
  const qc = useQueryClient();
  const [logo, setLogo] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: org, isLoading } = useQuery({
    queryKey: ['org-branding', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('organizations')
        .select('id, name, logo_url')
        .eq('id', orgId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => { setLogo(org?.logo_url ?? null); }, [org?.logo_url]);

  if (!isOrgAdmin) return null;

  const dirty = (org?.logo_url ?? null) !== logo;

  const handleSave = async () => {
    if (!orgId) return;
    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from('organizations')
        .update({ logo_url: logo })
        .eq('id', orgId);
      if (error) throw error;
      toast.success('Logo de la organización actualizado');
      qc.invalidateQueries({ queryKey: ['org-branding', orgId] });
      qc.invalidateQueries({ queryKey: ['organization'] });
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="console-panel-elevated p-5 space-y-4">
      <div className="flex items-center gap-2">
        <ImageIcon className="h-4 w-4 text-accent" />
        <h2 className="text-sm font-cond uppercase tracking-widest text-foreground">Marca de la organización</h2>
      </div>
      <p className="text-xs text-muted-foreground -mt-2">
        Este logo se muestra en la PWA de voluntarios, en las fichas de emergencia y en los informes exportados.
      </p>

      {isLoading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Cargando…</div>
      ) : (
        <>
          <LogoUploadField
            label={`Logo de ${org?.name ?? 'la organización'}`}
            value={logo}
            onChange={setLogo}
            orgId={orgId!}
            kind="org"
          />
          <div className="flex justify-end">
            <Button size="sm" onClick={handleSave} disabled={!dirty || saving} className="text-xs">
              {saving && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              Guardar cambios
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
