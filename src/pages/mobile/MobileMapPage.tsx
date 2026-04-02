import { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { useActiveEmergencies } from '@/hooks/useEmergencies';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LocateFixed, Loader2, Flame, Droplets } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

function useHydrants() {
  return useQuery({
    queryKey: ['hydrants'],
    queryFn: async () => {
      const { data, error } = await supabase.from('hydrants').select('*').eq('active', true);
      if (error) throw error;
      return data ?? [];
    },
  });
}

function useSharedHydrants(bounds: { north: number; south: number; east: number; west: number } | null) {
  return useQuery({
    queryKey: ['shared-hydrants', bounds?.north, bounds?.south, bounds?.east, bounds?.west],
    queryFn: async () => {
      if (!bounds) return [];
      const { data, error } = await supabase
        .from('shared_hydrants' as any)
        .select('id, latitude, longitude, ubicacion, modelo, diam_grifo, diam_tub, anio')
        .eq('active', true)
        .gte('latitude', bounds.south)
        .lte('latitude', bounds.north)
        .gte('longitude', bounds.west)
        .lte('longitude', bounds.east)
        .limit(2000);
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!bounds,
    staleTime: 30000,
  });
}

const statusLabels: Record<string, string> = {
  despacho: 'Despacho', en_ruta: 'En Ruta', en_trabajo: 'En Trabajo', controlada: 'Controlada',
};

export default function MobileMapPage() {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [bounds, setBounds] = useState<{ north: number; south: number; east: number; west: number } | null>(null);
  const [locating, setLocating] = useState(false);

  const { data: emergencies, isLoading: loadingEmg } = useActiveEmergencies();
  const { data: hydrants } = useHydrants();
  const { data: sharedHydrants } = useSharedHydrants(bounds);

  // Init map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [-33.45, -70.65],
      zoom: 13,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map);

    const updateBounds = () => {
      const b = map.getBounds();
      setBounds({ north: b.getNorth(), south: b.getSouth(), east: b.getEast(), west: b.getWest() });
    };
    map.on('moveend', updateBounds);
    updateBounds();

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Emergencies layer
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const markers: L.Marker[] = [];
    (emergencies ?? []).filter(e => e.latitude && e.longitude).forEach(e => {
      const color = e.emergency_keys?.color || '#dc2626';
      const icon = L.divIcon({
        html: `<div style="width:24px;height:24px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 0 10px ${color}80;"></div>`,
        className: '',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });
      const m = L.marker([e.latitude!, e.longitude!], { icon })
        .bindPopup(`<b>${e.emergency_keys?.code} - ${e.emergency_keys?.name}</b><br/>${e.address}<br/><small>${statusLabels[e.status] || e.status}</small>`)
        .addTo(map);
      markers.push(m);
    });

    return () => { markers.forEach(m => m.remove()); };
  }, [emergencies]);

  // Hydrants layer
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const markers: L.Marker[] = [];
    const allHydrants = [
      ...(hydrants ?? []).map(h => ({ lat: h.latitude, lng: h.longitude, name: h.name || 'Grifo', own: true })),
      ...(sharedHydrants ?? []).map((h: any) => ({ lat: h.latitude, lng: h.longitude, name: h.ubicacion || 'Grifo', own: false })),
    ];

    allHydrants.forEach(h => {
      const icon = L.divIcon({
        html: `<div style="width:10px;height:10px;border-radius:50%;background:${h.own ? '#3b82f6' : '#60a5fa'};border:2px solid ${h.own ? '#1e3a5f' : '#2563eb'};"></div>`,
        className: '',
        iconSize: [10, 10],
        iconAnchor: [5, 5],
      });
      const m = L.marker([h.lat, h.lng], { icon })
        .bindPopup(`<b>${h.name}</b>`)
        .addTo(map);
      markers.push(m);
    });

    return () => { markers.forEach(m => m.remove()); };
  }, [hydrants, sharedHydrants]);

  const handleLocate = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        map.setView([pos.coords.latitude, pos.coords.longitude], 15);
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  return (
    <div className="relative flex-1 h-full">
      <div ref={containerRef} className="absolute inset-0 z-0" />

      {/* Locate button */}
      <button
        onClick={handleLocate}
        disabled={locating}
        className="absolute bottom-4 right-4 z-[1000] flex items-center justify-center w-12 h-12 rounded-full bg-card border border-border shadow-lg active:scale-95 transition-transform"
      >
        <LocateFixed className={`w-5 h-5 text-primary ${locating ? 'animate-pulse' : ''}`} />
      </button>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-card/90 backdrop-blur-sm border border-border rounded-xl px-3 py-2 space-y-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Flame className="w-3 h-3 text-destructive" /> Emergencias
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Droplets className="w-3 h-3 text-[hsl(var(--info))]" /> Grifos
        </div>
      </div>

      {loadingEmg && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000]">
          <div className="flex items-center gap-2 bg-card/90 backdrop-blur-sm border border-border rounded-xl px-3 py-2">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground">Cargando...</span>
          </div>
        </div>
      )}
    </div>
  );
}
