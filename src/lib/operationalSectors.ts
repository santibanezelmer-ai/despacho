/**
 * Sectores y cuadrantes propios de cada organización (tabla operational_sectors).
 * Geometría: polígonos [anillo exterior, ...huecos], cada punto [lat, lng].
 * Detección informativa por punto-en-polígono; nunca asigna recursos.
 */
import { pointInTerritory } from './territoryLookup';

export type Ring = [number, number][];
export type SectorKind = 'sector' | 'cuadrante';
export interface OperationalSector {
  id: string;
  kind: SectorKind;
  name: string;
  code: string | null;
  color: string;
  company_id: string | null;
  polygons: Ring[][];
  source: string;
}

export function sectorLabel(s: Pick<OperationalSector, 'name' | 'code'>): string {
  return s.code ? `${s.code} · ${s.name}` : s.name;
}

/** Sectores/cuadrantes de la organización que contienen el punto (incluye borde). */
export function findSectorsAt(lat: number, lng: number, sectors: OperationalSector[]): OperationalSector[] {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];
  return sectors.filter((s) => pointInTerritory(lat, lng, s.polygons) !== 0);
}

/** Texto corto "Sector X / Cuadrante Y" para popups e indicadores. */
export function describeSectorsAt(lat: number, lng: number, sectors: OperationalSector[]): string | null {
  const hits = findSectorsAt(lat, lng, sectors);
  if (!hits.length) return null;
  const order: SectorKind[] = ['sector', 'cuadrante'];
  return hits
    .sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind))
    .map((s) => sectorLabel(s))
    .join(' / ');
}

function closeRing(r: Ring): Ring {
  if (r.length < 3) return r;
  const [a, b] = [r[0], r[r.length - 1]];
  return a[0] === b[0] && a[1] === b[1] ? r.slice(0, -1) : r;
}

function validRing(r: Ring): boolean {
  return r.length >= 3 && r.every(([la, ln]) => Number.isFinite(la) && Number.isFinite(ln) && Math.abs(la) <= 90 && Math.abs(ln) <= 180);
}

export interface ImportedSector { name: string; code: string | null; color: string | null; polygons: Ring[][] }

/** GeoJSON usa [lng, lat]; se invierte a [lat, lng]. */
export function parseGeoJson(text: string): ImportedSector[] {
  const json = JSON.parse(text);
  const features = json.type === 'FeatureCollection' ? json.features : json.type === 'Feature' ? [json] : [{ type: 'Feature', properties: {}, geometry: json }];
  const out: ImportedSector[] = [];
  features.forEach((f: any, i: number) => {
    const g = f?.geometry;
    if (!g) return;
    const polys: number[][][][] = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
    const polygons = polys
      .map((p) => p.map((ring) => closeRing(ring.map(([lng, lat]) => [lat, lng] as [number, number]))).filter(validRing))
      .filter((p) => p.length > 0);
    if (!polygons.length) return;
    const props = f.properties ?? {};
    out.push({
      name: String(props.name ?? props.nombre ?? props.NAME ?? `Sector ${i + 1}`),
      code: props.code ?? props.codigo ?? null,
      color: typeof props.color === 'string' ? props.color : (typeof props.fill === 'string' ? props.fill : null),
      polygons,
    });
  });
  return out;
}

function parseKmlCoords(text: string): Ring {
  return closeRing(
    text.trim().split(/\s+/).map((t) => t.split(',').map(Number)).filter((p) => p.length >= 2)
      .map(([lng, lat]) => [lat, lng] as [number, number]),
  );
}

/** KML (Google Earth / My Maps): cada Placemark con Polygon se vuelve un sector. */
export function parseKml(text: string): ImportedSector[] {
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length) throw new Error('El archivo KML no es válido.');
  const out: ImportedSector[] = [];
  Array.from(doc.getElementsByTagName('Placemark')).forEach((pm, i) => {
    const polygons: Ring[][] = [];
    Array.from(pm.getElementsByTagName('Polygon')).forEach((poly) => {
      const outer = poly.getElementsByTagName('outerBoundaryIs')[0]?.getElementsByTagName('coordinates')[0]?.textContent;
      if (!outer) return;
      const rings = [parseKmlCoords(outer)];
      Array.from(poly.getElementsByTagName('innerBoundaryIs')).forEach((ib) => {
        const c = ib.getElementsByTagName('coordinates')[0]?.textContent;
        if (c) rings.push(parseKmlCoords(c));
      });
      const valid = rings.filter(validRing);
      if (valid.length && validRing(rings[0])) polygons.push(valid);
    });
    if (!polygons.length) return;
    const name = pm.getElementsByTagName('name')[0]?.textContent?.trim() || `Sector ${i + 1}`;
    out.push({ name, code: null, color: null, polygons });
  });
  return out;
}

export async function parseSectorFile(file: File): Promise<ImportedSector[]> {
  const lower = file.name.toLowerCase();
  if (lower.endsWith('.kmz')) {
    const { default: JSZip } = await import('jszip');
    const zip = await JSZip.loadAsync(file);
    const kml = Object.values(zip.files).find((f) => f.name.toLowerCase().endsWith('.kml'));
    if (!kml) throw new Error('El KMZ no contiene un archivo KML.');
    return parseKml(await kml.async('text'));
  }
  const text = await file.text();
  if (lower.endsWith('.kml') || text.trimStart().startsWith('<')) return parseKml(text);
  return parseGeoJson(text);
}
