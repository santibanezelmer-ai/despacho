import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Map as MapIcon, ChevronDown, ChevronUp } from 'lucide-react';
import { addBaseTileLayer } from '@/lib/mapTiles';

interface Props {
  latitude: number | null;
  longitude: number | null;
  /** Centro inicial cuando aún no hay punto (ubicación del cuerpo). */
  centerLat?: number | null;
  centerLng?: number | null;
  onPick: (lat: number, lng: number) => void;
}

const FALLBACK: [number, number] = [-40.5739, -73.1335]; // Osorno

/** Pin propio (SVG) para no depender de las imágenes por defecto de Leaflet. */
const PIN_ICON = L.divIcon({
  className: '',
  html: `<svg width="34" height="46" viewBox="0 0 34 46" style="filter:drop-shadow(0 2px 3px rgba(0,0,0,.55))">
    <path d="M17 1C8.2 1 1 8 1 16.7 1 28.5 17 45 17 45s16-16.5 16-28.3C33 8 25.8 1 17 1z" fill="hsl(0 84% 52%)" stroke="white" stroke-width="2.5"/>
    <circle cx="17" cy="16.5" r="6" fill="white"/>
  </svg>`,
  iconSize: [34, 46],
  iconAnchor: [17, 45],
});

/** Mapa para fijar la ubicación de la emergencia con un clic o arrastrando el pin. */
export default function MapPointPicker({ latitude, longitude, centerLat, centerLng, onPick }: Props) {
  const [open, setOpen] = useState(false);
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  useEffect(() => {
    if (!open || !elRef.current || mapRef.current) return;
    const start: [number, number] =
      latitude != null && longitude != null ? [latitude, longitude]
        : centerLat != null && centerLng != null ? [centerLat, centerLng] : FALLBACK;
    const map = L.map(elRef.current, { scrollWheelZoom: true }).setView(start, latitude != null ? 17 : 14);
    addBaseTileLayer(map);
    map.getContainer().style.cursor = 'crosshair';
    map.on('click', (e: L.LeafletMouseEvent) => onPickRef.current(e.latlng.lat, e.latlng.lng));
    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 50);
    return () => { map.remove(); mapRef.current = null; markerRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (latitude == null || longitude == null) {
      markerRef.current?.remove(); markerRef.current = null; return;
    }
    const pos: [number, number] = [latitude, longitude];
    if (!markerRef.current) {
      markerRef.current = L.marker(pos, { draggable: true, icon: PIN_ICON, autoPan: true }).addTo(map);
      markerRef.current.on('dragend', () => {
        const p = markerRef.current!.getLatLng();
        onPickRef.current(p.lat, p.lng);
      });
    } else {
      markerRef.current.setLatLng(pos);
    }
    if (!map.getBounds().contains(pos)) map.panTo(pos);
  }, [latitude, longitude, open]);

  return (
    <div className="rounded-md border border-border bg-muted/30">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <span className="flex items-center gap-1.5"><MapIcon className="h-3.5 w-3.5" /> Marcar en el mapa</span>
        {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>
      {open && (
        <div className="px-3 pb-3">
          <div ref={elRef} className="h-72 w-full overflow-hidden rounded border border-border" data-testid="map-point-picker" />
          <p className="mt-1 text-[11px] text-muted-foreground">
            Haz clic para fijar el punto; arrastra el pin para ajustarlo.
            {latitude != null && longitude != null && (
              <span className="ml-1 font-mono text-foreground">{latitude.toFixed(6)}, {longitude.toFixed(6)}</span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
