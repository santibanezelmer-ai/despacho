import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveEmergencies } from '@/hooks/useEmergencies';
import { useVehicles } from '@/hooks/useVehicles';
import { useVolunteers } from '@/hooks/useVolunteers';
import { Radio, MapPin, Truck, Users, Clock, Shield, Activity } from 'lucide-react';

const statusConfig: Record<string, { label: string; color: string }> = {
  despacho: { label: 'DESPACHO', color: 'hsl(270, 60%, 55%)' },
  en_ruta: { label: 'EN RUTA', color: 'hsl(35, 95%, 55%)' },
  en_trabajo: { label: 'EN TRABAJO', color: 'hsl(0, 85%, 55%)' },
  controlada: { label: 'CONTROLADA', color: 'hsl(210, 85%, 55%)' },
};

const statusPillClass: Record<string, string> = {
  en_emergencia: 'border-emergency/40 bg-emergency/15 text-emergency',
  activo: 'border-success/40 bg-success/15 text-success',
  disponible: 'border-success/40 bg-success/15 text-success',
  en_servicio: 'border-warning/40 bg-warning/15 text-warning',
  mantencion: 'border-warning/40 bg-warning/15 text-warning',
  inactivo: 'border-border bg-muted text-muted-foreground',
  licencia: 'border-border bg-muted text-muted-foreground',
  fuera_servicio: 'border-border bg-muted text-muted-foreground',
};

const volunteerStatusLabel: Record<string, string> = {
  en_emergencia: 'EN EMERGENCIA',
  activo: 'ACTIVO',
  inactivo: 'INACTIVO',
  licencia: 'LICENCIA',
};

const vehicleStatusLabel: Record<string, string> = {
  en_emergencia: 'EN EMERGENCIA',
  disponible: 'DISPONIBLE',
  en_servicio: 'EN SERVICIO',
  mantencion: 'MANTENCIÓN',
  fuera_servicio: 'FUERA DE SERVICIO',
};

function useTimer(startTime: string) {
  const [elapsed, setElapsed] = useState('');
  useEffect(() => {
    const update = () => {
      const diff = Date.now() - new Date(startTime).getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setElapsed(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [startTime]);
  return elapsed;
}

function TVEmergencyCard({ emergency }: { emergency: any }) {
  const timer = useTimer(emergency.created_at);
  const status = statusConfig[emergency.status] ?? statusConfig.despacho;

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-foreground">
            {emergency.emergency_keys?.code ?? '—'} · {emergency.emergency_keys?.name ?? 'Emergencia'}
          </h3>
          <p className="text-xs font-mono text-muted-foreground">{emergency.folio}</p>
        </div>
        <span
          className="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide"
          style={{ backgroundColor: `${status.color}25`, color: status.color }}
        >
          {status.label}
        </span>
      </div>

      <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
        <MapPin className="h-4 w-4 shrink-0" />
        <span className="truncate">{emergency.address}</span>
      </div>

      <div className="mt-3 flex items-center justify-between text-sm">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Truck className="h-4 w-4 text-info" />
          <span>{emergency.vehicleCodes.length} móviles</span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Users className="h-4 w-4 text-warning" />
          <span>{emergency.personnelCount} personal</span>
        </div>
        <div className="flex items-center gap-1.5 text-emergency">
          <Clock className="h-4 w-4" />
          <span className="font-mono font-bold">{timer}</span>
        </div>
      </div>
    </div>
  );
}

function useActiveAssignments(emergencyIds: string[]) {
  return useQuery({
    queryKey: ['central-active-assignments', emergencyIds],
    enabled: emergencyIds.length > 0,
    queryFn: async () => {
      const [personnelResult, vehiclesResult] = await Promise.all([
        supabase
          .from('emergency_personnel')
          .select('volunteer_id')
          .in('emergency_id', emergencyIds),
        supabase
          .from('emergency_vehicles')
          .select('vehicle_id')
          .in('emergency_id', emergencyIds)
          .is('released_at', null),
      ]);

      if (personnelResult.error) throw personnelResult.error;
      if (vehiclesResult.error) throw vehiclesResult.error;

      return {
        volunteerIds: [...new Set((personnelResult.data ?? []).map(row => row.volunteer_id))],
        vehicleIds: [...new Set((vehiclesResult.data ?? []).map(row => row.vehicle_id))],
      };
    },
    refetchInterval: 3000,
  });
}

export default function CentralScreen() {
  const { data: emergencies } = useActiveEmergencies();
  const { data: vehicles } = useVehicles({ refetchInterval: 5000 });
  const { data: volunteers } = useVolunteers({ refetchInterval: 5000 });
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const active = emergencies ?? [];
  const activeEmergencyIds = useMemo(() => active.map(e => e.id), [active]);
  const { data: assignments } = useActiveAssignments(activeEmergencyIds);

  const assignedVolunteerIds = useMemo(
    () => new Set(assignments?.volunteerIds ?? []),
    [assignments]
  );
  const assignedVehicleIds = useMemo(
    () => new Set(assignments?.vehicleIds ?? []),
    [assignments]
  );

  const volunteerRows = useMemo(
    () =>
      (volunteers ?? [])
        .map((volunteer: any) => {
          const statusKey = assignedVolunteerIds.has(volunteer.id) ? 'en_emergencia' : volunteer.status;
          return {
            id: volunteer.id,
            name: volunteer.name,
            company: volunteer.companies?.name ?? 'Sin compañía',
            statusKey,
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name)),
    [volunteers, assignedVolunteerIds]
  );

  const vehicleRows = useMemo(
    () =>
      (vehicles ?? [])
        .map((vehicle: any) => {
          const statusKey = assignedVehicleIds.has(vehicle.id) ? 'en_emergencia' : vehicle.status;
          return {
            id: vehicle.id,
            code: vehicle.code,
            type: vehicle.type,
            company: vehicle.companies?.name ?? 'Sin compañía',
            statusKey,
          };
        })
        .sort((a, b) => a.code.localeCompare(b.code)),
    [vehicles, assignedVehicleIds]
  );

  const totalVehicles = vehicleRows.length;
  const totalVolunteers = volunteerRows.length;
  const availableVehicles = vehicleRows.filter(v => v.statusKey === 'disponible').length;
  const vehiclesInEmergency = vehicleRows.filter(v => v.statusKey === 'en_emergencia').length;
  const activeVolunteers = volunteerRows.filter(v => v.statusKey === 'activo' || v.statusKey === 'en_emergencia').length;

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-emergency" />
          <h1 className="text-3xl font-bold text-foreground">Central de Bomberos</h1>
        </div>
        <div className="flex items-center gap-6">
          {active.length > 0 && (
            <div className="flex items-center gap-2">
              <Radio className="h-5 w-5 text-emergency pulse-live" />
              <span className="text-lg font-bold text-emergency">{active.length} ACTIVA{active.length !== 1 ? 'S' : ''}</span>
            </div>
          )}
          <div className="text-right">
            <div className="text-2xl font-mono font-bold text-foreground">
              {now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <div className="text-sm text-muted-foreground">
              {now.toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>
        </div>
      </div>

      {/* Resource summary bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <div className="rounded-lg border border-border bg-card p-4 flex items-center gap-3">
          <Activity className="h-6 w-6 text-emergency" />
          <div>
            <p className="text-2xl font-mono font-bold text-foreground">{active.length}</p>
            <p className="text-xs text-muted-foreground">Emergencias</p>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 flex items-center gap-3">
          <Truck className="h-6 w-6 text-success" />
          <div>
            <p className="text-2xl font-mono font-bold text-foreground">{availableVehicles}<span className="text-sm text-muted-foreground">/{totalVehicles}</span></p>
            <p className="text-xs text-muted-foreground">Móviles disponibles</p>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 flex items-center gap-3">
          <Truck className="h-6 w-6 text-warning" />
          <div>
            <p className="text-2xl font-mono font-bold text-foreground">{vehiclesInEmergency}</p>
            <p className="text-xs text-muted-foreground">Móviles en emergencia</p>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 flex items-center gap-3">
          <Users className="h-6 w-6 text-info" />
          <div>
            <p className="text-2xl font-mono font-bold text-foreground">{activeVolunteers}<span className="text-sm text-muted-foreground">/{totalVolunteers}</span></p>
            <p className="text-xs text-muted-foreground">Voluntarios activos</p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-4 mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Emergencias activas</h2>
        {active.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {active.map(e => (
              <TVEmergencyCard key={e.id} emergency={e} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Shield className="h-12 w-12 text-success mb-3 opacity-60" />
            <p className="text-2xl font-bold text-success/70">Sin emergencias activas</p>
            <p className="text-base text-muted-foreground mt-1">Sistema operativo — En espera</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded-lg border border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Voluntarios · detalle operativo</h2>
          </div>
          <div className="max-h-[38vh] overflow-y-auto">
            {volunteerRows.map(volunteer => (
              <div key={volunteer.id} className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-2.5 last:border-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{volunteer.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{volunteer.company}</p>
                </div>
                <span
                  className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                    statusPillClass[volunteer.statusKey] ?? statusPillClass.inactivo
                  }`}
                >
                  {volunteerStatusLabel[volunteer.statusKey] ?? volunteer.statusKey}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Móviles · detalle operativo</h2>
          </div>
          <div className="max-h-[38vh] overflow-y-auto">
            {vehicleRows.map(vehicle => (
              <div key={vehicle.id} className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-2.5 last:border-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{vehicle.code} · {vehicle.type}</p>
                  <p className="truncate text-xs text-muted-foreground">{vehicle.company}</p>
                </div>
                <span
                  className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                    statusPillClass[vehicle.statusKey] ?? statusPillClass.fuera_servicio
                  }`}
                >
                  {vehicleStatusLabel[vehicle.statusKey] ?? vehicle.statusKey}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
