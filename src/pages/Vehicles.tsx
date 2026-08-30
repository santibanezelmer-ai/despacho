import { useVehicles } from '@/hooks/useVehicles';
import { Truck, Plus, Search, Users, Pencil, Trash2, FileSearch, AlertTriangle, Fuel } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import VehicleFormDialog from '@/components/vehicles/VehicleFormDialog';
import VehicleProfileDialog, { VEHICLE_STATUS_META } from '@/components/vehicles/VehicleProfileDialog';
import { expiryLevel, maintenanceAlert } from '@/hooks/useVehicleProfile';

export default function Vehicles() {
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [profileVehicle, setProfileVehicle] = useState<any>(null);
  const [editingVehicle, setEditingVehicle] = useState<any>(null);
  const { data: vehicles, isLoading } = useVehicles();
  const { canWrite } = useAuth();
  const { orgId, scopedCompanyId } = useOrganization();
  const qc = useQueryClient();

  // Alertas por móvil (mantención vencida/próxima y documentos por vencer)
  const { data: alerts } = useQuery({
    queryKey: ['vehicle-alerts', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const [m, d] = await Promise.all([
        (supabase as any).from('vehicle_maintenance')
          .select('vehicle_id, next_service_date, next_service_odometer, service_date')
          .eq('organization_id', orgId).order('service_date', { ascending: false }),
        (supabase as any).from('vehicle_documents')
          .select('vehicle_id, doc_type, expires_at').eq('organization_id', orgId),
      ]);
      return { maintenance: (m.data ?? []) as any[], documents: (d.data ?? []) as any[] };
    },
  });

  const alertFor = (v: any) => {
    const mt = maintenanceAlert((alerts?.maintenance ?? []).filter(m => m.vehicle_id === v.id), v.odometer);
    const docs = (alerts?.documents ?? []).filter(d => d.vehicle_id === v.id && expiryLevel(d.expires_at) !== 'ok');
    const danger = mt.level === 'danger' || docs.some(d => expiryLevel(d.expires_at) === 'danger');
    const count = (mt.message ? 1 : 0) + docs.length;
    return { count, danger };
  };

  const scoped = (vehicles ?? []).filter((v: any) =>
    scopedCompanyId ? v.company_id === scopedCompanyId : true
  );
  const filtered = scoped.filter((v: any) =>
    v.code.toLowerCase().includes(search.toLowerCase()) ||
    v.type.toLowerCase().includes(search.toLowerCase()) ||
    (v.brand ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (v.model ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (v.plate ?? '').toLowerCase().includes(search.toLowerCase()) ||
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
        <Input placeholder="Buscar por código, tipo, marca, patente, compañía..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-muted/50" />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map((v: any) => {
            const st = VEHICLE_STATUS_META[v.status] ?? VEHICLE_STATUS_META.disponible;
            const al = alertFor(v);
            return (
              <div key={v.id} className="console-panel p-4 hover:border-foreground/20 transition-colors group relative">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-lg font-mono font-bold text-foreground">{v.code}</span>
                  <span className="status-badge" style={{ backgroundColor: `${st.color}20`, color: st.color }}>
                    {st.icon} {st.label}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {v.type}
                  {(v.brand || v.model) && ` · ${[v.brand, v.model].filter(Boolean).join(' ')}`}
                </p>
                <p className="text-xs text-muted-foreground">{v.companies?.name ?? '—'}</p>

                {al.count > 0 && (
                  <button
                    onClick={() => setProfileVehicle(v)}
                    className={`mt-2 flex items-center gap-1.5 text-[11px] ${al.danger ? 'text-emergency' : 'text-warning'}`}
                  >
                    <AlertTriangle className="h-3 w-3" />
                    {al.count} {al.count === 1 ? 'alerta' : 'alertas'} de mantención / documentos
                  </button>
                )}

                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" /> Cap. {v.capacity}</span>
                    {v.odometer != null && (
                      <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded">
                        {v.odometer.toLocaleString()} km
                      </span>
                    )}
                    {v.fuel_level != null && (
                      <span className="flex items-center gap-1 font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded">
                        <Fuel className="h-3 w-3" /> {v.fuel_level}%
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" className="h-7 px-1.5" title="Ficha del móvil" onClick={() => setProfileVehicle(v)}>
                      <FileSearch className="h-4 w-4 text-info" />
                    </Button>
                    {canWrite && (
                      <>
                        <Button size="sm" variant="ghost" className="h-7 px-1.5" title="Editar" onClick={() => { setEditingVehicle(v); setDialogOpen(true); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 px-1.5 text-destructive hover:text-destructive" title="Eliminar" onClick={() => handleDelete(v)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <VehicleFormDialog open={dialogOpen} onClose={() => setDialogOpen(false)} vehicle={editingVehicle} />
      <VehicleProfileDialog open={!!profileVehicle} onClose={() => setProfileVehicle(null)} vehicle={profileVehicle} />
    </div>
  );
}
