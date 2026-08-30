import { useEffect, useMemo, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveEmergencies } from '@/hooks/useEmergencies';
import { useVehicles } from '@/hooks/useVehicles';
import { useVolunteers } from '@/hooks/useVolunteers';
import { Radio, MapPin, Truck, Users, Clock, Shield, Activity, Search, Map, QrCode, ExternalLink, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useTimeFormat } from '@/hooks/useTimeFormat';

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
  no_disponible: 'border-destructive/40 bg-destructive/15 text-destructive',
  en_servicio: 'border-warning/40 bg-warning/15 text-warning',
  mantencion: 'border-warning/40 bg-warning/15 text-warning',
  inactivo: 'border-border bg-muted text-muted-foreground',
  licencia: 'border-border bg-muted text-muted-foreground',
  fuera_servicio: 'border-border bg-muted text-muted-foreground',
};

const availabilityLabel: Record<string, string> = {
  en_emergencia: 'En emergencia',
  disponible: 'Disponible',
  no_disponible: 'No disponible',
};

const availabilitySquare: Record<string, string> = {
  en_emergencia: 'bg-emergency',
  disponible: 'bg-success',
  no_disponible: 'bg-destructive',
};


const vehicleStatusLabel: Record<string, string> = {
  en_emergencia: 'EN EMERG.',
  disponible: 'DISPONIBLE',
  en_servicio: 'EN SERVICIO',
  mantencion: 'MANTENCIÓN',
  fuera_servicio: 'FUERA SERV.',
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
        supabase.from('emergency_personnel').select('volunteer_id').in('emergency_id', emergencyIds),
        supabase.from('emergency_vehicles').select('vehicle_id').in('emergency_id', emergencyIds).is('released_at', null),
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

function ShareModal({ onClose }: { onClose: () => void }) {
  const currentUrl = window.location.origin + '/pantalla-central';
  const mapUrl = window.location.origin + '/pantalla-mapa';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full mx-4 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground">Compartir Pantallas</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
        </div>
        <p className="text-sm text-muted-foreground">
          Escanea el QR o copia el enlace para abrir en cualquier pantalla conectada a internet.
        </p>

        <div className="space-y-4">
          <div className="border border-border rounded-lg p-4 space-y-3">
            <p className="text-sm font-semibold text-foreground flex items-center gap-2"><Shield className="h-4 w-4 text-emergency" /> Vista Central</p>
            <div className="flex justify-center"><QRCodeSVG value={currentUrl} size={140} bgColor="transparent" fgColor="hsl(var(--foreground))" /></div>
            <div className="flex items-center gap-2">
              <input readOnly value={currentUrl} className="flex-1 bg-muted border border-border rounded px-2 py-1.5 text-xs font-mono text-foreground" />
              <button onClick={() => { navigator.clipboard.writeText(currentUrl); }} className="shrink-0 px-3 py-1.5 rounded bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90">Copiar</button>
            </div>
          </div>

          <div className="border border-border rounded-lg p-4 space-y-3">
            <p className="text-sm font-semibold text-foreground flex items-center gap-2"><Map className="h-4 w-4 text-info" /> Mapa Operativo</p>
            <div className="flex justify-center"><QRCodeSVG value={mapUrl} size={140} bgColor="transparent" fgColor="hsl(var(--foreground))" /></div>
            <div className="flex items-center gap-2">
              <input readOnly value={mapUrl} className="flex-1 bg-muted border border-border rounded px-2 py-1.5 text-xs font-mono text-foreground" />
              <button onClick={() => { navigator.clipboard.writeText(mapUrl); }} className="shrink-0 px-3 py-1.5 rounded bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90">Copiar</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CentralScreen() {
  const { formatClock } = useTimeFormat();
  const { data: emergencies } = useActiveEmergencies();
  const { data: vehicles } = useVehicles({ refetchInterval: 5000 });
  const { data: volunteers } = useVolunteers({ refetchInterval: 5000 });
  const [now, setNow] = useState(new Date());
  const [vehSearch, setVehSearch] = useState('');
  const [showShare, setShowShare] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const active = useMemo(() => emergencies ?? [], [emergencies]);
  const activeEmergencyIds = useMemo(() => active.map(e => e.id), [active]);
  const { data: assignments } = useActiveAssignments(activeEmergencyIds);

  const assignedVolunteerIds = useMemo(() => new Set(assignments?.volunteerIds ?? []), [assignments]);
  const assignedVehicleIds = useMemo(() => new Set(assignments?.vehicleIds ?? []), [assignments]);

  const volunteerRows = useMemo(
    () =>
      (volunteers ?? [])
        .map((volunteer: any) => {
          const statusKey = assignedVolunteerIds.has(volunteer.id) ? 'en_emergencia' : volunteer.status;
          return { id: volunteer.id, name: volunteer.name, company: volunteer.companies?.name ?? 'Sin compañía', statusKey };
        })
        .filter(v => v.statusKey === 'activo' || v.statusKey === 'en_emergencia')
        .sort((a, b) => {
          if (a.statusKey === 'en_emergencia' && b.statusKey !== 'en_emergencia') return -1;
          if (a.statusKey !== 'en_emergencia' && b.statusKey === 'en_emergencia') return 1;
          return a.name.localeCompare(b.name);
        }),
    [volunteers, assignedVolunteerIds]
  );

  // Voluntarios con grado/cargo de autoridad — disponibilidad operacional
  const authorityRows = useMemo(
    () =>
      (volunteers ?? [])
        .filter((v: any) => v.ranks?.is_authority && v.status === 'activo')
        .map((v: any) => ({
          id: v.id,
          name: v.name,
          rank: v.ranks?.name ?? '—',
          company: v.companies?.name ?? 'Sin compañía',
          availability: assignedVolunteerIds.has(v.id)
            ? 'en_emergencia'
            : v.available
              ? 'disponible'
              : 'no_disponible',
        }))
        .sort((a, b) => {
          const order = { en_emergencia: 0, disponible: 1, no_disponible: 2 } as Record<string, number>;
          const diff = order[a.availability] - order[b.availability];
          return diff !== 0 ? diff : a.name.localeCompare(b.name);
        }),
    [volunteers, assignedVolunteerIds]
  );


  const vehicleRows = useMemo(
    () =>
      (vehicles ?? [])
        .map((vehicle: any) => {
          const statusKey = assignedVehicleIds.has(vehicle.id) ? 'en_emergencia' : vehicle.status;
          return { id: vehicle.id, code: vehicle.code, type: vehicle.type, company: vehicle.companies?.name ?? 'Sin compañía', statusKey, odometer: vehicle.odometer };
        })
        .filter(v => v.statusKey === 'disponible' || v.statusKey === 'en_emergencia')
        .sort((a, b) => {
          if (a.statusKey === 'en_emergencia' && b.statusKey !== 'en_emergencia') return -1;
          if (a.statusKey !== 'en_emergencia' && b.statusKey === 'en_emergencia') return 1;
          return a.code.localeCompare(b.code);
        }),
    [vehicles, assignedVehicleIds]
  );

  const filteredVehicles = useMemo(() => {
    if (!vehSearch) return vehicleRows;
    const q = vehSearch.toLowerCase();
    return vehicleRows.filter(v => v.code.toLowerCase().includes(q) || v.company.toLowerCase().includes(q) || v.type.toLowerCase().includes(q));
  }, [vehicleRows, vehSearch]);

  const totalVehicles = (vehicles ?? []).length;
  const totalVolunteers = (volunteers ?? []).length;
  const availableVehicles = vehicleRows.filter(v => v.statusKey === 'disponible').length;
  const vehiclesInEmergency = vehicleRows.filter(v => v.statusKey === 'en_emergencia').length;

  const openMapPopout = useCallback(() => {
    window.open('/pantalla-mapa', '_blank', 'width=1200,height=800,toolbar=no,menubar=no');
  }, []);

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <img src="/favicon.png" alt="Operix" className="h-9 w-9 rounded-lg object-cover" />
          <h1 className="text-3xl font-bold text-foreground">Operix</h1>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={openMapPopout}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card text-sm text-muted-foreground hover:text-foreground hover:border-info transition-colors"
            title="Abrir mapa en ventana emergente"
          >
            <Map className="h-4 w-4 text-info" />
            <span className="hidden md:inline">Mapa</span>
            <ExternalLink className="h-3 w-3" />
          </button>
          <button
            onClick={() => setShowShare(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card text-sm text-muted-foreground hover:text-foreground hover:border-primary transition-colors"
            title="Compartir pantallas"
          >
            <QrCode className="h-4 w-4 text-primary" />
            <span className="hidden md:inline">Compartir</span>
          </button>
          {active.length > 0 && (
            <div className="flex items-center gap-2">
              <Radio className="h-5 w-5 text-emergency pulse-live" />
              <span className="text-lg font-bold text-emergency">{active.length} ACTIVA{active.length !== 1 ? 'S' : ''}</span>
            </div>
          )}
          <div className="text-right">
            <div className="text-2xl font-mono font-bold text-foreground">
              {formatClock(now)}
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
            <p className="text-2xl font-mono font-bold text-foreground">{volunteerRows.length}<span className="text-sm text-muted-foreground">/{totalVolunteers}</span></p>
            <p className="text-xs text-muted-foreground">Voluntarios activos</p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-4 mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Emergencias activas</h2>
        {active.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {active.map(e => <TVEmergencyCard key={e.id} emergency={e} />)}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Shield className="h-12 w-12 text-success mb-3 opacity-60" />
            <p className="text-2xl font-bold text-success/70">Sin emergencias activas</p>
            <p className="text-base text-muted-foreground mt-1">Sistema operativo — En espera</p>
          </div>
        )}
      </div>

      {/* Disponibilidad del personal de mando (solo lectura) */}
      <div className="rounded-lg border border-border bg-card mb-4">
        <div className="border-b border-border px-4 py-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Shield className="h-4 w-4 text-warning" /> Disponibilidad del personal de mando
          </h2>
          <span className="text-xs font-mono text-muted-foreground">
            {authorityRows.filter(a => a.availability === 'disponible').length}/{authorityRows.length} disponibles
          </span>
        </div>
        {authorityRows.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-px bg-border/30">
            {authorityRows.map(a => (
              <div key={a.id} className="flex items-center justify-between gap-3 bg-card px-4 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground flex items-center gap-2">
                    <span
                      className={`inline-block h-4 w-4 rounded ${availabilitySquare[a.availability] ?? 'bg-muted'}`}
                      aria-hidden="true"
                    />
                    {a.rank} {a.name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{a.company}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    statusPillClass[a.availability] ?? statusPillClass.inactivo
                  }`}
                >
                  {availabilityLabel[a.availability]}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            Sin personal de mando configurado — marca los grados de autoridad en Ajustes › Rangos
          </p>
        )}
      </div>


      {/* Móviles - ancho completo, agrupados por compañía */}
      <div className="rounded-lg border border-border bg-card">
        <div className="border-b border-border px-4 py-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground shrink-0 flex items-center gap-2">
            <Truck className="h-4 w-4 text-success" /> Móviles
          </h2>
          <div className="flex items-center gap-2 flex-1 max-w-xs">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar..."
                value={vehSearch}
                onChange={e => setVehSearch(e.target.value)}
                className="w-full bg-muted border border-border rounded pl-7 pr-2 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <span className="text-xs font-mono text-muted-foreground shrink-0">{filteredVehicles.length}</span>
          </div>
        </div>
        <div className="max-h-[46vh] overflow-y-auto">
          {vehiclesByCompany.length > 0 ? (
            vehiclesByCompany.map(([company, vehs]) => (
              <div key={company}>
                <div className="sticky top-0 bg-muted/80 backdrop-blur-sm px-4 py-1.5 border-b border-border/40">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{company} ({vehs.length})</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2 p-3">
                  {vehs.map(vehicle => {
                    const inEmergency = vehicle.statusKey === 'en_emergencia';
                    return (
                      <div
                        key={vehicle.id}
                        className={`relative overflow-hidden rounded-lg border px-3 py-2.5 ${
                          inEmergency
                            ? 'border-emergency/50 bg-emergency/10'
                            : 'border-success/30 bg-success/5'
                        }`}
                      >
                        <span
                          className={`absolute inset-y-0 left-0 w-1 ${inEmergency ? 'bg-emergency' : 'bg-success'}`}
                          aria-hidden="true"
                        />
                        <div className="flex items-center justify-between gap-2 pl-1">
                          <p className="truncate text-base font-mono font-bold text-foreground">{vehicle.code}</p>
                          <span
                            className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              statusPillClass[vehicle.statusKey] ?? statusPillClass.fuera_servicio
                            }`}
                          >
                            {vehicleStatusLabel[vehicle.statusKey] ?? vehicle.statusKey}
                          </span>
                        </div>
                        <div className="mt-0.5 flex items-center justify-between gap-2 pl-1 text-xs text-muted-foreground">
                          <span className="truncate">{vehicle.type}</span>
                          {vehicle.odometer != null && (
                            <span className="shrink-0 font-mono text-[10px]">{vehicle.odometer.toLocaleString()} km</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              {vehSearch ? 'Sin resultados' : 'Sin móviles operativos'}
            </p>
          )}
        </div>
      </div>

      {showShare && <ShareModal onClose={() => setShowShare(false)} />}
    </div>
  );
}
