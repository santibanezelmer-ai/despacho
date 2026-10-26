import { useEffect, useMemo, useState } from 'react';
import { Loader2, Monitor, Radio, Shield, Truck } from 'lucide-react';
import LeafletMapCanvas, { type MapEmergency, type MapVehicle } from '@/components/map/LeafletMapCanvas';
import { Button } from '@/components/ui/button';
import { requestScreenDisplay as call } from '@/lib/screenDisplay';

/**
 * Pantalla remota sin inicio de sesión (Smart TV / monitor en la misma red).
 * Muestra un PIN; un operador la vincula desde Pantalla Central y elige qué ver.
 * Solo lectura: los datos llegan desde la función screen-display con el secreto local.
 */
const STORAGE_KEY = 'operix.tv.secret';

const STATUS_LABEL: Record<string, string> = {
  despacho: 'Despacho', en_ruta: 'En ruta', en_trabajo: 'En trabajo', controlada: 'Controlada', finalizada: 'Finalizada',
};
const VEH_STATUS: Record<string, string> = {
  disponible: 'Disponible', en_servicio: 'En servicio', mantencion: 'Mantención', fuera_servicio: 'Fuera de servicio',
};

function elapsed(from: string | null, now: number) {
  if (!from) return '';
  const s = Math.max(0, Math.floor((now - new Date(from).getTime()) / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return `${h > 0 ? `${h}:` : ''}${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export default function TvScreen() {
  const [secret, setSecret] = useState<string | null>(() => {
    try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
  });
  const [pin, setPin] = useState<string | null>(null);
  const [state, setState] = useState<any>(null);
  const [now, setNow] = useState(Date.now());
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);

  // Crea un PIN nuevo si no hay secreto guardado
  useEffect(() => {
    if (secret) return;
    let alive = true;
    setError(null);
    call({ action: 'create' }).then((r) => {
      if (!alive) return;
      try { localStorage.setItem(STORAGE_KEY, r.secret); } catch { /* usable for this window even without storage */ }
      setPin(r.pin); setSecret(r.secret);
    }).catch(() => {
      if (alive) setError('No se pudo generar el código. Revisa la conexión y vuelve a intentar.');
    });
    return () => { alive = false; };
  }, [secret, retry]);

  // Consulta estado / datos cada 5 s
  useEffect(() => {
    if (!secret) return;
    let alive = true;
    let inFlight = false;
    const tick = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const r = await call({ action: 'data', secret });
        if (!alive) return;
        if (['invalid', 'revoked', 'expired'].includes(r?.status)) {
          try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore unavailable storage */ }
          setError(null); setState(null); setPin(null); setSecret(null); return;
        }
        if (r?.status === 'pending') setPin(r.pin);
        setError(null);
        setState(r);
      } catch {
        if (alive) setError('Sin conexión con Central. Reintentando…');
      } finally { inFlight = false; }
    };
    tick();
    const id = setInterval(tick, 5000);
    return () => { alive = false; clearInterval(id); };
  }, [secret, retry]);

  if (!state || state.status === 'pending') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background p-8 text-center text-foreground">
        <Monitor className="h-16 w-16 text-emergency" />
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Vincular esta pantalla</h1>
          <p className="text-lg text-muted-foreground">En el computador de la Central, abre <b>Pantalla Central → Pantallas remotas</b> e ingresa este código:</p>
        </div>
        {error ? (
          <div role="alert" className="space-y-3">
            <p className="text-warning">{error}</p>
            <Button variant="outline" onClick={() => { setError(null); setRetry(n => n + 1); }}>Reintentar</Button>
          </div>
        ) : pin ? (
          <p className="font-mono text-7xl font-bold tracking-[0.3em] text-emergency sm:text-8xl">{pin}</p>
        ) : (
          <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
        )}
        <p className="text-sm text-muted-foreground">El código vence en 15 minutos. No se necesita iniciar sesión.</p>
      </main>
    );
  }

  return <>
    {error && <div role="status" className="fixed bottom-4 left-4 z-50 rounded border border-warning bg-background px-4 py-2 text-warning">{error}</div>}
    <PairedView data={state} now={now} />
  </>;
}

function PairedView({ data, now }: { data: any; now: number }) {
  const emergencies: any[] = data.emergencies ?? [];
  const evRows: any[] = data.emergencyVehicles ?? [];
  const vehiclesOf = (id: string) => evRows.filter((r) => r.emergency_id === id).map((r) => r.vehicles?.code).filter(Boolean);
  const busy = new Set(evRows.map((r) => r.vehicle_id));
  const clock = new Date(now).toLocaleTimeString('es-CL', { hour12: data.organization?.time_format === '12h' });

  const header = (
    <header className="flex items-center justify-between border-b border-border bg-card px-6 py-3">
      <div className="flex items-center gap-3">
        <Shield className="h-7 w-7 text-emergency" />
        <div>
          <p className="text-lg font-bold leading-tight">{data.organization?.name ?? 'Operix Dispatch'}</p>
          <p className="text-xs text-muted-foreground">{data.name}</p>
        </div>
      </div>
      <p className="font-mono text-4xl font-bold tabular-nums">{clock}</p>
    </header>
  );

  if (data.view === 'mapa') return <MapView data={data} header={header} vehiclesOf={vehiclesOf} />;

  const emergencyList = (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-xl font-bold"><Radio className="h-5 w-5 text-emergency" /> Emergencias activas ({emergencies.length})</h2>
      {emergencies.length === 0 && <p className="rounded-lg border border-border bg-card p-6 text-center text-muted-foreground">Sin emergencias activas</p>}
      {emergencies.map((e) => (
        <article key={e.id} className="rounded-lg border border-border bg-card p-4" style={{ borderLeft: `6px solid ${e.emergency_keys?.color ?? 'hsl(var(--emergency))'}` }}>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-2xl font-bold">{e.emergency_keys?.code} · {e.emergency_keys?.name}</p>
              <p className="truncate text-lg text-muted-foreground">{e.address}</p>
              <p className="mt-1 text-sm text-muted-foreground">{e.folio} · {STATUS_LABEL[e.status] ?? e.status}</p>
            </div>
            <p className="shrink-0 font-mono text-3xl font-bold tabular-nums text-emergency">{elapsed(e.dispatched_at ?? e.created_at, now)}</p>
          </div>
          {vehiclesOf(e.id).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {vehiclesOf(e.id).map((c: string) => <span key={c} className="rounded bg-muted px-2 py-0.5 font-mono text-sm font-semibold">{c}</span>)}
            </div>
          )}
        </article>
      ))}
    </section>
  );

  if (data.view === 'emergencias') {
    return <main className="min-h-screen bg-background text-foreground">{header}<div className="p-6">{emergencyList}</div></main>;
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      {header}
      <div className="grid gap-6 p-6 lg:grid-cols-[2fr_1fr]">
        {emergencyList}
        <div className="space-y-6">
          <section className="space-y-2">
            <h2 className="flex items-center gap-2 text-xl font-bold"><Truck className="h-5 w-5 text-info" /> Móviles</h2>
            <div className="divide-y divide-border rounded-lg border border-border bg-card">
              {(data.vehicles ?? []).map((v: any) => {
                const inEm = busy.has(v.id);
                return (
                  <div key={v.id} className="flex items-center justify-between px-3 py-2">
                    <span className="font-mono text-lg font-bold">{v.code}</span>
                    <span className={`text-sm font-semibold ${inEm ? 'text-emergency' : v.status === 'disponible' ? 'text-success' : 'text-warning'}`}>
                      {inEm ? 'En emergencia' : VEH_STATUS[v.status] ?? v.status}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
          <section className="space-y-2">
            <h2 className="flex items-center gap-2 text-xl font-bold"><Shield className="h-5 w-5 text-warning" /> Oficiales</h2>
            <div className="divide-y divide-border rounded-lg border border-border bg-card">
              {(data.authorities ?? []).length === 0 && <p className="p-3 text-sm text-muted-foreground">Sin oficiales registrados</p>}
              {(data.authorities ?? []).map((a: any) => (
                <div key={a.id} className="flex items-center justify-between gap-2 px-3 py-2">
                  <div className="min-w-0"><p className="truncate font-semibold">{a.name}</p><p className="truncate text-xs text-muted-foreground">{a.rank} · {a.company}</p></div>
                  <span className={`h-3 w-3 shrink-0 rounded-sm ${a.available ? 'bg-success' : 'bg-destructive'}`} />
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function MapView({ data, header, vehiclesOf }: { data: any; header: React.ReactNode; vehiclesOf: (id: string) => string[] }) {
  const emergencies: MapEmergency[] = useMemo(() => (data.emergencies ?? [])
    .filter((e: any) => e.latitude != null && e.longitude != null)
    .map((e: any) => ({
      id: e.id, latitude: e.latitude, longitude: e.longitude, code: e.emergency_keys?.code ?? '', name: e.emergency_keys?.name ?? '',
      folio: e.folio, address: e.address, statusLabel: STATUS_LABEL[e.status] ?? e.status, statusColor: e.emergency_keys?.color ?? '#dc2626',
      color: e.emergency_keys?.color ?? '#dc2626', vehicleCodes: vehiclesOf(e.id),
    })), [data, vehiclesOf]);
  const vehicles: MapVehicle[] = useMemo(() => {
    const byId = new Map((data.vehicles ?? []).map((v: any) => [v.id, v]));
    return (data.positions ?? []).map((p: any) => {
      const v: any = byId.get(p.vehicle_id) ?? {};
      const age = Date.now() - new Date(p.captured_at).getTime();
      return {
        vehicleId: p.vehicle_id, code: v.code ?? '—', type: v.type ?? null, status: v.status ?? null,
        latitude: p.latitude, longitude: p.longitude, heading: p.heading, speed: p.speed,
        emergencyFolio: null, hasEmergency: !!p.emergency_id, ageLabel: `${Math.round(age / 60000)} min`, stale: age > 10 * 60000,
      };
    });
  }, [data]);
  return (
    <main className="flex h-screen flex-col bg-background text-foreground">
      {header}
      <div className="relative flex-1">
        <LeafletMapCanvas emergencies={emergencies} hydrants={[]} vehicles={vehicles} showEmergencies showHydrants={false} showVehicles onCompatibilityModeChange={() => {}} />
      </div>
    </main>
  );
}
