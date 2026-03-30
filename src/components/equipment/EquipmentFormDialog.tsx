import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useVehicles } from '@/hooks/useVehicles';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface EquipmentData {
  id?: string;
  name: string;
  quantity: string;
  vehicle_id: string;
  condition: string;
  notes: string;
}

const empty: EquipmentData = {
  name: '', quantity: '1', vehicle_id: '', condition: 'bueno', notes: '',
};

interface Props {
  open: boolean;
  onClose: () => void;
  equipment?: any;
}

export default function EquipmentFormDialog({ open, onClose, equipment }: Props) {
  const [form, setForm] = useState<EquipmentData>(empty);
  const [saving, setSaving] = useState(false);
  const { data: vehicles } = useVehicles();
  const { orgId } = useOrganization();
  const qc = useQueryClient();
  const isEdit = !!equipment;

  useEffect(() => {
    if (equipment) {
      setForm({
        id: equipment.id,
        name: equipment.name,
        quantity: equipment.quantity?.toString() ?? '1',
        vehicle_id: equipment.vehicle_id ?? '',
        condition: equipment.condition ?? 'bueno',
        notes: equipment.notes ?? '',
      });
    } else {
      setForm(empty);
    }
  }, [equipment, open]);

  const handleSave = async () => {
    if (!form.name.trim() || !form.vehicle_id) {
      toast.error('Nombre y móvil son obligatorios');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        quantity: parseInt(form.quantity) || 1,
        vehicle_id: form.vehicle_id,
        condition: form.condition,
        notes: form.notes.trim() || null,
        organization_id: orgId!,
      };

      if (isEdit) {
        const { error } = await supabase.from('equipment').update(payload).eq('id', form.id!);
        if (error) throw error;
        toast.success('Equipo actualizado');
      } else {
        const { error } = await supabase.from('equipment').insert(payload);
        if (error) throw error;
        toast.success('Equipo creado');
      }
      qc.invalidateQueries({ queryKey: ['equipment'] });
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
          <DialogTitle>{isEdit ? 'Editar Equipo' : 'Nuevo Equipo'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Nombre *</Label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Manguera 2.5''" className="bg-muted/50" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Cantidad</Label>
              <Input value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} type="number" className="bg-muted/50" />
            </div>
            <div>
              <Label className="text-xs">Condición</Label>
              <Select value={form.condition} onValueChange={v => setForm(f => ({ ...f, condition: v }))}>
                <SelectTrigger className="bg-muted/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bueno">Bueno</SelectItem>
                  <SelectItem value="regular">Regular</SelectItem>
                  <SelectItem value="malo">Malo</SelectItem>
                  <SelectItem value="fuera_servicio">Fuera de Servicio</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs">Móvil *</Label>
            <Select value={form.vehicle_id} onValueChange={v => setForm(f => ({ ...f, vehicle_id: v }))}>
              <SelectTrigger className="bg-muted/50"><SelectValue placeholder="Seleccionar móvil..." /></SelectTrigger>
              <SelectContent>
                {(vehicles ?? []).map(v => (
                  <SelectItem key={v.id} value={v.id}>{v.code} - {v.type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Notas</Label>
            <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="bg-muted/50 h-20" />
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
