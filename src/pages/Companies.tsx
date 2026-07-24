import { useState } from 'react';
import { useCompanies } from '@/hooks/useCompanies';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Building2, Plus, Search, Pencil, Trash2, Loader2, Volume2 } from 'lucide-react';
import ToneUploadField from '@/components/admin/ToneUploadField';
import LogoUploadField from '@/components/admin/LogoUploadField';
import { Logo } from '@/components/ui/Logo';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';

interface CompanyForm {
  id?: string;
  name: string;
  number: string;
  address: string;
  phone: string;
  active: boolean;
  tone_url: string;
  logo_url: string | null;
}

const empty: CompanyForm = { name: '', number: '', address: '', phone: '', active: true, tone_url: '', logo_url: null };

export default function Companies() {
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CompanyForm | null>(null);
  const [saving, setSaving] = useState(false);
  const { data: companies, isLoading } = useCompanies();
  const { canWrite } = useAuth();
  const { orgId } = useOrganization();
  const qc = useQueryClient();

  const filtered = (companies ?? []).filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.number.toString().includes(search)
  );

  const openNew = () => { setEditing({ ...empty }); setDialogOpen(true); };
  const openEdit = (c: any) => {
    setEditing({ id: c.id, name: c.name, number: c.number.toString(), address: c.address ?? '', phone: c.phone ?? '', active: c.active, tone_url: c.tone_url ?? '', logo_url: c.logo_url ?? null });
    setDialogOpen(true);
  };

  const [uploading, setUploading] = useState(false);

  const handleToneUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `company-${crypto.randomUUID()}.${ext}`;
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
    if (!editing.name.trim() || !editing.number) { toast.error('Nombre y número son obligatorios'); return; }
    setSaving(true);
    try {
      const payload = {
        name: editing.name.trim(),
        number: parseInt(editing.number),
        address: editing.address.trim() || null,
        phone: editing.phone.trim() || null,
        active: editing.active,
        tone_url: editing.tone_url.trim() || null,
        logo_url: editing.logo_url || null,
        organization_id: orgId!,
      };
      if (editing.id) {
        const { error } = await supabase.from('companies').update(payload).eq('id', editing.id);
        if (error) throw error;
        toast.success('Compañía actualizada');
      } else {
        const { error } = await supabase.from('companies').insert(payload);
        if (error) throw error;
        toast.success('Compañía creada');
      }
      qc.invalidateQueries({ queryKey: ['companies'] });
      setDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (c: any) => {
    if (!confirm(`¿Eliminar compañía "${c.name}"?`)) return;
    const { error } = await supabase.from('companies').delete().eq('id', c.id);
    if (error) {
      if (error.code === '23503' || error.message?.includes('violates foreign key') || (error as any).status === 409) {
        toast.error('No se puede eliminar: esta compañía tiene vehículos o voluntarios asignados. Reasígnalos primero.');
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success('Compañía eliminada');
      qc.invalidateQueries({ queryKey: ['companies'] });
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Building2 className="h-5 w-5 text-accent" /> Compañías
        </h1>
        {canWrite && (
          <Button size="sm" onClick={openNew} className="bg-emergency text-emergency-foreground hover:bg-emergency/90 text-xs">
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Nueva Compañía
          </Button>
        )}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-muted/50" />
      </div>

      <div className="console-panel overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th className="px-4 py-3 text-left font-medium">Nº</th>
              <th className="px-4 py-3 text-left font-medium">Nombre</th>
              <th className="px-4 py-3 text-left font-medium">Dirección</th>
              <th className="px-4 py-3 text-left font-medium">Teléfono</th>
              <th className="px-4 py-3 text-left font-medium">Estado</th>
              {canWrite && <th className="px-4 py-3 text-right font-medium">Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}><td colSpan={6} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td></tr>
              ))
            ) : (
              filtered.map(c => (
                <tr key={c.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-foreground">{c.number}</td>
                  <td className="px-4 py-3 font-medium text-foreground">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded bg-muted/50 border border-border overflow-hidden flex items-center justify-center shrink-0">
                        <Logo src={(c as any).logo_url} alt={c.name} className="max-h-8 max-w-8 object-contain" fallback={<Building2 className="h-4 w-4 text-muted-foreground" />} />
                      </div>
                      <span>{c.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{c.address ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.phone ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`status-badge ${c.active ? 'bg-success/20 text-success' : 'bg-muted text-muted-foreground'}`}>
                      {c.active ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  {canWrite && (
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => openEdit(c)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive hover:text-destructive" onClick={() => handleDelete(c)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={v => !v && setDialogOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing?.id ? 'Editar Compañía' : 'Nueva Compañía'}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Número *</Label>
                  <Input value={editing.number} onChange={e => setEditing(f => f ? { ...f, number: e.target.value } : f)} type="number" className="bg-muted/50" />
                </div>
                <div>
                  <Label className="text-xs">Nombre *</Label>
                  <Input value={editing.name} onChange={e => setEditing(f => f ? { ...f, name: e.target.value } : f)} className="bg-muted/50" />
                </div>
              </div>
              <div>
                <Label className="text-xs">Dirección</Label>
                <Input value={editing.address} onChange={e => setEditing(f => f ? { ...f, address: e.target.value } : f)} className="bg-muted/50" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Teléfono</Label>
                  <Input value={editing.phone} onChange={e => setEditing(f => f ? { ...f, phone: e.target.value } : f)} className="bg-muted/50" />
                </div>
                <div className="flex items-end gap-2 pb-1">
                  <Switch checked={editing.active} onCheckedChange={v => setEditing(f => f ? { ...f, active: v } : f)} />
                  <Label className="text-xs">Activa</Label>
                </div>
              </div>
              <LogoUploadField
                label="Logo de la Compañía"
                value={editing.logo_url}
                onChange={(path) => setEditing(f => f ? { ...f, logo_url: path } : f)}
                orgId={orgId!}
                kind="company"
                subId={editing.id ?? 'new'}
              />
              <ToneUploadField
                label="Tono de Compañía (MP3)"
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
