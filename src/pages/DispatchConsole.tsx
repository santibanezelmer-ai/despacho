import { useCallback, useMemo } from 'react';
import SystemClock, { SystemDate } from '@/components/dispatch/SystemClock';
import { Siren, AlertTriangle, Volume2, Truck, Users, Clock, Sun, Moon } from 'lucide-react';
import EmergencyKeyGrid from '@/components/dispatch/EmergencyKeyGrid';
import StatsCard from '@/components/dashboard/StatsCard';
import { useVehicles } from '@/hooks/useVehicles';
import { useVolunteers } from '@/hooks/useVolunteers';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { usePlaySystemSound } from '@/hooks/useSystemSounds';
import type { EmergencyKeyRow } from '@/hooks/useEmergencyKeys';
import { useDispatchForm } from '@/contexts/DispatchFormContext';
import { useScreenTheme } from '@/hooks/useScreenTheme';

export default function DispatchConsole() {
  const { openDispatch } = useDispatchForm();
  const { data: vehicles } = useVehicles();
  const { data: volunteers } = useVolunteers();
  const playSystemSound = usePlaySystemSound();
  const { theme, toggleTheme } = useScreenTheme('operix.despacho.theme');

  const { availableVehicles, totalVehicles } = useMemo(() => ({
    availableVehicles: (vehicles ?? []).filter(v => v.status === 'disponible').length,
    totalVehicles: (vehicles ?? []).length,
  }), [vehicles]);
  const activeVolunteers = useMemo(
    () => (volunteers ?? []).filter(v => v.status === 'activo').length,
    [volunteers],
  );
  const handleSelectKey = useCallback((key: EmergencyKeyRow) => {
    // Solo seleccionar clave, NO reproducir tono aquí
    openDispatch(key);
    toast.info(`Clave seleccionada: ${key.code} - ${key.name}`, { duration: 3000 });
  }, [openDispatch]);

  return (
    <div data-theme={theme} className="theme-screen min-h-full bg-background text-foreground p-4 lg:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Siren className="h-5 w-5 text-emergency" />
            Consola de Despacho
          </h1>
          <SystemDate />
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right mr-2">
            <SystemClock />
          </div>
          <button
            onClick={toggleTheme}
            className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
            title={theme === 'dark' ? 'Cambiar a fondo blanco' : 'Cambiar a fondo negro'}
          >
            {theme === 'dark' ? <Sun className="h-3.5 w-3.5 text-warning" /> : <Moon className="h-3.5 w-3.5 text-info" />}
            <span className="hidden md:inline">{theme === 'dark' ? 'Fondo blanco' : 'Fondo negro'}</span>
          </button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={async () => {
              const audio = await playSystemSound('prueba_sirena');
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
            onClick={async () => {
              const audio = await playSystemSound('mediodia');
              if (!audio) toast.info('Sin sonido de mediodía configurado');
            }}
          >
            <AlertTriangle className="mr-1.5 h-3.5 w-3.5" />
            Mediodía
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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

    </div>
  );
}
