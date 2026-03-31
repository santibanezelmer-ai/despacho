import { useVehicles } from '@/hooks/useVehicles';
import { Truck, Plus, Search, Users, Pencil, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import VehicleFormDialog from '@/components/vehicles/VehicleFormDialog';

const vehicleStatusConfig: Record<string, { label: string; color: string }> = {
  disponible: { label: 'Disponible', color: 'hsl(145, 65%, 42%)' },
  en_servicio: { label: 'En Servicio', color: 'hsl(0, 85%, 55%)' },
  mantencion: { label: 'Mantención', color: 'hsl(35, 95%, 55%)' },
  fuera_servicio: { label: 'Fuera de Servicio', color: 'hsl(0, 0%, 50%)' },
};

export default function Vehicles() {
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<any>(null);
  const { data: vehicles, isLoading } = useVehicles();
  const { canWrite } = useAuth();
  const qc = useQueryClient();

  const filtered = (vehicles ?? []).filter(v =>
    v.code.toLowerCase().includes(search.toLowerCase()) ||
    v.type.toLowerCase().includes(search.toLowerCase()) ||
    (v.companies?.name ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (v: any) => {
    if (!confirm(`¿Eliminar móvil "${v.code}"?`)) return;
    const { error } = await supabase.from('vehicles').delete().eq('id', v.id);
    if (error) {
      if (error.code === '23503' || error.message?.includes('409')) {
        toast.error('No se puede eliminar: este móvil tiene emergencias, equipamiento u otros registros asociados.');
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success('Móvil eliminado');
      qc.invalidateQueries({ queryKey: ['vehicles'] });
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Truck className="h-5 w-5 text-info" /> Móviles
        </h1>
        {canWrite && (
          <Button size="sm" onClick={() => { setEditingVehicle(null); setDialogOpen(true); }} className="bg-emergency text-emergency-foreground hover:bg-emergency/90 text-xs">
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Nuevo Móvil
          </Button>
        )}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar por código, tipo, compañía..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-muted/50" />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map(v => {
            const st = vehicleStatusConfig[v.status] ?? vehicleStatusConfig.disponible;
            return (
              <div key={v.id} className="console-panel p-4 hover:border-foreground/20 transition-colors group relative">
                <div className="flex items-start justify-between">
                  <span className="text-lg font-mono font-bold text-foreground">{v.code}</span>
                  <span className="status-badge" style={{ backgroundColor: `${st.color}20`, color: st.color }}>
                    {st.label}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{v.type}</p>
                <p className="text-xs text-muted-foreground">{v.companies?.name ?? '—'}</p>
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" />
                    <span>Cap. {v.capacity}</span>
                  </div>
                  {canWrite && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="sm" variant="ghost" className="h-6 px-1.5" onClick={() => { setEditingVehicle(v); setDialogOpen(true); }}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-6 px-1.5 text-destructive hover:text-destructive" onClick={() => handleDelete(v)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <VehicleFormDialog open={dialogOpen} onClose={() => setDialogOpen(false)} vehicle={editingVehicle} />
    </div>
  );
}
