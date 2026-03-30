import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useActiveEmergencies } from '@/hooks/useEmergencies';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Map, Flame, Droplets, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

// Fix default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const emergencyIcon = (color: string) =>
  L.divIcon({
    className: '',
    html: `<div style="background:${color};width:28px;height:28px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><path d="M12 2L2 22h20L12 2z"/></svg>
    </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });

const hydrantIcon = L.divIcon({
  className: '',
  html: `<div style="background:hsl(210,85%,55%);width:22px;height:22px;border-radius:4px;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><circle cx="12" cy="12" r="8"/></svg>
  </div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

function useHydrants() {
  return useQuery({
    queryKey: ['hydrants'],
    queryFn: async () => {
      const { data, error } = await supabase.from('hydrants').select('*').eq('active', true);
      if (error) throw error;
      return data;
    },
  });
}

const DEFAULT_CENTER: [number, number] = [-33.4489, -70.6693]; // Santiago, Chile

function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 0) {
      const bounds = L.latLngBounds(positions.map(p => L.latLng(p[0], p[1])));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [positions.length]);
  return null;
}

const statusLabels: Record<string, string> = {
  despacho: 'DESPACHO',
  en_ruta: 'EN RUTA',
  en_trabajo: 'EN TRABAJO',
  controlada: 'CONTROLADA',
};

export default function OperativeMap() {
  const { data: emergencies } = useActiveEmergencies();
  const { data: hydrants } = useHydrants();
  const [showHydrants, setShowHydrants] = useState(true);
  const [showEmergencies, setShowEmergencies] = useState(true);

  const emergenciesWithCoords = (emergencies ?? []).filter(
    e => e.latitude != null && e.longitude != null
  );

  const allPositions: [number, number][] = [
    ...emergenciesWithCoords.map(e => [e.latitude!, e.longitude!] as [number, number]),
    ...(showHydrants ? (hydrants ?? []).map(h => [h.latitude, h.longitude] as [number, number]) : []),
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      <div className="flex items-center justify-between p-3 border-b border-border bg-card">
        <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Map className="h-5 w-5 text-info" /> Mapa Operativo
        </h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch checked={showEmergencies} onCheckedChange={setShowEmergencies} id="show-emergencies" />
            <Label htmlFor="show-emergencies" className="text-xs flex items-center gap-1">
              <Flame className="h-3 w-3 text-emergency" /> Emergencias
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={showHydrants} onCheckedChange={setShowHydrants} id="show-hydrants" />
            <Label htmlFor="show-hydrants" className="text-xs flex items-center gap-1">
              <Droplets className="h-3 w-3 text-info" /> Grifos
            </Label>
          </div>
        </div>
      </div>

      <div className="flex-1 relative">
        <MapContainer
          center={DEFAULT_CENTER}
          zoom={13}
          className="h-full w-full"
          style={{ background: 'hsl(220, 20%, 7%)' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />

          {allPositions.length > 0 && <FitBounds positions={allPositions} />}

          {showEmergencies && emergenciesWithCoords.map(e => (
            <Marker
              key={e.id}
              position={[e.latitude!, e.longitude!]}
              icon={emergencyIcon(e.emergency_keys?.color ?? '#dc2626')}
            >
              <Popup>
                <div className="text-sm space-y-1 min-w-[180px]">
                  <div className="font-bold">{e.emergency_keys?.code} - {e.emergency_keys?.name}</div>
                  <div className="text-xs">{e.folio}</div>
                  <div className="text-xs">{e.address}</div>
                  <div className="text-xs font-semibold mt-1" style={{ color: e.emergency_keys?.color }}>
                    {statusLabels[e.status] ?? e.status}
                  </div>
                  <div className="text-xs text-gray-500">
                    Móviles: {e.vehicleCodes.join(', ') || 'Ninguno'}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

          {showHydrants && (hydrants ?? []).map(h => (
            <Marker key={h.id} position={[h.latitude, h.longitude]} icon={hydrantIcon}>
              <Popup>
                <div className="text-sm">
                  <div className="font-bold">{h.name ?? 'Grifo'}</div>
                  {h.type && <div className="text-xs">Tipo: {h.type}</div>}
                  {h.description && <div className="text-xs">{h.description}</div>}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 console-panel p-3 z-[1000] space-y-1.5">
          <p className="text-xs font-semibold text-foreground flex items-center gap-1">
            <Layers className="h-3 w-3" /> Leyenda
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="w-3 h-3 rounded-full bg-emergency border border-white" />
            Emergencia activa
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="w-3 h-3 rounded bg-info border border-white" />
            Grifo
          </div>
        </div>
      </div>
    </div>
  );
}
