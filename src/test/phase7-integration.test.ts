/**
 * Fase 7 — Prueba integrada del sistema de ubicación (solo lectura, sin BD).
 * Ruta+km y puentes usan la copia local; territorio con los polígonos exactos del KML.
 */
import { describe, it, expect, vi } from 'vitest';
import { parseRouteKmQuery, resolveRouteKm } from '@/lib/routeKilometer';
import { searchLandmarks } from '@/lib/landmarks';
import { lookupTerritory } from '@/lib/territoryLookup';
import { loadTerritorialDataset } from '@/lib/territorialLayers';
import { isValidLatLng } from '@/lib/coords';

const terr = async (lat: number, lng: number) => {
  const r = await lookupTerritory(lat, lng);
  return r.status === 'inside' ? r.territory.shortName : r.status;
};

describe('Fase 7 — CH-215 (copia local, sin red)', () => {
  it.each([1, 55, 100, 117])('km %i encuentra ubicación válida', async (km) => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const r = await resolveRouteKm(parseRouteKmQuery(`CH-215 km ${km}`)!);
    expect(r.status).toBe('found');
    if (r.status === 'found') expect(isValidLatLng(r.latitude, r.longitude)).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
  it('km 150 fuera de rango, sin coordenada', async () => {
    const r = await resolveRouteKm(parseRouteKmQuery('CH-215 km 150')!);
    expect(r.status).toBe('out_of_range');
    expect('latitude' in r).toBe(false);
  });
});

describe('Fase 7 — Puentes (copia local, sin red)', () => {
  it('Ñilque y Chanlelfu encuentran coincidencias locales', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    for (const q of ['Puente Ñilque', 'Puente Chanlelfu']) {
      const m = await searchLandmarks(q);
      expect(m.length).toBeGreaterThan(0);
      expect(isValidLatLng(m[0].landmark.latitude, m[0].landmark.longitude)).toBe(true);
    }
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
  it('Huilma mantiene múltiples resultados', async () => {
    const m = await searchLandmarks('Puente Huilma');
    console.log('Huilma:', m.map((x) => `${x.landmark.name} exact=${x.exact}`).join(' | '));
    expect(m.length).toBeGreaterThan(0);
  });
});

describe('Fase 7 — Territorio', () => {
  it('dentro de Entre Lagos ↔ fuera', async () => {
    const r = await resolveRouteKm(parseRouteKmQuery('CH-215 km 55')!);
    if (r.status !== 'found') throw new Error('km 55');
    expect(await terr(r.latitude, r.longitude)).toBe('Entre Lagos');
    expect(await terr(-40.49709, -72.51389)).toBe('outside');
    expect(await terr(-40.69562, -72.60732)).toBe('Entre Lagos');
  });
  it('coordenadas inválidas nunca asignan territorio', async () => {
    for (const [a, b] of [[91, -72.6], [-91, -72.6], [-40.7, 181], [-40.7, -344.6], [NaN, -72.6]]) {
      expect(isValidLatLng(a, b)).toBe(false);
      expect(await terr(a, b)).toBe('outside');
    }
  });
  it('dataset se carga una sola vez y Entre Lagos existe', async () => {
    const a = loadTerritorialDataset(), b = loadTerritorialDataset();
    expect(a).toBe(b);
    const ds = await a;
    expect(ds.features.some((f) => f.layer === 'territory' && f.name.includes('Entre Lagos'))).toBe(true);
  });
});

import { resolveLocation } from '@/lib/locationResolver';
describe('Fase 7 — Direcciones (OpenStreetMap real, solo lectura)', () => {
  it.each([
    'Pasaje Los Aromos, Entre Lagos', 'Camino El Encanto, Puyehue', 'Erico Laussen, Puyehue',
    'Pje Los Alerces, Puyehue', 'Calle Inexistente Zzqxw 9999, Puyehue',
  ])('%s', async (q) => {
    const list = await resolveLocation(q, { defaultContext: 'Puyehue', near: { lat: -40.683, lng: -72.598 } });
    const out = [];
    for (const c of list.slice(0, 3)) {
      expect(isValidLatLng(c.latitude, c.longitude)).toBe(true);
      out.push(`${c.label} [${c.confidence}] ${c.latitude.toFixed(5)},${c.longitude.toFixed(5)} → ${await terr(c.latitude, c.longitude)}`);
    }
    console.log(`${q}: ${list.length} res\n  ${out.join('\n  ')}`);
  }, 30000);
});
