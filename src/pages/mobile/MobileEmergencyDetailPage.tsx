import { useParams, useNavigate } from 'react-router-dom';
import { useMobileEmergencyDetail } from '@/hooks/useMobileEmergencyDetail';
import {
  ArrowLeft, MapPin, Navigation, Clock, Truck, Users, Droplets,
  ChevronRight, ExternalLink, Loader2, ShieldAlert, MessageSquare,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const statusLabels: Record<string, string> = {
  despacho: 'Despacho', en_ruta: 'En Ruta', en_trabajo: 'En Trabajo',
  controlada: 'Controlada', finalizada: 'Finalizada',
};

const statusColors: Record<string, string> = {
  despacho: 'var(--status-despacho)', en_ruta: 'var(--status-en-ruta)',
  en_trabajo: 'var(--status-en-trabajo)', controlada: 'var(--status-controlada)',
  finalizada: 'var(--status-finalizada)',
};

const timelineSteps = [
  { key: 'created_at', label: 'Creación' },
  { key: 'dispatched_at', label: 'Despacho' },
  { key: 'en_route_at', label: 'En Ruta' },
  { key: 'working_at', label: 'En Trabajo' },
  { key: 'controlled_at', label: 'Controlada' },
  { key: 'finished_at', label: 'Finalizada' },
];

function openGoogleMaps(lat: number | null, lng: number | null, address: string) {
  if (lat && lng) {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
  } else {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`, '_blank');
  }
}

function openWaze(lat: number | null, lng: number | null, address: string) {
  if (lat && lng) {
    window.open(`https://waze.com/ul?ll=${lat},${lng}&navigate=yes`, '_blank');
  } else {
    window.open(`https://waze.com/ul?q=${encodeURIComponent(address)}&navigate=yes`, '_blank');
  }
}

export default function MobileEmergencyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, error } = useMobileEmergencyDetail(id);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  const e = data?.emergency;

  // Mini map
  useEffect(() => {
    if (!e?.latitude || !e?.longitude || !mapContainerRef.current) return;
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      center: [e.latitude, e.longitude],
      zoom: 15,
      zoomControl: false,
      attributionControl: false,
      dragging: true,
      scrollWheelZoom: false,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
    }).addTo(map);

    // Emergency marker
    const emergencyIcon = L.divIcon({
      html: `<div style="width:28px;height:28px;border-radius:50%;background:${e.emergency_keys?.color || '#dc2626'};border:3px solid white;box-shadow:0 0 12px ${e.emergency_keys?.color || '#dc2626'}80;"></div>`,
      className: '',
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });
    L.marker([e.latitude, e.longitude], { icon: emergencyIcon }).addTo(map);

    // Nearby hydrants
    (data?.nearbyHydrants ?? []).forEach((h: any) => {
      const hIcon = L.divIcon({
        html: `<div style="width:12px;height:12px;border-radius:50%;background:#3b82f6;border:2px solid #1e3a5f;"></div>`,
        className: '',
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      });
      L.marker([h.latitude, h.longitude], { icon: hIcon })
        .bindPopup(`<b>Grifo</b><br/>${h.ubicacion || h.name || ''}<br/>${Math.round(h.distance)}m`)
        .addTo(map);
    });

    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 100);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [e?.latitude, e?.longitude, data?.nearbyHydrants]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error?.message === 'ACCESS_DENIED') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <ShieldAlert className="w-12 h-12 text-destructive mb-4" />
        <p className="text-lg font-bold">Acceso denegado</p>
        <p className="text-sm text-muted-foreground mt-2">Esta emergencia no pertenece a tu organización.</p>
        <button onClick={() => navigate('/mobile/feed')} className="mt-6 px-6 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">
          Volver al feed
        </button>
      </div>
    );
  }

  if (!e) return null;

  const keyColor = e.emergency_keys?.color || '#dc2626';
  const isLive = e.status !== 'finalizada';
  const hasCoords = !!(e.latitude && e.longitude);

  return (
    <div className="pb-4">
      {/* Back + Header */}
      <div className="sticky top-0 z-10 bg-card/90 backdrop-blur-md border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/mobile/feed')} className="p-1 -ml-1 active:opacity-70">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md text-xs font-bold text-white" style={{ backgroundColor: keyColor }}>
              {e.emergency_keys?.code}
            </span>
            <span
              className="px-2 py-0.5 rounded-md text-[10px] font-bold border"
              style={{
                color: `hsl(${statusColors[e.status]})`,
                borderColor: `hsl(${statusColors[e.status]} / 0.3)`,
                backgroundColor: `hsl(${statusColors[e.status]} / 0.1)`,
              }}
            >
              {isLive && '● '}{statusLabels[e.status]}
            </span>
          </div>
        </div>
        {e.folio && <span className="text-[10px] text-muted-foreground font-mono">#{e.folio}</span>}
      </div>

      {/* Content */}
      <div className="px-4 space-y-4 mt-4">
        {/* Emergency Name */}
        <h1 className="text-lg font-bold">{e.emergency_keys?.name || 'Emergencia'}</h1>

        {/* Location */}
        <Section icon={MapPin} title="Ubicación">
          <p className="text-sm">{e.address}</p>
          {e.reference && <p className="text-xs text-muted-foreground mt-1">Ref: {e.reference}</p>}
          {hasCoords && (
            <p className="text-[10px] text-muted-foreground font-mono mt-1">
              {e.latitude.toFixed(5)}, {e.longitude.toFixed(5)}
            </p>
          )}

          {/* Nav buttons */}
          <div className="flex gap-2 mt-3">
            <NavButton
              label="Google Maps"
              color="#34a853"
              onClick={() => openGoogleMaps(e.latitude, e.longitude, e.address)}
            />
            <NavButton
              label="Waze"
              color="#33ccff"
              onClick={() => openWaze(e.latitude, e.longitude, e.address)}
            />
          </div>
        </Section>

        {/* Map */}
        {hasCoords && (
          <div className="rounded-xl overflow-hidden border border-border h-48">
            <div ref={mapContainerRef} className="w-full h-full" />
          </div>
        )}

        {/* Vehicles */}
        {data!.vehicles.length > 0 && (
          <Section icon={Truck} title={`Móviles (${data!.vehicles.length})`}>
            <div className="space-y-2">
              {data!.vehicles.map((v: any) => (
                <div key={v.id} className="flex items-center justify-between bg-secondary/50 rounded-lg px-3 py-2">
                  <div>
                    <span className="text-sm font-semibold">{v.vehicles?.code}</span>
                    <span className="text-xs text-muted-foreground ml-2">{v.vehicles?.type}</span>
                  </div>
                  {v.vehicles?.companies?.name && (
                    <span className="text-[10px] text-muted-foreground">{v.vehicles.companies.name}</span>
                  )}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Personnel */}
        {data!.personnel.length > 0 && (
          <Section icon={Users} title={`Personal (${data!.personnel.length})`}>
            <div className="flex flex-wrap gap-1.5">
              {data!.personnel.map((p: any) => (
                <span key={p.id} className="px-2 py-1 bg-secondary/50 rounded-lg text-xs">
                  {p.volunteers?.name || 'Voluntario'}
                </span>
              ))}
            </div>
          </Section>
        )}

        {/* Timeline */}
        <Section icon={Clock} title="Línea de tiempo">
          <div className="space-y-0">
            {timelineSteps.map((step, i) => {
              const value = (e as any)[step.key];
              if (!value) return null;
              return (
                <div key={step.key} className="flex items-start gap-3 pb-3 last:pb-0">
                  <div className="flex flex-col items-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-primary mt-1" />
                    {i < timelineSteps.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
                  </div>
                  <div className="flex-1">
                    <span className="text-xs font-semibold">{step.label}</span>
                    <span className="text-[11px] text-muted-foreground ml-2">
                      {format(new Date(value), "dd MMM HH:mm:ss", { locale: es })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>

        {/* Observations */}
        {e.observations && (
          <Section icon={MessageSquare} title="Observaciones">
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{e.observations}</p>
          </Section>
        )}

        {/* Logs */}
        {data!.logs.length > 0 && (
          <Section icon={MessageSquare} title="Novedades">
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {data!.logs.map((log: any) => (
                <div key={log.id} className="bg-secondary/30 rounded-lg px-3 py-2">
                  <p className="text-xs">{log.message}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {format(new Date(log.created_at), "dd MMM HH:mm", { locale: es })}
                  </p>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Nearby Hydrants */}
        {data!.nearbyHydrants.length > 0 && (
          <Section icon={Droplets} title={`Grifos cercanos (${data!.nearbyHydrants.length})`}>
            <div className="space-y-1.5">
              {data!.nearbyHydrants.map((h: any) => (
                <button
                  key={h.id}
                  onClick={() => openGoogleMaps(h.latitude, h.longitude, h.ubicacion || h.name || '')}
                  className="w-full flex items-center justify-between bg-secondary/30 rounded-lg px-3 py-2 active:bg-secondary/50"
                >
                  <div className="flex items-center gap-2">
                    <Droplets className="w-3.5 h-3.5 text-[hsl(var(--info))]" />
                    <span className="text-xs truncate max-w-[180px]">{h.ubicacion || h.name || 'Grifo'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <span>{Math.round(h.distance)}m</span>
                    <ChevronRight className="w-3 h-3" />
                  </div>
                </button>
              ))}
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-bold">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function NavButton({ label, color, onClick }: { label: string; color: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold text-white active:opacity-80 transition-opacity"
      style={{ backgroundColor: color }}
    >
      <Navigation className="w-4 h-4" />
      {label}
    </button>
  );
}
