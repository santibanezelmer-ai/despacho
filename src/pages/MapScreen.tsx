import { useCallback, useState, useEffect, useRef } from 'react';
import { useActiveEmergencies } from '@/hooks/useEmergencies';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LocateFixed, Loader2, Flame, Droplets, Crosshair, Shield, Truck } from 'lucide-react';
import L from 'leaflet';
import { addBaseTileLayer } from '@/lib/mapTiles';
import 'leaflet/dist/leaflet.css';
import { useTimeFormat } from '@/hooks/useTimeFormat';
import { useVehicleLastPositions, isPositionStale, formatPositionAge } from '@/hooks/useVehiclePositions';


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
        .from('shared_hydrants')
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

function emergencyIcon(color: string) {
  return L.divIcon({
    html: `<div style="width:32px;height:32px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 0 12px ${color}99, 0 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 2 L15.09 8.26 L22 9.27 L17 14.14 L18.18 21.02 L12 17.77 L5.82 21.02 L7 14.14 L2 9.27 L8.91 8.26 Z"/>
      </svg>
    </div>`,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

function hydrantIcon(own: boolean) {
  const bg = own ? '#3b82f6' : '#60a5fa';
  const border = own ? '#1e3a5f' : '#2563eb';
  return L.divIcon({
    html: `<div style="width:12px;height:12px;border-radius:50%;background:${bg};border:2px solid ${border};box-shadow:0 1px 3px rgba(0,0,0,0.3);"></div>`,
    className: '',
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
}

function vehicleIcon(code: string, stale: boolean, hasEmergency: boolean, heading: number | null) {
  const bg = stale ? '#6b7280' : hasEmergency ? '#dc2626' : '#22c55e';
  const arrow =
    heading != null && !stale
      ? `<div style="position:absolute;top:-9px;left:50%;transform:translateX(-50%) rotate(${heading}deg);transform-origin:50% 22px;width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-bottom:8px solid ${bg};"></div>`
      : '';
  return L.divIcon({
    className: '',
    html: `<div style="position:relative;display:flex;align-items:center;justify-content:center;">
      ${arrow}
      <div style="background:${bg};color:#fff;font-size:11px;font-weight:700;padding:2px 6px;border-radius:5px;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.45);white-space:nowrap;${stale ? 'opacity:0.75;' : ''}">${code}</div>
    </div>`,
    iconSize: [44, 22],
    iconAnchor: [22, 11],
  });
}


export default function MapScreen() {
  const { formatClock } = useTimeFormat();
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [bounds, setBounds] = useState<{ north: number; south: number; east: number; west: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [now, setNow] = useState(new Date());

  const { data: emergencies, isLoading: loadingEmg } = useActiveEmergencies();
  const { data: hydrants } = useHydrants();
  const { data: sharedHydrants } = useSharedHydrants(bounds);
  const { data: vehiclePositions } = useVehicleLastPositions({ refetchInterval: 5000 });


  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Init map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: [-33.45, -70.65],
      zoom: 13,
      zoomControl: true,
      attributionControl: false,
    });
    addBaseTileLayer(map);
    const updateBounds = () => {
      const b = map.getBounds();
      setBounds({ north: b.getNorth(), south: b.getSouth(), east: b.getEast(), west: b.getWest() });
    };
    map.on('moveend', updateBounds);
    updateBounds();
    mapRef.current = map;
    navigator.geolocation.getCurrentPosition(
      (pos) => map.setView([pos.coords.latitude, pos.coords.longitude], 14),
      () => {},
      { enableHighAccuracy: true, timeout: 8000 }
    );
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // Fit to emergencies on first load
  const fittedRef = useRef(false);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || fittedRef.current || !emergencies?.length) return;
    const withCoords = emergencies.filter(e => e.latitude && e.longitude);
    if (withCoords.length > 0) {
      const group = L.featureGroup(withCoords.map(e => L.marker([e.latitude!, e.longitude!])));
      map.fitBounds(group.getBounds().pad(0.3));
      fittedRef.current = true;
    }
  }, [emergencies]);

  // Emergencies layer
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const markers: L.Marker[] = [];
    (emergencies ?? []).filter(e => e.latitude && e.longitude).forEach(e => {
      const color = e.emergency_keys?.color || '#dc2626';
      const m = L.marker([e.latitude!, e.longitude!], { icon: emergencyIcon(color) })
        .bindPopup(`
          <div style="min-width:180px">
            <div style="font-weight:700;font-size:14px;margin-bottom:4px;color:${color}">
              ${e.emergency_keys?.code || '?'} — ${e.emergency_keys?.name || 'Emergencia'}
            </div>
            <div style="font-size:12px;margin-bottom:2px">📍 ${e.address}</div>
            <div style="font-size:11px;color:#888">Estado: ${statusLabels[e.status] || e.status}</div>
          </div>
        `)
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
      const m = L.marker([h.lat, h.lng], { icon: hydrantIcon(h.own) })
        .bindPopup(`<div style="font-size:12px"><b>💧 ${h.name}</b></div>`)
        .addTo(map);
      markers.push(m);
    });
    return () => { markers.forEach(m => m.remove()); };
  }, [hydrants, sharedHydrants]);

  // Vehicles GPS layer (Operix Móvil)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const markers: L.Marker[] = [];
    (vehiclePositions ?? []).forEach((p) => {
      if (p.latitude == null || p.longitude == null) return;
      const stale = isPositionStale(p.captured_at);
      const code = p.vehicles?.code ?? 'Móvil';
      const hasEmergency = !!p.emergency_id;
      const m = L.marker([p.latitude, p.longitude], {
        icon: vehicleIcon(code, stale, hasEmergency, p.heading ?? null),
        zIndexOffset: 800,
      })
        .bindPopup(`
          <div style="min-width:170px">
            <div style="font-weight:700;font-size:13px">Móvil ${code}</div>
            ${p.vehicles?.type ? `<div style="font-size:12px">Tipo: ${p.vehicles.type}</div>` : ''}
            ${p.vehicles?.status ? `<div style="font-size:12px">Estado: ${p.vehicles.status}</div>` : ''}
            ${hasEmergency ? `<div style="font-size:12px;font-weight:700;color:#dc2626">En emergencia${p.emergencies?.folio ? ` · ${p.emergencies.folio}` : ''}</div>` : ''}
            <div style="font-size:12px">Velocidad: ${p.speed != null ? `${Math.round(p.speed)} km/h` : 'N/D'}</div>
            <div style="font-size:12px">Última posición: ${formatPositionAge(p.captured_at)}</div>
            ${stale ? '<div style="font-size:12px;font-weight:700;color:#f59e0b">GPS desactualizado</div>' : ''}
          </div>
        `)
        .addTo(map);
      markers.push(m);
    });
    return () => { markers.forEach(m => m.remove()); };
  }, [vehiclePositions]);


  const handleLocate = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { map.setView([pos.coords.latitude, pos.coords.longitude], 15); setLocating(false); },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const handleCenterEmergencies = useCallback(() => {
    const map = mapRef.current;
    if (!map || !emergencies?.length) return;
    const withCoords = emergencies.filter(e => e.latitude && e.longitude);
    if (withCoords.length > 0) {
      const group = L.featureGroup(withCoords.map(e => L.marker([e.latitude!, e.longitude!])));
      map.fitBounds(group.getBounds().pad(0.3));
    }
  }, [emergencies]);

  const activeCount = (emergencies ?? []).length;

  return (
    <div className="relative w-screen h-screen" style={{ isolation: 'isolate' }}>
      <div ref={containerRef} className="absolute inset-0 z-0" />

      {/* Top bar */}
      <div className="absolute top-4 left-4 z-[1000] flex items-center gap-3">
        <div className="flex items-center gap-2 bg-card/90 backdrop-blur-sm border border-border rounded-xl px-4 py-2">
          <Shield className="h-5 w-5 text-emergency" />
          <span className="text-sm font-bold text-foreground">Mapa Operativo</span>
          {activeCount > 0 && (
            <span className="ml-2 text-xs font-bold text-emergency">{activeCount} emergencia{activeCount !== 1 ? 's' : ''}</span>
          )}
        </div>
        <div className="bg-card/90 backdrop-blur-sm border border-border rounded-xl px-3 py-2">
          <span className="text-sm font-mono font-bold text-foreground">
            {formatClock(now)}
          </span>
        </div>
      </div>

      {/* Right-side buttons */}
      <div className="absolute bottom-6 right-6 z-[1000] flex flex-col gap-2">
        <button
          onClick={handleCenterEmergencies}
          className="flex items-center justify-center w-12 h-12 rounded-full bg-card border border-border shadow-lg active:scale-95 transition-transform"
          title="Centrar emergencias"
        >
          <Crosshair className="w-5 h-5 text-destructive" />
        </button>
        <button
          onClick={handleLocate}
          disabled={locating}
          className="flex items-center justify-center w-12 h-12 rounded-full bg-card border border-border shadow-lg active:scale-95 transition-transform"
          title="Mi ubicación"
        >
          <LocateFixed className={`w-5 h-5 text-primary ${locating ? 'animate-pulse' : ''}`} />
        </button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-6 left-6 z-[1000] bg-card/90 backdrop-blur-sm border border-border rounded-xl px-3 py-2 space-y-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Flame className="w-3 h-3 text-destructive" /> Emergencias
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Droplets className="w-3 h-3 text-[hsl(var(--info))]" /> Grifos
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Truck className="w-3 h-3 text-success" /> Móviles GPS
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
