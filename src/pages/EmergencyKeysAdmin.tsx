import { useState } from 'react';
import { useEmergencyKeys, type EmergencyKeyRow } from '@/hooks/useEmergencyKeys';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Siren, Plus, Pencil, Trash2, Loader2, Volume2 } from 'lucide-react';
import ToneUploadField from '@/components/admin/ToneUploadField';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';

interface KeyForm {
  id?: string;
  code: string;
  name: string;
  color: string;
  sort_order: string;
  active: boolean;
  tone_url: string;
}

const empty: KeyForm = { code: '', name: '', color: '#dc2626', sort_order: '0', active: true, tone_url: '' };

export default function EmergencyKeysAdmin() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<KeyForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { data: keys, isLoading } = useEmergencyKeys();
  const { hasRole } = useAuth();
  const { orgId } = useOrganization();
  const qc = useQueryClient();
  const isAdmin = hasRole('admin');

  // Fetch ALL keys (including inactive) for admin
  const [allKeys, setAllKeys] = useState<any[]>([]);
  const [loadedAll, setLoadedAll] = useState(false);

  const loadAll = async () => {
    const { data } = await supabase.from('emergency_keys').select('*').order('sort_order');
    if (data) { setAllKeys(data); setLoadedAll(true); }
  };

  if (!loadedAll) loadAll();

  const displayKeys = loadedAll ? allKeys : (keys ?? []);

  const openNew = () => { setEditing({ ...empty }); setDialogOpen(true); };
  const openEdit = (k: any) => {
    setEditing({
      id: k.id, code: k.code, name: k.name, color: k.color,
      sort_order: k.sort_order.toString(), active: k.active, tone_url: k.tone_url ?? '',
    });
    setDialogOpen(true);
  };

  const handleToneUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      if (!orgId) throw new Error('Organización no disponible');
      const ext = file.name.split('.').pop();
      const path = `${orgId}/keys/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('tones').upload(path, file);
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from('tones').getPublicUrl(path);
      setEditing(f => f ? { ...f, tone_url: urlData.publicUrl } : f);
      toast.success('Tono subido');
    } catch (err: any) {
      toast.error(err.message || 'Error subiendo tono');
    } finally {
      setUploading(false);
    }
  };

  const playTone = (url: string) => {
    try { new Audio(url).play(); } catch { toast.error('No se puede reproducir'); }
  };

  const handleSave = async () => {
    if (!editing) return;
    if (!editing.code.trim() || !editing.name.trim()) { toast.error('Código y nombre son obligatorios'); return; }
    setSaving(true);
    try {
      const payload = {
        code: editing.code.trim(),
        name: editing.name.trim(),
        color: editing.color,
        sort_order: parseInt(editing.sort_order) || 0,
        active: editing.active,
        tone_url: editing.tone_url.trim() || null,
        organization_id: orgId!,
      };
      if (editing.id) {
        const { error } = await supabase.from('emergency_keys').update(payload).eq('id', editing.id);
        if (error) throw error;
        toast.success('Clave actualizada');
      } else {
        const { error } = await supabase.from('emergency_keys').insert(payload);
        if (error) throw error;
        toast.success('Clave creada');
      }
      qc.invalidateQueries({ queryKey: ['emergency-keys'] });
      setLoadedAll(false);
      setDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (k: any) => {
    if (!confirm(`¿Eliminar clave "${k.code} - ${k.name}"?`)) return;
    const { error } = await supabase.from('emergency_keys').delete().eq('id', k.id);
    if (error) toast.error(error.message);
    else { toast.success('Clave eliminada'); setLoadedAll(false); qc.invalidateQueries({ queryKey: ['emergency-keys'] }); }
  };

  if (!isAdmin) {
    return <div className="flex items-center justify-center h-full"><p className="text-muted-foreground">Solo administradores.</p></div>;
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Siren className="h-5 w-5 text-emergency" /> Claves de Emergencia
        </h1>
        <Button size="sm" onClick={openNew} className="bg-emergency text-emergency-foreground hover:bg-emergency/90 text-xs">
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Nueva Clave
        </Button>
      </div>

      <div className="console-panel overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th className="px-4 py-3 text-left font-medium">Color</th>
              <th className="px-4 py-3 text-left font-medium">Código</th>
              <th className="px-4 py-3 text-left font-medium">Nombre</th>
              <th className="px-4 py-3 text-left font-medium">Orden</th>
              <th className="px-4 py-3 text-left font-medium">Tono</th>
              <th className="px-4 py-3 text-left font-medium">Estado</th>
              <th className="px-4 py-3 text-right font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && !loadedAll ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}><td colSpan={7} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td></tr>
              ))
            ) : (
              displayKeys.map(k => (
                <tr key={k.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <span className="inline-block h-4 w-4 rounded" style={{ backgroundColor: k.color }} />
                  </td>
                  <td className="px-4 py-3 font-mono font-bold text-foreground">{k.code}</td>
                  <td className="px-4 py-3 text-foreground">{k.name}</td>
                  <td className="px-4 py-3 text-muted-foreground font-mono">{k.sort_order}</td>
                  <td className="px-4 py-3">
                    {k.tone_url ? (
                      <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => playTone(k.tone_url!)}>
                        <Volume2 className="h-3 w-3 mr-1" /> Reproducir
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">Sin tono</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`status-badge ${k.active ? 'bg-success/20 text-success' : 'bg-muted text-muted-foreground'}`}>
                      {k.active ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => openEdit(k)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive hover:text-destructive" onClick={() => handleDelete(k)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={v => !v && setDialogOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing?.id ? 'Editar Clave' : 'Nueva Clave'}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Código *</Label>
                  <Input value={editing.code} onChange={e => setEditing(f => f ? { ...f, code: e.target.value } : f)} placeholder="10-0" className="bg-muted/50" />
                </div>
                <div>
                  <Label className="text-xs">Nombre *</Label>
                  <Input value={editing.name} onChange={e => setEditing(f => f ? { ...f, name: e.target.value } : f)} placeholder="Incendio Estructural" className="bg-muted/50" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Color</Label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={editing.color} onChange={e => setEditing(f => f ? { ...f, color: e.target.value } : f)} className="h-8 w-8 rounded border border-border cursor-pointer" />
                    <Input value={editing.color} onChange={e => setEditing(f => f ? { ...f, color: e.target.value } : f)} className="bg-muted/50 text-xs font-mono" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Orden</Label>
                  <Input value={editing.sort_order} onChange={e => setEditing(f => f ? { ...f, sort_order: e.target.value } : f)} type="number" className="bg-muted/50" />
                </div>
                <div className="flex items-end gap-2 pb-1">
                  <Switch checked={editing.active} onCheckedChange={v => setEditing(f => f ? { ...f, active: v } : f)} />
                  <Label className="text-xs">Activa</Label>
                </div>
              </div>
              <ToneUploadField
                value={editing.tone_url}
                onChange={(v) => setEditing(f => f ? { ...f, tone_url: v } : f)}
                onUpload={handleToneUpload}
                onPlay={playTone}
                uploading={uploading}
              />
              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1" disabled={saving}>Cancelar</Button>
                <Button onClick={handleSave} className="flex-1 bg-emergency text-emergency-foreground hover:bg-emergency/90" disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editing.id ? 'Guardar' : 'Crear'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
