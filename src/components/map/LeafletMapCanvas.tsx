import { useEffect, useMemo, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const DEFAULT_CENTER: [number, number] = [-33.4489, -70.6693];
const PRIMARY_TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const FALLBACK_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const PRIMARY_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';
const FALLBACK_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

export type MapEmergency = {
  id: string;
  latitude: number;
  longitude: number;
  code: string;
  name: string;
  folio: string;
  address: string;
  statusLabel: string;
  statusColor: string;
  color: string;
  vehicleCodes: string[];
};

export type MapHydrant = {
  id: string;
  latitude: number;
  longitude: number;
  name: string;
  type: string | null;
  description: string | null;
  isOwn?: boolean;
};

type LeafletMapCanvasProps = {
  emergencies: MapEmergency[];
  hydrants: MapHydrant[];
  showEmergencies: boolean;
  showHydrants: boolean;
  onCompatibilityModeChange: (enabled: boolean) => void;
  onBoundsChange?: (bounds: { north: number; south: number; east: number; west: number }) => void;
  onMapClick?: (latlng: { lat: number; lng: number }) => void;
  clickMode?: boolean;
  onHydrantAction?: (action: 'edit' | 'delete', hydrant: MapHydrant) => void;
};

const emergencyIconCache = new Map<string, L.DivIcon>();
const getEmergencyIcon = (color: string) => {
  if (emergencyIconCache.has(color)) return emergencyIconCache.get(color)!;

  const icon = L.divIcon({
    className: '',
    html: `<div style="background:${color};width:32px;height:32px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><path d="M12 2L2 22h20L12 2z"/></svg>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

  emergencyIconCache.set(color, icon);
  return icon;
};

const hydrantIcon = L.divIcon({
  className: '',
  html: `<div style="background:#3b82f6;width:22px;height:22px;border-radius:4px;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><circle cx="12" cy="12" r="6"/></svg>
  </div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const buildEmergencyPopup = (emergency: MapEmergency) => {
  const vehicles = emergency.vehicleCodes.length > 0 ? emergency.vehicleCodes.join(', ') : 'Ninguno';

  return `
    <div style="font-size:13px;line-height:1.35;min-width:180px;display:flex;flex-direction:column;gap:4px;">
      <div style="font-weight:700;">${escapeHtml(emergency.code)} - ${escapeHtml(emergency.name)}</div>
      <div style="font-size:12px;">${escapeHtml(emergency.folio)}</div>
      <div style="font-size:12px;">${escapeHtml(emergency.address)}</div>
      <div style="font-size:12px;font-weight:700;color:${emergency.statusColor};margin-top:2px;">${escapeHtml(emergency.statusLabel)}</div>
      <div style="font-size:12px;color:hsl(var(--muted-foreground));">Móviles: ${escapeHtml(vehicles)}</div>
    </div>
  `;
};

const buildHydrantPopup = (hydrant: MapHydrant) => {
  const rows = [
    `<div style="font-weight:700;">${escapeHtml(hydrant.name || 'Grifo')}</div>`,
    hydrant.type ? `<div style="font-size:12px;">Tipo: ${escapeHtml(hydrant.type)}</div>` : '',
    hydrant.description ? `<div style="font-size:12px;">${escapeHtml(hydrant.description)}</div>` : '',
  ].filter(Boolean);

  if (hydrant.isOwn) {
    rows.push(`<div style="margin-top:6px;display:flex;gap:4px;">
      <button data-hydrant-action="edit" data-hydrant-id="${hydrant.id}" style="font-size:11px;padding:2px 8px;background:#3b82f6;color:white;border:none;border-radius:4px;cursor:pointer;">Editar</button>
      <button data-hydrant-action="delete" data-hydrant-id="${hydrant.id}" style="font-size:11px;padding:2px 8px;background:#dc2626;color:white;border:none;border-radius:4px;cursor:pointer;">Eliminar</button>
    </div>`);
  }

  return `<div style="font-size:13px;line-height:1.35;display:flex;flex-direction:column;gap:4px;">${rows.join('')}</div>`;
};

export default function LeafletMapCanvas({
  emergencies,
  hydrants,
  showEmergencies,
  showHydrants,
  onCompatibilityModeChange,
  onBoundsChange,
  onMapClick,
  clickMode,
  onHydrantAction,
}: LeafletMapCanvasProps) {
  const hydrantsRef = useRef(hydrants);
  hydrantsRef.current = hydrants;
  const onHydrantActionRef = useRef(onHydrantAction);
  onHydrantActionRef.current = onHydrantAction;
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const emergencyLayerRef = useRef<L.LayerGroup | null>(null);
  const hydrantLayerRef = useRef<L.LayerGroup | null>(null);
  const initialFitDoneRef = useRef(false);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const tileUrlRef = useRef(PRIMARY_TILE_URL);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    onCompatibilityModeChange(false);

    const map = L.map(mapContainerRef.current, {
      center: DEFAULT_CENTER,
      zoom: 13,
      zoomControl: true,
    });
    mapRef.current = map;

    const reportBounds = () => {
      if (!onBoundsChange) return;
      const b = map.getBounds();
      onBoundsChange({
        north: b.getNorth(),
        south: b.getSouth(),
        east: b.getEast(),
        west: b.getWest(),
      });
    };

    map.on('moveend', reportBounds);
    // Report initial bounds after map is ready
    window.setTimeout(reportBounds, 200);

    const emergencyLayer = L.layerGroup().addTo(map);
    const hydrantLayer = L.layerGroup().addTo(map);
    emergencyLayerRef.current = emergencyLayer;
    hydrantLayerRef.current = hydrantLayer;

    const activateFallbackTiles = () => {
      if (!mapRef.current || tileUrlRef.current === FALLBACK_TILE_URL) return;

      tileUrlRef.current = FALLBACK_TILE_URL;
      tileLayerRef.current?.remove();
      tileLayerRef.current = L.tileLayer(FALLBACK_TILE_URL, {
        attribution: FALLBACK_ATTRIBUTION,
      }).addTo(mapRef.current);
      onCompatibilityModeChange(true);
    };

    const primaryTileLayer = L.tileLayer(PRIMARY_TILE_URL, {
      attribution: PRIMARY_ATTRIBUTION,
    }).addTo(map);

    primaryTileLayer.on('tileerror', activateFallbackTiles);
    tileLayerRef.current = primaryTileLayer;

    const observer = new ResizeObserver(() => {
      map.invalidateSize({ pan: false });
    });
    observer.observe(map.getContainer());

    // Event delegation for hydrant edit/delete buttons
    const handlePopupClick = (e: MouseEvent) => {
      const btn = (e.target as HTMLElement).closest('[data-hydrant-action]') as HTMLElement | null;
      if (!btn) return;
      const action = btn.dataset.hydrantAction as 'edit' | 'delete';
      const id = btn.dataset.hydrantId;
      if (!action || !id) return;
      const h = hydrantsRef.current.find(h => h.id === id);
      if (h) onHydrantActionRef.current?.(action, h);
    };
    map.getContainer().addEventListener('click', handlePopupClick);

    const timer = window.setTimeout(() => map.invalidateSize({ pan: false }), 150);

    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
      map.getContainer().removeEventListener('click', handlePopupClick);
      map.remove();
      mapRef.current = null;
      emergencyLayerRef.current = null;
      hydrantLayerRef.current = null;
      tileLayerRef.current = null;
      tileUrlRef.current = PRIMARY_TILE_URL;
    };
  }, [onCompatibilityModeChange, onBoundsChange]);

  // Handle click mode for placing hydrants
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const container = map.getContainer();
    if (clickMode) {
      container.style.cursor = 'crosshair';
      const handleClick = (e: L.LeafletMouseEvent) => {
        onMapClick?.({ lat: e.latlng.lat, lng: e.latlng.lng });
      };
      map.on('click', handleClick);
      return () => {
        container.style.cursor = '';
        map.off('click', handleClick);
      };
    } else {
      container.style.cursor = '';
    }
  }, [clickMode, onMapClick]);

  const positions = useMemo<[number, number][]>(() => {
    const points: [number, number][] = [];
    if (showEmergencies) emergencies.forEach((e) => points.push([e.latitude, e.longitude]));
    if (showHydrants) hydrants.forEach((h) => points.push([h.latitude, h.longitude]));
    return points;
  }, [emergencies, hydrants, showEmergencies, showHydrants]);

  useEffect(() => {
    if (!mapRef.current || !emergencyLayerRef.current || !hydrantLayerRef.current) return;

    emergencyLayerRef.current.clearLayers();
    hydrantLayerRef.current.clearLayers();

    if (showEmergencies) {
      emergencies.forEach((emergency) => {
        L.marker([emergency.latitude, emergency.longitude], {
          icon: getEmergencyIcon(emergency.color),
        })
          .bindPopup(buildEmergencyPopup(emergency))
          .addTo(emergencyLayerRef.current!);
      });
    }

    if (showHydrants) {
      hydrants.forEach((hydrant) => {
        L.marker([hydrant.latitude, hydrant.longitude], { icon: hydrantIcon })
          .bindPopup(buildHydrantPopup(hydrant))
          .addTo(hydrantLayerRef.current!);
      });
    }

    if (!initialFitDoneRef.current && positions.length > 0) {
      const bounds = L.latLngBounds(positions.map((position) => L.latLng(position[0], position[1])));
      mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      initialFitDoneRef.current = true;
    }
  }, [emergencies, hydrants, positions, showEmergencies, showHydrants]);

  return <div ref={mapContainerRef} className="h-full w-full bg-muted" />;
}