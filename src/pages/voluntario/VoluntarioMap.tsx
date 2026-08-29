import { useCallback, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useActiveEmergencies } from '@/hooks/useEmergencies';
import { LocateFixed, Loader2, Flame, Droplets, Crosshair, MapPinOff, Building2 } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import L from 'leaflet';
import { addBaseTileLayer } from '@/lib/mapTiles';
import 'leaflet/dist/leaflet.css';
import { useHydrants, useSharedHydrants } from '@/hooks/useHydrantsData';
import { useStations } from '@/hooks/useStations';

const statusLabels: Record<string, string> = {
  despacho: 'Despacho', en_ruta: 'En Ruta', en_trabajo: 'En Trabajo', controlada: 'Controlada',
};

function emergencyIcon(color: string) {
  return L.divIcon({
    html: `<div style="width:36px;height:36px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 0 14px ${color}99, 0 2px 8px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 12m-10 0a10 10 0 1 0 20 0a10 10 0 1 0 -20 0"/><path d="M12 8v4"/><path d="M12 16h.01"/>
      </svg></div>`,
    className: '', iconSize: [36, 36], iconAnchor: [18, 18],
  });
}

function hydrantIcon(own: boolean) {
  const size = own ? 16 : 12;
  const bg = own ? '#3b82f6' : '#60a5fa';
  const border = own ? '#1e3a5f' : '#93c5fd';
  return L.divIcon({
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${bg};border:2px solid ${border};box-shadow:0 1px 4px rgba(0,0,0,0.4);"></div>`,
    className: '', iconSize: [size, size], iconAnchor: [size / 2, size / 2],
  });
}

function stationIcon() {
  return L.divIcon({
    html: `<div style="width:26px;height:26px;border-radius:6px;background:#f59e0b;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M10 21v-6h4v6"/></svg>
    </div>`,
    className: '', iconSize: [26, 26], iconAnchor: [13, 13],
  });
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

async function requestGeolocation(): Promise<{ lat: number; lng: number } | null> {
  const isNative = Capacitor.isNativePlatform();
  if (isNative) {
    try {
      let perm = await Geolocation.checkPermissions();
      if (perm.location === 'prompt' || perm.location === 'prompt-with-rationale') {
        perm = await Geolocation.requestPermissions({ permissions: ['location'] });
      }
      if (perm.location !== 'granted') return null;
      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
      return { lat: pos.coords.latitude, lng: pos.coords.longitude };
    } catch { return null; }
  }
  return new Promise((resolve) => {
    if (!navigator.geolocation) { resolve(null); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

export default function VoluntarioMap() {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const initRef = useRef(false);
  const [bounds, setBounds] = useState<{ north: number; south: number; east: number; west: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationDenied, setLocationDenied] = useState(false);
  const navigate = useNavigate();

  const { data: emergencies, isLoading: loadingEmg } = useActiveEmergencies();
  const { data: hydrants } = useHydrants();
  const { data: sharedHydrants } = useSharedHydrants(bounds);
  const stations = useStations();

  useEffect(() => {
    if (initRef.current) return;
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      const raf = requestAnimationFrame(() => {
        const r2 = el.getBoundingClientRect();
        if (r2.width > 0 && r2.height > 0) initializeMap(el);
      });
      return () => cancelAnimationFrame(raf);
    }
    initializeMap(el);
    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; initRef.current = false; }
    };
  }, []);

  function initializeMap(el: HTMLDivElement) {
    if (initRef.current || mapRef.current) return;
    initRef.current = true;
    const map = L.map(el, { center: [-33.45, -70.65], zoom: 13, zoomControl: false, attributionControl: false });
    addBaseTileLayer(map);
    const updateBounds = () => {
      const b = map.getBounds();
      setBounds({ north: b.getNorth(), south: b.getSouth(), east: b.getEast(), west: b.getWest() });
    };
    map.on('moveend', updateBounds);
    updateBounds();
    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 200);
    requestGeolocation().then((geo) => {
      if (geo) { map.setView([geo.lat, geo.lng], 14); setLocationDenied(false); }
      else setLocationDenied(true);
    });
  }

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

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const markers: L.Marker[] = [];
    const emgWithCoords = (emergencies ?? []).filter(e => e.latitude && e.longitude);
    emgWithCoords.forEach(e => {
      const color = e.emergency_keys?.color || '#dc2626';
      const icon = emergencyIcon(color);
      const m = L.marker([e.latitude!, e.longitude!], { icon, zIndexOffset: 1000 })
        .bindPopup(`<div style="min-width:180px;font-family:system-ui">
          <div style="font-weight:700;font-size:14px;margin-bottom:4px;color:${color}">${e.emergency_keys?.code || '?'} — ${e.emergency_keys?.name || 'Emergencia'}</div>
          <div style="font-size:12px;margin-bottom:2px">${e.address}</div>
          <div style="font-size:11px;color:#999;margin-bottom:6px">Estado: ${statusLabels[e.status] || e.status}</div>
          <a href="/voluntario/emergencia/${e.id}" onclick="event.preventDefault();window.__volMapNav && window.__volMapNav('${e.id}')" style="display:inline-block;padding:6px 14px;background:${color};color:#fff;border-radius:8px;font-size:12px;font-weight:600;text-decoration:none;cursor:pointer">Ver detalle</a>
        </div>`)
        .addTo(map);
      markers.push(m);
    });
    (window as any).__volMapNav = (id: string) => navigate(`/voluntario/emergencia/${id}`);
    return () => {
      markers.forEach(m => m.remove());
      delete (window as any).__volMapNav;
    };
  }, [emergencies, navigate]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const markers: L.Marker[] = [];
    const allHydrants = [
      ...(hydrants ?? []).map(h => ({ lat: h.latitude, lng: h.longitude, name: h.name || 'Grifo propio', own: true })),
      ...(sharedHydrants ?? []).map((h: any) => ({ lat: h.latitude, lng: h.longitude, name: h.ubicacion || 'Grifo compartido', own: false })),
    ];
    allHydrants.forEach(h => {
      const icon = hydrantIcon(h.own);
      const m = L.marker([h.lat, h.lng], { icon }).bindPopup(`<div style="font-size:12px;font-family:system-ui"><b>${h.name}</b></div>`).addTo(map);
      markers.push(m);
    });
    return () => { markers.forEach(m => m.remove()); };
  }, [hydrants, sharedHydrants]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const markers: L.Marker[] = [];
    stations.forEach(s => {
      const title = s.labels.length > 1 ? 'Cuarteles en esta ubicación' : 'Cuartel';
      const list = s.labels.map(l => `<div style="font-size:12px">• ${escapeHtml(l)}</div>`).join('');
      const m = L.marker([s.latitude, s.longitude], { icon: stationIcon(), zIndexOffset: 500 })
        .bindPopup(`<div style="min-width:160px;font-family:system-ui">
          <div style="font-weight:700;font-size:13px;margin-bottom:3px">${title}</div>
          ${list}
          ${s.address ? `<div style="font-size:11px;color:#999;margin-top:3px">${escapeHtml(s.address)}</div>` : ''}
        </div>`)
        .addTo(map);
      markers.push(m);
    });
    return () => { markers.forEach(m => m.remove()); };
  }, [stations]);

  const handleLocate = useCallback(async () => {
    const map = mapRef.current;
    if (!map) return;
    setLocating(true);
    const geo = await requestGeolocation();
    if (geo) { map.setView([geo.lat, geo.lng], 15); setLocationDenied(false); }
    else setLocationDenied(true);
    setLocating(false);
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
    <div className="relative w-full" style={{ height: 'calc(100vh - 80px)' }}>
      <div ref={containerRef} className="absolute inset-0" style={{ zIndex: 0, isolation: 'isolate' }} />
      {locationDenied && (
        <div className="absolute top-4 left-4 right-4 z-[1000]">
          <div className="flex items-center gap-2 bg-destructive/90 backdrop-blur-sm border border-destructive rounded-xl px-3 py-2">
            <MapPinOff className="w-4 h-4 text-destructive-foreground flex-shrink-0" />
            <span className="text-xs text-destructive-foreground">Permiso de ubicación denegado. Actívalo en Ajustes para ver tu posición.</span>
          </div>
        </div>
      )}
      <div className="absolute bottom-4 right-4 z-[1000] flex flex-col gap-2">
        <button onClick={handleCenterEmergencies} className="flex items-center justify-center w-12 h-12 rounded-full bg-card border border-border shadow-lg active:scale-95 transition-transform" title="Centrar emergencias">
          <Crosshair className="w-5 h-5 text-destructive" />
        </button>
        <button onClick={handleLocate} disabled={locating} className="flex items-center justify-center w-12 h-12 rounded-full bg-card border border-border shadow-lg active:scale-95 transition-transform" title="Mi ubicación">
          <LocateFixed className={`w-5 h-5 text-primary ${locating ? 'animate-pulse' : ''}`} />
        </button>
      </div>
      <div className="absolute bottom-4 left-4 z-[1000] bg-card/90 backdrop-blur-sm border border-border rounded-xl px-3 py-2 space-y-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground"><Flame className="w-3 h-3 text-destructive" /> Emergencias</div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground"><Droplets className="w-3 h-3 text-[hsl(var(--info))]" /> Grifos</div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground"><Building2 className="w-3 h-3 text-[#f59e0b]" /> Cuarteles</div>
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
