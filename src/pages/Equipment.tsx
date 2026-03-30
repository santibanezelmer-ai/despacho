import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useVehicles } from '@/hooks/useVehicles';
import { useAuth } from '@/contexts/AuthContext';
import { Wrench, Plus, Pencil, Trash2, Search, Package } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import EquipmentFormDialog from '@/components/equipment/EquipmentFormDialog';

const conditionConfig: Record<string, { label: string; color: string }> = {
  bueno: { label: 'Bueno', color: 'hsl(145, 65%, 42%)' },
  regular: { label: 'Regular', color: 'hsl(35, 95%, 55%)' },
  malo: { label: 'Malo', color: 'hsl(0, 85%, 55%)' },
  fuera_servicio: { label: 'Fuera de Servicio', color: 'hsl(0, 0%, 50%)' },
};

function useEquipment(vehicleId?: string) {
  return useQuery({
    queryKey: ['equipment', vehicleId],
    queryFn: async () => {
      let q = supabase.from('equipment').select('*, vehicles(code, type)').order('name');
      if (vehicleId) q = q.eq('vehicle_id', vehicleId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export default function Equipment() {
  const [search, setSearch] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const { data: vehicles } = useVehicles();
  const { data: equipment, isLoading } = useEquipment(vehicleFilter !== 'all' ? vehicleFilter : undefined);
  const { canWrite } = useAuth();
  const qc = useQueryClient();

  const filtered = (equipment ?? []).filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (item: any) => {
    if (!confirm(`¿Eliminar "${item.name}"?`)) return;
    const { error } = await supabase.from('equipment').delete().eq('id', item.id);
    if (error) toast.error(error.message);
    else { toast.success('Equipamiento eliminado'); qc.invalidateQueries({ queryKey: ['equipment'] }); }
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Wrench className="h-5 w-5 text-warning" /> Equipamiento
        </h1>
        {canWrite && (
          <Button size="sm" onClick={() => { setEditingItem(null); setDialogOpen(true); }} className="bg-emergency text-emergency-foreground hover:bg-emergency/90 text-xs">
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Nuevo Equipo
          </Button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar equipo..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-muted/50" />
        </div>
        <Select value={vehicleFilter} onValueChange={setVehicleFilter}>
          <SelectTrigger className="w-48 bg-muted/50">
            <SelectValue placeholder="Todos los móviles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los móviles</SelectItem>
            {(vehicles ?? []).map(v => (
              <SelectItem key={v.id} value={v.id}>{v.code} - {v.type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-lg" />)}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map(item => {
            const cond = conditionConfig[item.condition ?? 'bueno'] ?? conditionConfig.bueno;
            return (
              <div key={item.id} className="console-panel p-4 hover:border-foreground/20 transition-colors group relative">
                <div className="flex items-start justify-between">
                  <span className="font-semibold text-foreground text-sm">{item.name}</span>
                  <span className="status-badge text-[10px]" style={{ backgroundColor: `${cond.color}20`, color: cond.color }}>
                    {cond.label}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground font-mono">
                  {(item as any).vehicles?.code ?? '—'} · Cant: {item.quantity}
                </p>
                {item.notes && <p className="mt-1 text-xs text-muted-foreground truncate">{item.notes}</p>}
                {canWrite && (
                  <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="sm" variant="ghost" className="h-6 px-1.5" onClick={() => { setEditingItem(item); setDialogOpen(true); }}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-6 px-1.5 text-destructive hover:text-destructive" onClick={() => handleDelete(item)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="console-panel flex flex-col items-center justify-center py-16 text-center">
          <Package className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No hay equipamiento registrado</p>
        </div>
      )}

      <EquipmentFormDialog open={dialogOpen} onClose={() => setDialogOpen(false)} equipment={editingItem} />
    </div>
  );
}
