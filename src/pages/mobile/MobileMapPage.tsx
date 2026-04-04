import { useCallback, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useActiveEmergencies } from '@/hooks/useEmergencies';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LocateFixed, Loader2, Flame, Droplets, Crosshair } from 'lucide-react';
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

function emergencyIcon(color: string) {
  return L.divIcon({
    html: `<div style="
      width:32px;height:32px;border-radius:50%;
      background:${color};
      border:3px solid #fff;
      box-shadow:0 0 12px ${color}99, 0 2px 8px rgba(0,0,0,0.4);
      display:flex;align-items:center;justify-content:center;
    ">
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
    html: `<div style="
      width:12px;height:12px;border-radius:50%;
      background:${bg};border:2px solid ${border};
      box-shadow:0 1px 3px rgba(0,0,0,0.3);
    "></div>`,
    className: '',
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
}

export default function MobileMapPage() {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [bounds, setBounds] = useState<{ north: number; south: number; east: number; west: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const navigate = useNavigate();

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

    // Auto-geolocate on mount
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        map.setView([pos.coords.latitude, pos.coords.longitude], 14);
      },
      () => {},
      { enableHighAccuracy: true, timeout: 8000 }
    );

    return () => {
      map.remove();
      mapRef.current = null;
    };
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
      const icon = emergencyIcon(color);
      const m = L.marker([e.latitude!, e.longitude!], { icon })
        .bindPopup(`
          <div style="min-width:180px">
            <div style="font-weight:700;font-size:14px;margin-bottom:4px;color:${color}">
              ${e.emergency_keys?.code || '?'} — ${e.emergency_keys?.name || 'Emergencia'}
            </div>
            <div style="font-size:12px;margin-bottom:2px">📍 ${e.address}</div>
            <div style="font-size:11px;color:#888;margin-bottom:6px">Estado: ${statusLabels[e.status] || e.status}</div>
            <a href="/mobile/emergency/${e.id}" 
               onclick="event.preventDefault();window.__mobileMapNav && window.__mobileMapNav('${e.id}')" 
               style="display:inline-block;padding:4px 12px;background:${color};color:#fff;border-radius:6px;font-size:12px;font-weight:600;text-decoration:none;cursor:pointer">
              Ver detalle
            </a>
          </div>
        `)
        .addTo(map);
      markers.push(m);
    });

    // Expose nav function for popup buttons
    (window as any).__mobileMapNav = (id: string) => {
      navigate(`/mobile/emergency/${id}`);
    };

    return () => {
      markers.forEach(m => m.remove());
      delete (window as any).__mobileMapNav;
    };
  }, [emergencies, navigate]);

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
      const icon = hydrantIcon(h.own);
      const m = L.marker([h.lat, h.lng], { icon })
        .bindPopup(`<div style="font-size:12px"><b>💧 ${h.name}</b></div>`)
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

  const handleCenterEmergencies = useCallback(() => {
    const map = mapRef.current;
    if (!map || !emergencies?.length) return;
    const withCoords = emergencies.filter(e => e.latitude && e.longitude);
    if (withCoords.length > 0) {
      const group = L.featureGroup(withCoords.map(e => L.marker([e.latitude!, e.longitude!])));
      map.fitBounds(group.getBounds().pad(0.3));
    }
  }, [emergencies]);

  return (
    <div className="relative flex-1 h-full">
      <div ref={containerRef} className="absolute inset-0 z-0" />

      {/* Right-side buttons */}
      <div className="absolute bottom-4 right-4 z-[1000] flex flex-col gap-2">
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
