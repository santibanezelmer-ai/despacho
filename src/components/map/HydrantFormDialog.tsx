import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { MapPin } from 'lucide-react';

type HydrantFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialCoords?: { lat: number; lng: number } | null;
  editingHydrant?: { id: string; name: string; lat: number; lng: number; type: string | null; description: string | null } | null;
};

export default function HydrantFormDialog({ open, onOpenChange, initialCoords, editingHydrant }: HydrantFormDialogProps) {
  const { orgId } = useOrganization();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [lat, setLat] = useState(initialCoords?.lat?.toString() ?? '');
  const [lng, setLng] = useState(initialCoords?.lng?.toString() ?? '');
  const [type, setType] = useState('');
  const [description, setDescription] = useState('');

  // Sync initialCoords when dialog opens with new coords
  const [lastCoords, setLastCoords] = useState(initialCoords);
  if (initialCoords && initialCoords !== lastCoords) {
    setLat(initialCoords.lat.toFixed(6));
    setLng(initialCoords.lng.toFixed(6));
    setLastCoords(initialCoords);
  }

  // Sync editing hydrant data
  const [lastEditing, setLastEditing] = useState(editingHydrant);
  if (editingHydrant && editingHydrant !== lastEditing) {
    setName(editingHydrant.name ?? '');
    setType(editingHydrant.type ?? '');
    setDescription(editingHydrant.description ?? '');
    setLastEditing(editingHydrant);
  }

  const resetForm = () => {
    setName('');
    setLat('');
    setLng('');
    setType('');
    setDescription('');
    setLastCoords(null);
    setLastEditing(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId) return;

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (isNaN(latitude) || isNaN(longitude)) {
      toast.error('Coordenadas inválidas');
      return;
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      toast.error('Coordenadas fuera de rango');
      return;
    }

    setLoading(true);
    const payload = {
      organization_id: orgId,
      name: name.trim() || null,
      latitude,
      longitude,
      type: type || null,
      description: description.trim() || null,
    };

    let error;
    if (editingHydrant) {
      ({ error } = await supabase.from('hydrants').update(payload).eq('id', editingHydrant.id));
    } else {
      ({ error } = await supabase.from('hydrants').insert(payload));
    }

    setLoading(false);

    if (error) {
      toast.error('Error al crear grifo: ' + error.message);
      return;
    }

    toast.success(editingHydrant ? 'Grifo actualizado' : 'Grifo agregado exitosamente');
    queryClient.invalidateQueries({ queryKey: ['hydrants'] });
    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-info" /> Agregar Grifo
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="hydrant-name">Nombre / Ubicación</Label>
            <Input id="hydrant-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Grifo Av. Principal 123" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="hydrant-lat">Latitud *</Label>
              <Input id="hydrant-lat" value={lat} onChange={(e) => setLat(e.target.value)} placeholder="-33.4489" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hydrant-lng">Longitud *</Label>
              <Input id="hydrant-lng" value={lng} onChange={(e) => setLng(e.target.value)} placeholder="-70.6693" required />
            </div>
          </div>

          {initialCoords && (
            <p className="text-xs text-muted-foreground">📍 Coordenadas capturadas del mapa</p>
          )}

          <div className="space-y-2">
            <Label htmlFor="hydrant-type">Tipo</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger id="hydrant-type">
                <SelectValue placeholder="Seleccionar tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GRIFO COLUMNA">Grifo Columna</SelectItem>
                <SelectItem value="GRIFO POSTE">Grifo Poste</SelectItem>
                <SelectItem value="GRIFO SUBTERRANEO">Grifo Subterráneo</SelectItem>
                <SelectItem value="GRIFO DE PARED">Grifo de Pared</SelectItem>
                <SelectItem value="OTRO">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="hydrant-desc">Descripción</Label>
            <Textarea id="hydrant-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Notas adicionales..." rows={2} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => { resetForm(); onOpenChange(false); }}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar Grifo'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
