import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useCompanies } from '@/hooks/useCompanies';
import { useRanks } from '@/hooks/useRanks';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface VolunteerData {
  id?: string;
  name: string;
  rut: string;
  email: string;
  phone: string;
  company_id: string;
  rank_id: string;
  status: string;
  available: boolean;
}

const empty: VolunteerData = {
  name: '', rut: '', email: '', phone: '',
  company_id: '', rank_id: '', status: 'activo', available: true,
};

interface Props {
  open: boolean;
  onClose: () => void;
  volunteer?: any;
}

export default function VolunteerFormDialog({ open, onClose, volunteer }: Props) {
  const [form, setForm] = useState<VolunteerData>(empty);
  const [saving, setSaving] = useState(false);
  const { data: companies } = useCompanies();
  const { data: ranks } = useRanks();
  const qc = useQueryClient();
  const isEdit = !!volunteer;

  useEffect(() => {
    if (volunteer) {
      setForm({
        id: volunteer.id,
        name: volunteer.name,
        rut: volunteer.rut ?? '',
        email: volunteer.email ?? '',
        phone: volunteer.phone ?? '',
        company_id: volunteer.company_id ?? '',
        rank_id: volunteer.rank_id ?? '',
        status: volunteer.status,
        available: volunteer.available,
      });
    } else {
      setForm(empty);
    }
  }, [volunteer, open]);

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('El nombre es obligatorio'); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        rut: form.rut.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        company_id: form.company_id || null,
        rank_id: form.rank_id || null,
        status: form.status as any,
        available: form.available,
      };

      if (isEdit) {
        const { error } = await supabase.from('volunteers').update(payload).eq('id', form.id!);
        if (error) throw error;
        toast.success('Voluntario actualizado');
      } else {
        const { error } = await supabase.from('volunteers').insert(payload);
        if (error) throw error;
        toast.success('Voluntario creado');
      }
      qc.invalidateQueries({ queryKey: ['volunteers'] });
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Voluntario' : 'Nuevo Voluntario'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Nombre *</Label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="bg-muted/50" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">RUT</Label>
              <Input value={form.rut} onChange={e => setForm(f => ({ ...f, rut: e.target.value }))} placeholder="12.345.678-9" className="bg-muted/50" />
            </div>
            <div>
              <Label className="text-xs">Teléfono</Label>
              <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="bg-muted/50" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Email</Label>
            <Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="bg-muted/50" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Compañía</Label>
              <Select value={form.company_id} onValueChange={v => setForm(f => ({ ...f, company_id: v }))}>
                <SelectTrigger className="bg-muted/50"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  {(companies ?? []).map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Rango</Label>
              <Select value={form.rank_id} onValueChange={v => setForm(f => ({ ...f, rank_id: v }))}>
                <SelectTrigger className="bg-muted/50"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  {(ranks ?? []).map(r => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Estado</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger className="bg-muted/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="activo">Activo</SelectItem>
                  <SelectItem value="inactivo">Inactivo</SelectItem>
                  <SelectItem value="licencia">Licencia</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2 pb-1">
              <Switch checked={form.available} onCheckedChange={v => setForm(f => ({ ...f, available: v }))} />
              <Label className="text-xs">Disponible</Label>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1" disabled={saving}>Cancelar</Button>
            <Button onClick={handleSave} className="flex-1 bg-emergency text-emergency-foreground hover:bg-emergency/90" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? 'Guardar' : 'Crear'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
