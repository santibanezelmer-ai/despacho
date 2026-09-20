import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { MapPin, Plus, Trash2 } from 'lucide-react';
import type { HydrantOutlet, HydrantStatus } from '@/lib/hydrants';

type HydrantFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialCoords?: { lat: number; lng: number } | null;
  editingHydrant?: { id: string; name: string; lat: number; lng: number; type: string | null; description: string | null; hydrantNumber: string | null; status: HydrantStatus; outlets: HydrantOutlet[]; flowLpm: number | null; pressureBar: number | null; lastInspection: string | null; observations: string | null } | null;
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
  const [hydrantNumber, setHydrantNumber] = useState('');
  const [status, setStatus] = useState<HydrantStatus>('sin_informacion');
  const [outlets, setOutlets] = useState<HydrantOutlet[]>([]);
  const [flowLpm, setFlowLpm] = useState('');
  const [pressureBar, setPressureBar] = useState('');
  const [lastInspection, setLastInspection] = useState('');
  const [observations, setObservations] = useState('');

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
    setHydrantNumber(editingHydrant.hydrantNumber ?? '');
    setStatus(editingHydrant.status);
    setOutlets(editingHydrant.outlets);
    setFlowLpm(editingHydrant.flowLpm?.toString() ?? '');
    setPressureBar(editingHydrant.pressureBar?.toString() ?? '');
    setLastInspection(editingHydrant.lastInspection ?? '');
    setObservations(editingHydrant.observations ?? '');
    setLastEditing(editingHydrant);
  }

  const resetForm = () => {
    setName('');
    setLat('');
    setLng('');
    setType('');
    setDescription('');
    setHydrantNumber('');
    setStatus('sin_informacion');
    setOutlets([]);
    setFlowLpm('');
    setPressureBar('');
    setLastInspection('');
    setObservations('');
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
      hydrant_number: hydrantNumber.trim() || null,
      status,
      outlets: outlets.map(({ id, diameterMm }) => ({ id, diameterMm })),
      flow_lpm: flowLpm ? Number(flowLpm) : null,
      pressure_bar: pressureBar ? Number(pressureBar) : null,
      last_inspection: lastInspection || null,
      observations: observations.trim() || null,
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
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-info" /> {editingHydrant ? 'Editar Grifo' : 'Agregar Grifo'}
          </DialogTitle>
          <DialogDescription>Registra la condición y las conexiones disponibles sin completar datos que no conozcas.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid max-h-[72vh] grid-cols-1 gap-4 overflow-y-auto pr-2 sm:grid-cols-2">
          <div className="grid grid-cols-1 gap-3 sm:col-span-2 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="hydrant-number">ID / número</Label>
              <Input id="hydrant-number" value={hydrantNumber} onChange={(e) => setHydrantNumber(e.target.value)} placeholder="Ej: G-024" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hydrant-status">Estado</Label>
              <Select value={status} onValueChange={(value) => setStatus(value as HydrantStatus)}>
                <SelectTrigger id="hydrant-status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="operativo">Operativo</SelectItem>
                  <SelectItem value="observaciones">Con observaciones</SelectItem>
                  <SelectItem value="averiado">Averiado / Fuera de servicio</SelectItem>
                  <SelectItem value="sin_informacion">Sin información</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="hydrant-name">Nombre / Ubicación</Label>
            <Input id="hydrant-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Grifo Av. Principal 123" />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:col-span-2 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="hydrant-lat">Latitud *</Label>
              <Input id="hydrant-lat" value={lat} onChange={(e) => setLat(e.target.value)} placeholder="-33.4489" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hydrant-lng">Longitud *</Label>
              <Input id="hydrant-lng" value={lng} onChange={(e) => setLng(e.target.value)} placeholder="-70.6693" required />
            </div>
          </div>

          {initialCoords && <p className="text-xs text-muted-foreground sm:col-span-2">Coordenadas capturadas del mapa</p>}

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
            <Label htmlFor="hydrant-inspection">Última inspección</Label>
            <Input id="hydrant-inspection" type="date" value={lastInspection} onChange={(e) => setLastInspection(e.target.value)} />
          </div>

          <div className="space-y-3 rounded-md border border-info/30 bg-info/5 p-4 sm:col-span-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Label>Bocas / salidas</Label>
                <p className="text-xs text-muted-foreground">Cada salida mantiene su propio diámetro.</p>
              </div>
              <Button type="button" size="sm" variant="outline" className="gap-1" onClick={() => setOutlets((current) => [...current, { id: crypto.randomUUID(), diameterMm: 75 }])}>
                <Plus className="h-4 w-4" /> Agregar
              </Button>
            </div>
            {outlets.length === 0 ? <p className="text-sm text-muted-foreground">Sin bocas registradas</p> : outlets.map((outlet, index) => (
              <div key={outlet.id} className="flex items-center gap-2">
                <span className="w-14 text-xs font-medium text-muted-foreground">Boca {index + 1}</span>
                <Input type="number" min="1" step="1" value={outlet.diameterMm} aria-label={`Diámetro de boca ${index + 1}`} onChange={(e) => setOutlets((current) => current.map((item) => item.id === outlet.id ? { ...item, diameterMm: Number(e.target.value) } : item))} />
                <span className="text-sm font-medium text-muted-foreground">mm</span>
                <Button type="button" size="icon" variant="ghost" aria-label={`Eliminar boca ${index + 1}`} onClick={() => setOutlets((current) => current.filter((item) => item.id !== outlet.id))}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:col-span-2 sm:grid-cols-2">
            <div className="space-y-2"><Label htmlFor="hydrant-flow">Caudal (L/min)</Label><Input id="hydrant-flow" type="number" min="0" step="0.1" value={flowLpm} onChange={(e) => setFlowLpm(e.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="hydrant-pressure">Presión (bar)</Label><Input id="hydrant-pressure" type="number" min="0" step="0.1" value={pressureBar} onChange={(e) => setPressureBar(e.target.value)} /></div>
          </div>
          <div className="space-y-2"><Label htmlFor="hydrant-observations">Observaciones operativas</Label><Textarea id="hydrant-observations" value={observations} onChange={(e) => setObservations(e.target.value)} placeholder="Novedades de inspección, acceso o funcionamiento..." rows={3} /></div>

          <div className="space-y-2">
            <Label htmlFor="hydrant-desc">Descripción</Label>
            <Textarea id="hydrant-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Notas adicionales..." rows={2} />
          </div>

          <div className="flex justify-end gap-2 pt-2 sm:col-span-2">
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
