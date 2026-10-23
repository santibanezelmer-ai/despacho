import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useDeleteLandmark, useSaveLandmark } from '@/hooks/useOrganizationLandmarks';
import { parseAliases, type LocalLandmark } from '@/lib/localLandmarks';

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  landmark?: LocalLandmark | null;
  position?: { lat: number; lng: number } | null;
};

export default function LandmarkFormDialog({ open, onOpenChange, landmark, position }: Props) {
  const save = useSaveLandmark();
  const del = useDeleteLandmark();
  const [name, setName] = useState('');
  const [aliases, setAliases] = useState('');
  const [category, setCategory] = useState('');
  const [notes, setNotes] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');

  useEffect(() => {
    if (!open) return;
    setName(landmark?.name ?? '');
    setAliases((landmark?.aliases ?? []).join(', '));
    setCategory(landmark?.category ?? '');
    setNotes(landmark?.notes ?? '');
    setLat(String(landmark?.latitude ?? position?.lat ?? ''));
    setLng(String(landmark?.longitude ?? position?.lng ?? ''));
  }, [open, landmark, position]);

  const submit = async () => {
    const la = Number(lat), lo = Number(lng);
    if (!name.trim()) return toast.error('Escribe el nombre del punto');
    if (!Number.isFinite(la) || !Number.isFinite(lo) || Math.abs(la) > 90 || Math.abs(lo) > 180) return toast.error('Coordenadas inválidas');
    try {
      await save.mutateAsync({
        id: landmark?.id, name: name.trim(), aliases: parseAliases(aliases),
        category: category.trim() || null, notes: notes.trim() || null, latitude: la, longitude: lo,
      });
      toast.success('Punto local guardado');
      onOpenChange(false);
    } catch {
      toast.error('No se pudo guardar el punto. Revisa tus permisos.');
    }
  };

  const remove = async () => {
    if (!landmark || !confirm(`¿Eliminar "${landmark.name}"?`)) return;
    try { await del.mutateAsync(landmark.id); toast.success('Punto eliminado'); onOpenChange(false); }
    catch { toast.error('No se pudo eliminar el punto.'); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="z-[2000]">
        <DialogHeader><DialogTitle>{landmark ? 'Editar punto local' : 'Nuevo punto local'}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Nombre</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Almacén Don Tito" autoFocus /></div>
          <div><Label>Apodos (separados por coma)</Label><Input value={aliases} onChange={e => setAliases(e.target.value)} placeholder="don tito, esquina tito" /></div>
          <div><Label>Categoría</Label><Input value={category} onChange={e => setCategory(e.target.value)} placeholder="Comercio, Fundo, Curva peligrosa…" /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Latitud</Label><Input value={lat} onChange={e => setLat(e.target.value)} /></div>
            <div><Label>Longitud</Label><Input value={lng} onChange={e => setLng(e.target.value)} /></div>
          </div>
          <div><Label>Referencia de acceso</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Portón verde a mano derecha" rows={2} /></div>
        </div>
        <DialogFooter className="gap-2">
          {landmark && <Button variant="destructive" onClick={remove} disabled={del.isPending}>Eliminar</Button>}
          <Button onClick={submit} disabled={save.isPending}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
