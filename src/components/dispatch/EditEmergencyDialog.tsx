import { useState } from 'react';
import { Loader2, Pencil } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface Props {
  emergency: {
    id: string;
    folio: string;
    address: string;
    reference?: string | null;
    observations?: string | null;
    pre_report?: string | null;
  };
  open: boolean;
  onClose: () => void;
}

/** Edición básica de la ficha de una emergencia (también finalizadas, desde Historial). */
export default function EditEmergencyDialog({ emergency, open, onClose }: Props) {
  const { user } = useAuth();
  const { orgId } = useOrganization();
  const qc = useQueryClient();
  const [address, setAddress] = useState(emergency.address ?? '');
  const [reference, setReference] = useState(emergency.reference ?? '');
  const [observations, setObservations] = useState(emergency.observations ?? '');
  const [preReport, setPreReport] = useState(emergency.pre_report ?? '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!address.trim()) {
      toast.error('La dirección es obligatoria');
      return;
    }
    setSaving(true);
    try {
      const updates = {
        address: address.trim(),
        reference: reference.trim() || null,
        observations: observations.trim() || null,
        pre_report: preReport.trim() || null,
      };
      const { error } = await supabase.from('emergencies').update(updates).eq('id', emergency.id);
      if (error) throw error;

      await supabase.from('emergency_log').insert({
        emergency_id: emergency.id,
        organization_id: orgId!,
        message: 'Ficha editada desde Historial',
        created_by: user?.id ?? null,
      });

      qc.invalidateQueries({ queryKey: ['emergency-history'] });
      qc.invalidateQueries({ queryKey: ['active-emergencies'] });
      toast.success('Ficha actualizada');
      onClose();
    } catch {
      toast.error('Error al guardar la ficha');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-4 w-4" /> Editar ficha · {emergency.folio}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Dirección</label>
            <Input value={address} onChange={e => setAddress(e.target.value)} spellCheck lang="es-CL" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Referencia</label>
            <Input value={reference} onChange={e => setReference(e.target.value)} spellCheck lang="es-CL" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Observaciones</label>
            <Textarea value={observations} onChange={e => setObservations(e.target.value)} rows={3} spellCheck lang="es-CL" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Preinforme</label>
            <Textarea value={preReport} onChange={e => setPreReport(e.target.value)} rows={4} spellCheck lang="es-CL" />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            Guardar cambios
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
