import { useState, useEffect } from 'react';
import { useTimeFormat } from '@/hooks/useTimeFormat';
import { Siren, AlertTriangle, Volume2, Truck, Users, Clock } from 'lucide-react';
import EmergencyKeyGrid from '@/components/dispatch/EmergencyKeyGrid';
import DispatchNotesPanel from '@/components/dispatch/DispatchNotesPanel';
import DispatchForm from '@/components/dispatch/DispatchForm';
import ActiveEmergencyCard from '@/components/dispatch/ActiveEmergencyCard';
import StatsCard from '@/components/dashboard/StatsCard';
import { useActiveEmergencies } from '@/hooks/useEmergencies';
import { useVehicles } from '@/hooks/useVehicles';
import { useVolunteers } from '@/hooks/useVolunteers';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { usePlaySystemSound } from '@/hooks/useSystemSounds';
import type { EmergencyKeyRow } from '@/hooks/useEmergencyKeys';

export default function DispatchConsole() {
  const { formatClock } = useTimeFormat();
  const [selectedKey, setSelectedKey] = useState<EmergencyKeyRow | null>(null);
  const [now, setNow] = useState(new Date());
  const { data: emergencies } = useActiveEmergencies();

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const { data: vehicles } = useVehicles();
  const { data: volunteers } = useVolunteers();
  const queryClient = useQueryClient();
  const playSystemSound = usePlaySystemSound();

  const availableVehicles = (vehicles ?? []).filter(v => v.status === 'disponible').length;
  const totalVehicles = (vehicles ?? []).length;
  const activeVolunteers = (volunteers ?? []).filter(v => v.status === 'activo').length;
  const activeCount = (emergencies ?? []).length;

  const handleSelectKey = (key: EmergencyKeyRow) => {
    // Solo seleccionar clave, NO reproducir tono aquí
    setSelectedKey(key);
    toast.info(`Clave seleccionada: ${key.code} - ${key.name}`, { duration: 3000 });
  };

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

    // Do NOT auto-release vehicles on finalizada — VehicleReturnManager handles individual returns with km tracking

    const { error } = await supabase.from('emergencies').update(update).eq('id', emergencyId);
    if (error) {
      toast.error('Error al actualizar estado');
    } else {
      toast.success(`Estado actualizado a ${newStatus.replace('_', ' ')}`);
      queryClient.invalidateQueries({ queryKey: ['active-emergencies'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Siren className="h-5 w-5 text-emergency" />
            Consola de Despacho
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground font-mono">
            {now.toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right mr-2">
            <span className="text-xl font-mono font-bold text-foreground">
              {formatClock(now)}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => {
              const audio = playSystemSound('prueba_sirena');
              if (!audio) toast.info('Sin sonido de sirena configurado');
            }}
          >
            <Volume2 className="mr-1.5 h-3.5 w-3.5" />
            Prueba Sirena
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs border-warning text-warning hover:bg-warning/10"
            onClick={() => {
              const audio = playSystemSound('mediodia');
              if (!audio) toast.info('Sin sonido de mediodía configurado');
            }}
          >
            <AlertTriangle className="mr-1.5 h-3.5 w-3.5" />
            Mediodía
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatsCard title="Emergencias Activas" value={activeCount} icon={Siren} color="hsl(0, 85%, 55%)" />
        <StatsCard title="Móviles Disponibles" value={availableVehicles} subtitle={`de ${totalVehicles} total`} icon={Truck} color="hsl(145, 65%, 42%)" />
        <StatsCard title="Voluntarios Activos" value={activeVolunteers} icon={Users} color="hsl(35, 95%, 55%)" />
        <StatsCard title="Tiempo Resp. Prom." value="—" subtitle="últimas 24h" icon={Clock} color="hsl(210, 85%, 55%)" />
      </div>

      <div className="console-panel p-4">
        <h2 className="mb-3 text-sm font-semibold text-foreground flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emergency pulse-live" />
          Claves de Despacho
        </h2>
        <EmergencyKeyGrid onSelectKey={handleSelectKey} />
      </div>

      <DispatchNotesPanel />

      {activeCount > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold text-foreground flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-warning pulse-live" />
            Emergencias Activas ({activeCount})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {(emergencies ?? []).map(e => (
              <ActiveEmergencyCard key={e.id} emergency={e} onAdvanceStatus={handleAdvanceStatus} />
            ))}
          </div>
        </div>
      )}

      {selectedKey && (
        <DispatchForm
          emergencyKey={selectedKey}
          onClose={() => setSelectedKey(null)}
        />
      )}
    </div>
  );
}
