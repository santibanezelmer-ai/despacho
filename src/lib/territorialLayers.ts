/**
 * Capas territoriales (Fase 5) — solo Consola Web, solo visualización.
 * Copia local de solo lectura del KML "Mapa Cobertura Territorial Prehospitalaria
 * Provincia de Osorno" (scripts/import-territorial-kml.py). Datos comunes, no ligados
 * a una organización. Nunca se consulta My Maps en tiempo de ejecución.
 * La determinación de jurisdicción (punto en polígono) es la Fase 6: aquí no se hace.
 */
import L from 'leaflet';

export type TerritorialLayerId =
  | 'health' | 'territory' | 'police' | 'evacam' | 'fire' | 'aed' | 'residence' | 'ambulance';

export interface TerritorialFeature {
  id: string;
  layer: TerritorialLayerId;
  name: string;
  description: string | null;
  fields: [string, string][] | null;
  color: string | null;
  geometry: 'point' | 'polygon' | 'line';
  coordinates: any;
}

export interface TerritorialDataset {
  meta: { source_name: string; source_origin: string; source_file: string; version: string | null; imported_at: string };
  layers: { id: TerritorialLayerId; label: string; counts: Record<string, number> }[];
  features: TerritorialFeature[];
}

/** Orden y color de marcador por categoría (los polígonos usan el color del KML). */
export const TERRITORIAL_LAYERS: { id: TerritorialLayerId; label: string; color: string }[] = [
  { id: 'territory', label: 'Territorio Prehospitalario', color: '#6366f1' },
  { id: 'ambulance', label: 'Ambulancias Prehospitalarias', color: '#e11d48' },
  { id: 'health', label: 'Establecimientos de Salud', color: '#0ea5e9' },
  { id: 'police', label: 'Carabineros', color: '#15803d' },
  { id: 'fire', label: 'Bomberos', color: '#ea580c' },
  { id: 'aed', label: 'DEA', color: '#db2777' },
  { id: 'evacam', label: 'Posibles EVACAM', color: '#ca8a04' },
  { id: 'residence', label: 'Hogares y Residencias Protegidas', color: '#7c3aed' },
];

let datasetPromise: Promise<TerritorialDataset> | null = null;
export function loadTerritorialDataset(): Promise<TerritorialDataset> {
  datasetPromise ??= import('@/data/territorial/osorno-prehospitalario.json')
    .then((m) => (m.default ?? m) as unknown as TerritorialDataset);
  return datasetPromise;
}

function popupContent(f: TerritorialFeature, label: string, source: string): HTMLElement {
  const root = document.createElement('div');
  root.style.maxWidth = '280px';
  root.style.fontSize = '12px';
  const add = (tag: string, text: string, style = '') => {
    const el = document.createElement(tag);
    el.textContent = text;
    if (style) el.setAttribute('style', style);
    root.appendChild(el);
    return el;
  };
  add('div', f.name || 'Sin nombre', 'font-weight:700;font-size:13px;margin-bottom:2px');
  add('div', `Tipo: ${label}`);
  // Hogares y Residencias Protegidas: el KML solo trae contactos personales
  // (nombres, teléfonos, correos). Se conservan en la copia local pero no se exponen.
  if (f.layer === 'residence') {
    // solo nombre, tipo y fuente
  } else if (f.fields?.length) {
    const box = document.createElement('div');
    box.setAttribute('style', 'margin-top:4px;max-height:160px;overflow:auto');
    f.fields.forEach(([k, v]) => {
      const row = document.createElement('div');
      row.textContent = `${k}: ${v}`;
      box.appendChild(row);
    });
    root.appendChild(box);
  } else if (f.description) {
    add('div', f.description, 'margin-top:4px;white-space:pre-line;max-height:160px;overflow:auto');
  }
  add('div', `Fuente: ${source}`, 'margin-top:6px;font-size:10px;opacity:.7');
  return root;
}

/** Construye un LayerGroup por categoría (una sola vez por mapa). */
export function buildTerritorialLayerGroups(map: L.Map, ds: TerritorialDataset): Map<TerritorialLayerId, L.LayerGroup> {
  const groups = new Map<TerritorialLayerId, L.LayerGroup>();
  const labels = new Map(TERRITORIAL_LAYERS.map((l) => [l.id, l]));
  // SVG: solo la forma captura clics (un canvas encima bloquearía los polígonos).
  // Polígonos debajo, puntos encima y ambos bajo los marcadores operativos.
  if (!map.getPane('territorialAreas')) map.createPane('territorialAreas').style.zIndex = '380';
  if (!map.getPane('territorialPoints')) map.createPane('territorialPoints').style.zIndex = '420';
  const renderer = L.svg({ padding: 0.5, pane: 'territorialAreas' });
  const pointRenderer = L.svg({ padding: 0.5, pane: 'territorialPoints' });
  for (const f of ds.features) {
    const cat = labels.get(f.layer);
    if (!cat) continue;
    let g = groups.get(f.layer);
    if (!g) { g = L.layerGroup(); groups.set(f.layer, g); }
    const content = () => popupContent(f, cat.label, ds.meta.source_name);
    if (f.geometry === 'polygon') {
      const color = f.color ?? cat.color;
      // Geometría exacta del KML, sin simplificar (smoothFactor 0).
      L.polygon(f.coordinates, { color, weight: 2, fillColor: color, fillOpacity: 0.12, smoothFactor: 0, renderer, pane: 'territorialAreas' })
        .bindPopup(content).bindTooltip(f.name, { sticky: true }).addTo(g);
    } else if (f.geometry === 'line') {
      L.polyline(f.coordinates, { color: f.color ?? cat.color, weight: 3, smoothFactor: 0, renderer })
        .bindPopup(content).addTo(g);
    } else {
      L.circleMarker(f.coordinates, { radius: 6, color: '#ffffff', weight: 1.5, fillColor: cat.color, fillOpacity: 0.95, renderer: pointRenderer, pane: 'territorialPoints' })
        .bindPopup(content).bindTooltip(f.name, { direction: 'top' }).addTo(g);
    }
  }
  return groups;
}
