import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTimeFormat } from '@/hooks/useTimeFormat';
import { ArrowLeft, MapPin, Navigation, Clock, FileText, Loader2, Truck, Megaphone, Ban } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';

interface Props { organizationId: string; orgName?: string; orgLogoUrl?: string | null }

const STATUS_LABEL: Record<string, string> = {
  despacho: 'Despacho', en_ruta: 'En ruta', en_trabajo: 'En trabajo',
  controlada: 'Controlada', finalizada: 'Finalizada', en_cuartel: 'Finalizada',
};

const STATUS_TONE: Record<string, string> = {
  despacho: 'bg-emergency text-emergency-foreground',
  en_ruta: 'bg-amber-500 text-black',
  en_trabajo: 'bg-orange-500 text-black',
  controlada: 'bg-blue-500 text-white',
  finalizada: 'bg-muted text-muted-foreground',
  en_cuartel: 'bg-muted text-muted-foreground',
};

export default function VoluntarioDetail({ organizationId, orgName, orgLogoUrl }: Props) {
  const { formatDateTime } = useTimeFormat(organizationId);
  const fmt = (d?: string | null) => formatDateTime(d);
  const { id } = useParams();
  const nav = useNavigate();

  const { data: emg, isLoading } = useQuery({
    queryKey: ['vol-emg', id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('emergencies')
        .select('*, emergency_keys(code, name, color)')
        .eq('id', id).eq('organization_id', organizationId).single();
      if (error) throw error;
      return data;
    },
    refetchInterval: 15_000,
  });

  const { data: vehicles } = useQuery({
    queryKey: ['vol-emg-vehicles', id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('emergency_vehicles')
        .select('id, released_at, vehicles(code, type, companies(name, logo_url))')
        .eq('emergency_id', id);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!id,
    refetchInterval: 5_000,
    refetchOnMount: 'always',
  });

  if (isLoading || !emg) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-emergency" /></div>;
  }

  const hasCoords = emg.latitude && emg.longitude;
  const mapsUrl = hasCoords
    ? `https://www.google.com/maps/dir/?api=1&destination=${emg.latitude},${emg.longitude}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(emg.address)}`;
  const wazeUrl = hasCoords ? `https://waze.com/ul?ll=${emg.latitude},${emg.longitude}&navigate=yes` : null;

  return (
    <div className="max-w-md mx-auto pb-8">

      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border/60 px-4 py-3 flex items-center gap-3">
        <button onClick={() => nav(-1)} aria-label="Volver" className="p-2 -ml-2 rounded-lg active:bg-muted"><ArrowLeft className="h-5 w-5" /></button>
        {orgLogoUrl && (
          <div className="h-8 w-8 rounded bg-card border border-border/60 overflow-hidden flex items-center justify-center shrink-0">
            <Logo src={orgLogoUrl} alt={orgName || ''} className="max-h-8 max-w-8 object-contain" hideWhenEmpty />
          </div>
        )}
        <div className="flex-1 min-w-0">
          {orgName && <p className="font-cond uppercase tracking-widest text-[9px] text-muted-foreground truncate">{orgName}</p>}
          <p className="font-cond uppercase tracking-widest text-xs text-foreground truncate">{STATUS_LABEL[emg.status] || emg.status}</p>
        </div>
        <span className={`font-cond uppercase tracking-widest text-[10px] px-2 py-1 rounded ${STATUS_TONE[emg.status] || 'bg-muted text-muted-foreground'}`}>
          {STATUS_LABEL[emg.status] || emg.status}
        </span>
      </header>


      {/* Hero */}
      <div
        className="mx-4 mt-4 rounded-2xl p-5 text-white relative overflow-hidden"
        style={{ backgroundColor: emg.emergency_keys?.color || '#dc2626' }}
      >
        <div className="absolute inset-0 opacity-20" style={{ background: 'radial-gradient(circle at 90% 10%, white, transparent 55%)' }} />
        <div className="relative">
          <p className="font-cond uppercase tracking-[0.3em] text-[10px] opacity-90">Clave {emg.emergency_keys?.code}</p>
          <p className="font-display text-4xl leading-none mt-1 uppercase">{emg.emergency_keys?.name || 'Emergencia'}</p>
          <p className="text-sm opacity-90 mt-3 flex items-start gap-1.5">
            <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{emg.address}</span>
          </p>
        </div>
      </div>

      {/* Big Navigation CTA */}
      <div className="px-4 mt-4 grid grid-cols-2 gap-2">
        <a href={mapsUrl} target="_blank" rel="noopener" className="flex items-center justify-center gap-2 h-14 rounded-xl bg-foreground text-background font-cond uppercase tracking-widest text-sm active:scale-95 transition">
          <Navigation className="h-5 w-5" /> Google Maps
        </a>
        {wazeUrl ? (
          <a href={wazeUrl} target="_blank" rel="noopener" className="flex items-center justify-center gap-2 h-14 rounded-xl bg-card border border-border font-cond uppercase tracking-widest text-sm active:scale-95 transition">
            <Navigation className="h-5 w-5" /> Waze
          </a>
        ) : (
          <div className="flex items-center justify-center h-14 rounded-xl bg-card/40 border border-dashed border-border font-cond uppercase tracking-widest text-[11px] text-muted-foreground text-center px-2">
            Sin coordenadas
          </div>
        )}
      </div>

      <div className="px-4 py-4 space-y-3">
        {(emg.declared || emg.false_alarm) && (
          <div className="flex flex-wrap gap-2">
            {emg.declared && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emergency/20 border border-emergency/40 text-emergency px-3 py-1 text-xs font-cond uppercase tracking-widest">
                <Megaphone className="h-3.5 w-3.5" /> Declarado
              </span>
            )}
            {emg.false_alarm && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-muted border border-border text-foreground px-3 py-1 text-xs font-cond uppercase tracking-widest">
                <Ban className="h-3.5 w-3.5" /> 6-16 Falsa Alarma
              </span>
            )}
          </div>
        )}

        {emg.pre_report && (
          <Section icon={<FileText className="h-4 w-4" />} label="Preinforme" accent>
            <p className="text-foreground whitespace-pre-wrap text-sm leading-relaxed">{emg.pre_report}</p>
          </Section>
        )}

        <Section icon={<MapPin className="h-4 w-4" />} label="Dirección">
          <p className="text-foreground text-sm">{emg.address}</p>
          {emg.reference && <p className="text-xs text-muted-foreground mt-1">Ref: {emg.reference}</p>}
        </Section>

        <Section icon={<Clock className="h-4 w-4" />} label="Tiempos">
          <Row k="Despachada" v={fmt(emg.dispatched_at)} />
          {emg.en_route_at && <Row k="En camino" v={fmt(emg.en_route_at)} />}
          {emg.working_at && <Row k="Trabajando" v={fmt(emg.working_at)} />}
          {emg.controlled_at && <Row k="Controlada" v={fmt(emg.controlled_at)} />}
          {emg.finished_at && <Row k="Finalizada" v={fmt(emg.finished_at)} />}
        </Section>

        <Section icon={<Truck className="h-4 w-4" />} label={`Móviles Asignados${vehicles?.length ? ` · ${vehicles.length}` : ''}`}>
          {!vehicles?.length ? (
            <p className="text-sm text-muted-foreground">Sin móviles asignados aún.</p>
          ) : (
            <ul className="grid grid-cols-2 gap-2">
              {vehicles.map((v: any) => (
                <li
                  key={v.id}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 ${
                    v.released_at
                      ? 'bg-success/10 border-success/30'
                      : 'bg-emergency/10 border-emergency/30'
                  }`}
                >
                  <Truck className={`h-4 w-4 ${v.released_at ? 'text-success' : 'text-emergency'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-mono font-bold text-base text-foreground leading-none">
                      {v.vehicles?.code ?? '—'}
                    </p>
                    {v.vehicles?.companies?.name && (
                      <p className="text-[9px] font-cond uppercase tracking-widest text-muted-foreground mt-0.5 truncate flex items-center gap-1">
                        {v.vehicles.companies.logo_url && (
                          <Logo src={v.vehicles.companies.logo_url} alt="" className="h-3 w-3 object-contain" hideWhenEmpty />
                        )}
                        {v.vehicles.companies.name}
                      </p>
                    )}
                    {v.vehicles?.type && (
                      <p className="text-[10px] font-cond uppercase tracking-widest text-muted-foreground/70 mt-0.5 truncate">
                        {v.vehicles.type}
                      </p>
                    )}
                  </div>
                  {v.released_at && (
                    <span className="text-[9px] font-cond uppercase tracking-widest text-success">Cuartel</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Section>

        {emg.observations && (
          <Section icon={<FileText className="h-4 w-4" />} label="Observaciones">
            <p className="text-foreground whitespace-pre-wrap text-sm">{emg.observations}</p>
          </Section>
        )}

        {emg.caller_name && (
          <Section icon={<FileText className="h-4 w-4" />} label="Solicitante">
            <p className="text-foreground text-sm">{emg.caller_name}</p>
          </Section>
        )}
      </div>

    </div>
  );
}

function Section({ icon, label, children, accent }: { icon: React.ReactNode; label: string; children: React.ReactNode; accent?: boolean }) {
  return (
    <div className={`rounded-xl p-4 border ${accent ? 'bg-emergency/5 border-emergency/30' : 'bg-card border-border'}`}>
      <div className={`flex items-center gap-2 text-[10px] mb-2 font-cond uppercase tracking-widest ${accent ? 'text-emergency' : 'text-muted-foreground'}`}>
        {icon}<span>{label}</span>
      </div>
      {children}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between text-sm py-0.5">
      <span className="text-muted-foreground font-cond uppercase tracking-widest text-[11px]">{k}</span>
      <span className="text-foreground font-mono">{v}</span>
    </div>
  );
}


