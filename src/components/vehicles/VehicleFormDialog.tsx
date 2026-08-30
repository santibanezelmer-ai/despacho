import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useCompanies } from '@/hooks/useCompanies';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface VehicleData {
  id?: string;
  code: string;
  type: string;
  brand: string;
  model: string;
  plate: string;
  year: string;
  capacity: string;
  company_id: string;
  status: string;
  fuel_level: string;
}

const empty: VehicleData = {
  code: '', type: '', brand: '', model: '', plate: '', year: '', capacity: '6', company_id: '', status: 'disponible', fuel_level: '',
};

interface Props {
  open: boolean;
  onClose: () => void;
  vehicle?: any;
}

export default function VehicleFormDialog({ open, onClose, vehicle }: Props) {
  const [form, setForm] = useState<VehicleData>(empty);
  const [saving, setSaving] = useState(false);
  const { data: companies } = useCompanies();
  const { orgId } = useOrganization();
  const qc = useQueryClient();
  const isEdit = !!vehicle;

  useEffect(() => {
    if (vehicle) {
      setForm({
        id: vehicle.id,
        code: vehicle.code,
        type: vehicle.type,
        brand: vehicle.brand ?? '',
        model: vehicle.model ?? '',
        plate: vehicle.plate ?? '',
        year: vehicle.year?.toString() ?? '',
        capacity: vehicle.capacity?.toString() ?? '6',
        company_id: vehicle.company_id ?? '',
        status: vehicle.status,
        fuel_level: vehicle.fuel_level?.toString() ?? '',
      });
    } else {
      setForm(empty);
    }
  }, [vehicle, open]);

  const handleSave = async () => {
    if (!form.code.trim() || !form.type.trim()) {
      toast.error('Código y tipo son obligatorios');
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        code: form.code.trim(),
        type: form.type.trim(),
        brand: form.brand.trim() || null,
        model: form.model.trim() || null,
        plate: form.plate.trim() || null,
        year: form.year ? parseInt(form.year) : null,
        capacity: parseInt(form.capacity) || 6,
        company_id: form.company_id || null,
        status: form.status as any,
        organization_id: orgId!,
        fuel_level: form.fuel_level === '' ? null : Math.max(0, Math.min(100, parseInt(form.fuel_level))),
      };
      if (form.fuel_level !== '') payload.fuel_updated_at = new Date().toISOString();

      if (isEdit) {
        const { error } = await supabase.from('vehicles').update(payload).eq('id', form.id!);
        if (error) throw error;
        toast.success('Móvil actualizado');
      } else {
        const { error } = await supabase.from('vehicles').insert(payload);
        if (error) throw error;
        toast.success('Móvil creado');
      }
      qc.invalidateQueries({ queryKey: ['vehicles'] });
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
          <DialogTitle>{isEdit ? 'Editar Móvil' : 'Nuevo Móvil'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Código *</Label>
              <Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="B-1" className="bg-muted/50" />
            </div>
            <div>
              <Label className="text-xs">Tipo *</Label>
              <Input value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} placeholder="Bomba" className="bg-muted/50" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Patente</Label>
              <Input value={form.plate} onChange={e => setForm(f => ({ ...f, plate: e.target.value }))} className="bg-muted/50" />
            </div>
            <div>
              <Label className="text-xs">Año</Label>
              <Input value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))} type="number" className="bg-muted/50" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Capacidad</Label>
              <Input value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} type="number" className="bg-muted/50" />
            </div>
            <div>
              <Label className="text-xs">Estado</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger className="bg-muted/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="disponible">Disponible</SelectItem>
                  <SelectItem value="en_servicio">En Servicio</SelectItem>
                  <SelectItem value="mantencion">Mantención</SelectItem>
                  <SelectItem value="fuera_servicio">Fuera de Servicio</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
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
