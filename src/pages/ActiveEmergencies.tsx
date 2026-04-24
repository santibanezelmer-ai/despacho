import { useActiveEmergencies, updateOfflineEmergency } from '@/hooks/useEmergencies';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import ActiveEmergencyCard from '@/components/dispatch/ActiveEmergencyCard';
import { Radio, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

const statusConfig: Record<string, { label: string; color: string }> = {
  despacho: { label: 'Despacho', color: 'hsl(270, 60%, 55%)' },
  en_ruta: { label: 'En Ruta', color: 'hsl(35, 95%, 55%)' },
  en_trabajo: { label: 'En Trabajo', color: 'hsl(0, 85%, 55%)' },
  controlada: { label: 'Controlada', color: 'hsl(210, 85%, 55%)' },
  finalizada: { label: 'Finalizada', color: 'hsl(145, 65%, 42%)' },
  en_cuartel: { label: 'En Cuartel', color: 'hsl(200, 50%, 50%)' },
};

export default function ActiveEmergencies() {
  const { data: emergencies, isLoading } = useActiveEmergencies();
  const { isOnline } = useOnlineStatus();
  const queryClient = useQueryClient();

  const handleAdvanceStatus = async (emergencyId: string, newStatus: string) => {
    // en_cuartel is auto-managed by VehicleReturnManager
    if (newStatus === 'en_cuartel') return;

    const timestampField: Record<string, string> = {
      en_ruta: 'en_route_at',
      en_trabajo: 'working_at',
      controlada: 'controlled_at',
      finalizada: 'finished_at',
    };

    const update: Record<string, any> = { status: newStatus };
    const field = timestampField[newStatus];
    if (field) update[field] = new Date().toISOString();

    // Offline path: queue the update locally
    if (!isOnline) {
      try {
        await updateOfflineEmergency(emergencyId, update);
        queryClient.invalidateQueries({ queryKey: ['active-emergencies'] });
      } catch (e) {
        toast.error('No se pudo guardar el cambio offline');
      }
      return;
    }

    const { error } = await supabase.from('emergencies').update(update).eq('id', emergencyId);
    if (error) {
      toast.error('Error al actualizar estado');
    } else {
      toast.success(`Estado actualizado`);
      queryClient.invalidateQueries({ queryKey: ['active-emergencies'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Radio className="h-5 w-5 text-warning" />
          Emergencias Activas
        </h1>
        <Button variant="outline" size="sm" className="text-xs">
          <Filter className="mr-1.5 h-3.5 w-3.5" /> Filtrar
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {Object.entries(statusConfig).map(([key, config]) => (
          <button
            key={key}
            className="status-badge transition-opacity hover:opacity-80"
            style={{ backgroundColor: `${config.color}20`, color: config.color }}
          >
            {config.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))}
        </div>
      ) : (emergencies ?? []).length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {(emergencies ?? []).map(e => (
            <ActiveEmergencyCard key={e.id} emergency={e} onAdvanceStatus={handleAdvanceStatus} />
          ))}
        </div>
      ) : (
        <div className="console-panel flex flex-col items-center justify-center py-16 text-center">
          <Radio className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No hay emergencias activas</p>
        </div>
      )}
    </div>
  );
}
