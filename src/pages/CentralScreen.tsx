import { useEffect, useState } from 'react';
import { useActiveEmergencies } from '@/hooks/useEmergencies';
import { Radio, MapPin, Truck, Users, Clock, Flame, Shield } from 'lucide-react';

const statusConfig: Record<string, { label: string; color: string }> = {
  despacho: { label: 'DESPACHO', color: 'hsl(270, 60%, 55%)' },
  en_ruta: { label: 'EN RUTA', color: 'hsl(35, 95%, 55%)' },
  en_trabajo: { label: 'EN TRABAJO', color: 'hsl(0, 85%, 55%)' },
  controlada: { label: 'CONTROLADA', color: 'hsl(210, 85%, 55%)' },
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
  const ek = emergency.emergency_keys;
  const status = statusConfig[emergency.status] ?? statusConfig.despacho;

  return (
    <div className="rounded-xl border-2 overflow-hidden" style={{ borderColor: ek?.color ?? '#dc2626' }}>
      <div className="h-2" style={{ backgroundColor: ek?.color ?? '#dc2626' }} />
      <div className="p-6 bg-card">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span
              className="rounded-lg px-3 py-1.5 text-lg font-mono font-bold"
              style={{ backgroundColor: ek?.color ?? '#dc2626', color: '#fff' }}
            >
              {ek?.code ?? '—'}
            </span>
            <div>
              <h2 className="text-xl font-bold text-foreground">{ek?.name ?? 'Emergencia'}</h2>
              <span className="text-sm font-mono text-muted-foreground">{emergency.folio}</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span
              className="px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider"
              style={{ backgroundColor: `${status.color}25`, color: status.color }}
            >
              {status.label}
            </span>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-emergency" />
              <span className="font-mono text-2xl font-bold text-emergency">{timer}</span>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3 text-base text-muted-foreground">
          <MapPin className="h-5 w-5 shrink-0" />
          <span>{emergency.address}</span>
        </div>

        <div className="mt-4 flex items-center gap-8">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-info" />
            <span className="font-mono text-lg font-bold text-foreground">{emergency.vehicleCodes.length}</span>
            <span className="text-sm text-muted-foreground">móviles</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-warning" />
            <span className="font-mono text-lg font-bold text-foreground">{emergency.personnelCount}</span>
            <span className="text-sm text-muted-foreground">personal</span>
          </div>
        </div>

        {emergency.vehicleCodes.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {emergency.vehicleCodes.map((v: string) => (
              <span key={v} className="rounded-lg bg-muted px-3 py-1 text-sm font-mono font-bold text-foreground">
                {v}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CentralScreen() {
  const { data: emergencies } = useActiveEmergencies();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const active = emergencies ?? [];

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-emergency" />
          <h1 className="text-3xl font-bold text-foreground">Central de Bomberos</h1>
        </div>
        <div className="flex items-center gap-4">
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

      {active.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {active.map(e => (
            <TVEmergencyCard key={e.id} emergency={e} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <Shield className="h-24 w-24 text-success mb-6 opacity-50" />
          <p className="text-3xl font-bold text-success/70">Sin emergencias activas</p>
          <p className="text-lg text-muted-foreground mt-2">Sistema operativo — En espera</p>
        </div>
      )}
    </div>
  );
}
