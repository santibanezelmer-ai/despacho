/**
 * Cuadrícula táctica fija (cuadrantes) para referencia rápida entre central y móviles.
 * Celdas de 0,01° (~1,1 km) ancladas a un origen fijo: el mismo punto siempre
 * produce el mismo código (p. ej. "K-27"). Solo informativa, no asigna recursos.
 */
import L from 'leaflet';

export const QUADRANT_SIZE = 0.01;
const ORIGIN_LAT = -40.4; // borde norte
const ORIGIN_LNG = -73.9; // borde oeste

function colLabel(n: number): string {
  let s = '';
  let x = n;
  do { s = String.fromCharCode(65 + (x % 26)) + s; x = Math.floor(x / 26) - 1; } while (x >= 0);
  return s;
}

export function quadrantFor(lat: number, lng: number): string | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const col = Math.floor((lng - ORIGIN_LNG) / QUADRANT_SIZE);
  const row = Math.floor((ORIGIN_LAT - lat) / QUADRANT_SIZE);
  if (col < 0 || row < 0) return null;
  return `${colLabel(col)}-${row + 1}`;
}

/** Dibuja la cuadrícula visible (solo con zoom ≥ 12 para no saturar). */
export function drawQuadrantGrid(map: L.Map, group: L.LayerGroup) {
  group.clearLayers();
  if (map.getZoom() < 12) return;
  const b = map.getBounds();
  const s = QUADRANT_SIZE;
  const lng0 = ORIGIN_LNG + Math.floor((b.getWest() - ORIGIN_LNG) / s) * s;
  const lat0 = ORIGIN_LAT - Math.floor((ORIGIN_LAT - b.getNorth()) / s) * s;
  const style = { color: '#f59e0b', weight: 1, opacity: 0.55, interactive: false, dashArray: '4 4' };
  for (let lng = lng0; lng <= b.getEast() + s; lng += s) {
    L.polyline([[b.getSouth() - s, lng], [b.getNorth() + s, lng]], style).addTo(group);
  }
  for (let lat = lat0; lat >= b.getSouth() - s; lat -= s) {
    L.polyline([[lat, b.getWest() - s], [lat, b.getEast() + s]], style).addTo(group);
  }
  if (map.getZoom() < 13) return;
  for (let lng = lng0; lng < b.getEast(); lng += s) {
    for (let lat = lat0; lat > b.getSouth(); lat -= s) {
      const code = quadrantFor(lat - s / 2, lng + s / 2);
      if (!code) continue;
      L.marker([lat - s * 0.12, lng + s * 0.12], {
        interactive: false,
        icon: L.divIcon({
          className: '',
          html: `<div style="font:700 10px monospace;color:#f59e0b;text-shadow:0 0 3px #000;white-space:nowrap">${code}</div>`,
          iconSize: [40, 12], iconAnchor: [0, 0],
        }),
      }).addTo(group);
    }
  }
}
