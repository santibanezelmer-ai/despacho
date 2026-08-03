import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Image as ImageIcon, Loader2 } from 'lucide-react';
import LogoUploadField from './LogoUploadField';
import LocationFields from './LocationFields';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export default function OrganizationBrandingCard() {
  const { orgId, isOrgAdmin } = useOrganization();
  const qc = useQueryClient();
  const [logo, setLogo] = useState<string | null>(null);
  const [name, setName] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [latitude, setLatitude] = useState<string>('');
  const [longitude, setLongitude] = useState<string>('');
  const [timeFormat, setTimeFormat] = useState<'12' | '24'>('24');
  const [saving, setSaving] = useState(false);

  const { data: org, isLoading } = useQuery({
    queryKey: ['org-branding', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('organizations')
        .select('id, name, logo_url, address, latitude, longitude, time_format')
        .eq('id', orgId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    setLogo(org?.logo_url ?? null);
    setName(org?.name ?? '');
    setAddress(org?.address ?? '');
    setLatitude(org?.latitude != null ? String(org.latitude) : '');
    setLongitude(org?.longitude != null ? String(org.longitude) : '');
    setTimeFormat((org?.time_format as '12' | '24') ?? '24');
  }, [org?.logo_url, org?.name, org?.address, org?.latitude, org?.longitude, org?.time_format]);

  if (!isOrgAdmin) return null;

  const dirty =
    (org?.logo_url ?? null) !== logo ||
    (org?.name ?? '') !== name.trim() ||
    (org?.address ?? '') !== address.trim() ||
    (org?.latitude != null ? String(org.latitude) : '') !== latitude.trim() ||
    (org?.longitude != null ? String(org.longitude) : '') !== longitude.trim() ||
    ((org?.time_format as string) ?? '24') !== timeFormat;

  const handleSave = async () => {
    if (!orgId) return;
    const trimmed = name.trim();
    if (!trimmed) { toast.error('El nombre no puede estar vacío'); return; }
    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from('organizations')
        .update({
          logo_url: logo,
          name: trimmed,
          address: address.trim() || null,
          latitude: latitude.trim() ? parseFloat(latitude) : null,
          longitude: longitude.trim() ? parseFloat(longitude) : null,
          time_format: timeFormat,
        })
        .eq('id', orgId);
      if (error) throw error;
      toast.success('Organización actualizada');
      qc.invalidateQueries({ queryKey: ['org-branding', orgId] });
      qc.invalidateQueries({ queryKey: ['organization'] });
      qc.invalidateQueries({ queryKey: ['org-location', orgId] });
      qc.invalidateQueries({ queryKey: ['org-time-format', orgId] });
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
        Nombre y logo se muestran en la PWA, en las fichas de emergencia y en los informes exportados.
      </p>

      {isLoading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Cargando…</div>
      ) : (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="org-name" className="text-xs">Nombre de la organización</Label>
            <Input
              id="org-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Cuerpo de Bomberos de..."
              maxLength={120}
            />
          </div>

          <LocationFields
            address={address}
            latitude={latitude}
            longitude={longitude}
            onChange={(patch) => {
              if (patch.address !== undefined) setAddress(patch.address);
              if (patch.latitude !== undefined) setLatitude(patch.latitude);
              if (patch.longitude !== undefined) setLongitude(patch.longitude);
            }}
            addressLabel="Dirección del cuartel general"
          />

          <div className="space-y-1.5">
            <Label htmlFor="org-time-format" className="text-xs">Formato de hora</Label>
            <Select value={timeFormat} onValueChange={(v) => setTimeFormat(v as '12' | '24')}>
              <SelectTrigger id="org-time-format" className="w-full sm:w-64 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24" className="text-xs">24 horas (14:35)</SelectItem>
                <SelectItem value="12" className="text-xs">12 horas (02:35 p.m.)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Se aplica a los relojes, bitácoras y horarios de la consola y de la PWA de esta organización.
            </p>
          </div>

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
