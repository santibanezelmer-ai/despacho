import { useState } from 'react';
import { Siren, AlertTriangle, Volume2, Truck, Users, Clock } from 'lucide-react';
import EmergencyKeyGrid from '@/components/dispatch/EmergencyKeyGrid';
import DispatchForm from '@/components/dispatch/DispatchForm';
import ActiveEmergencyCard from '@/components/dispatch/ActiveEmergencyCard';
import StatsCard from '@/components/dashboard/StatsCard';
import { activeEmergencies, vehicles, type EmergencyKey } from '@/data/mock-data';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function DispatchConsole() {
  const [selectedKey, setSelectedKey] = useState<EmergencyKey | null>(null);

  const handleSelectKey = (key: EmergencyKey) => {
    setSelectedKey(key);
    toast.info(`Reproduciendo tono: ${key.name}`, { duration: 3000 });
  };

  const handleDispatch = () => {
    toast.success('Emergencia despachada correctamente');
    setSelectedKey(null);
  };

  const availableVehicles = vehicles.filter(v => v.status === 'disponible').length;
  const activeCount = activeEmergencies.filter(e => e.status !== 'finalizada').length;

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Siren className="h-5 w-5 text-emergency" />
            Consola de Despacho
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground font-mono">
            {new Date().toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="text-xs">
            <Volume2 className="mr-1.5 h-3.5 w-3.5" />
            Prueba Sirena
          </Button>
          <Button variant="outline" size="sm" className="text-xs border-warning text-warning hover:bg-warning/10">
            <AlertTriangle className="mr-1.5 h-3.5 w-3.5" />
            Mediodía
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatsCard title="Emergencias Activas" value={activeCount} icon={Siren} color="hsl(0, 85%, 55%)" />
        <StatsCard title="Móviles Disponibles" value={availableVehicles} subtitle={`de ${vehicles.length} total`} icon={Truck} color="hsl(145, 65%, 42%)" />
        <StatsCard title="Personal en Servicio" value={24} subtitle="de 85 activos" icon={Users} color="hsl(35, 95%, 55%)" />
        <StatsCard title="Tiempo Resp. Prom." value="4:32" subtitle="últimas 24h" icon={Clock} color="hsl(210, 85%, 55%)" />
      </div>

      {/* Emergency Keys */}
      <div className="console-panel p-4">
        <h2 className="mb-3 text-sm font-semibold text-foreground flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emergency pulse-live" />
          Claves de Despacho
        </h2>
        <EmergencyKeyGrid onSelectKey={handleSelectKey} />
      </div>

      {/* Active Emergencies */}
      {activeEmergencies.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold text-foreground flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-warning pulse-live" />
            Emergencias Activas ({activeCount})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {activeEmergencies.filter(e => e.status !== 'finalizada').map(e => (
              <ActiveEmergencyCard key={e.id} emergency={e} />
            ))}
          </div>
        </div>
      )}

      {/* Dispatch form modal */}
      {selectedKey && (
        <DispatchForm
          emergencyKey={selectedKey}
          onClose={() => setSelectedKey(null)}
          onSubmit={handleDispatch}
        />
      )}
    </div>
  );
}
