import { describe, it, expect, vi, beforeEach } from 'vitest';
import { evaluateLocation, haversineKm, canAutoAccept } from '@/lib/geoJurisdiction';

const ORG = { lat: -40.6842375, lng: -72.5952206, commune: 'Puyehue', region: 'Región de Los Lagos' };
const FRUTILLAR = { lat: -41.1167, lng: -73.05 };
const OSORNO = { lat: -40.5739, lng: -73.1336 };

vi.mock('@/lib/googlePlaces', () => ({
  newPlacesSession: () => 's',
  placesAutocomplete: vi.fn(),
  placeDetails: vi.fn(),
}));
vi.mock('@/lib/locationResolver', () => ({ resolveLocation: vi.fn(async () => []) }));

import * as gp from '@/lib/googlePlaces';
import { autoGeocodeDetailed } from '@/lib/autoGeocode';

describe('validador geográfico', () => {
  it('1. punto en Entre Lagos se acepta', () => {
    expect(evaluateLocation({ latitude: -40.685, longitude: -72.6, commune: 'Puyehue' }, ORG).status).toBe('ok');
  });
  it('2. Frutillar está a más de 50 km y queda fuera', () => {
    expect(haversineKm(ORG, FRUTILLAR)).toBeGreaterThan(50);
    expect(evaluateLocation({ latitude: FRUTILLAR.lat, longitude: FRUTILLAR.lng, commune: 'Frutillar' }, ORG).status).toBe('outside');
  });
  it('3. otra comuna dentro del radio requiere revisión', () => {
    const c = evaluateLocation({ latitude: OSORNO.lat, longitude: OSORNO.lng, commune: 'Osorno' }, ORG);
    expect(c.status).toBe('review');
    expect(canAutoAccept(c)).toBe(false);
  });
  it('4. otra región requiere revisión', () => {
    expect(evaluateLocation({ latitude: -40.69, longitude: -72.6, region: 'Región de Los Ríos' }, ORG).status).toBe('review');
  });
  it('5. región con distinta escritura no genera falsa alarma', () => {
    expect(evaluateLocation({ latitude: -40.69, longitude: -72.6, region: 'Los Lagos', commune: 'puyehue' }, ORG).status).toBe('ok');
  });
  it('6. fuentes locales confiables (ruta/punto local) no se contrastan por comuna', () => {
    expect(evaluateLocation({ latitude: OSORNO.lat, longitude: OSORNO.lng, commune: 'Osorno', trusted: true }, ORG).status).toBe('ok');
  });
  it('7. radio configurable', () => {
    expect(evaluateLocation({ latitude: FRUTILLAR.lat, longitude: FRUTILLAR.lng, trusted: true }, ORG, 80).status).toBe('ok');
  });
  it('8. sin coordenadas de organización el estado es desconocido y no se acepta solo', () => {
    const c = evaluateLocation({ latitude: -40.69, longitude: -72.6 }, null);
    expect(c.status).toBe('unknown');
    expect(canAutoAccept(c)).toBe(false);
  });
  it('9. coordenadas inválidas se rechazan', () => {
    expect(evaluateLocation({ latitude: NaN, longitude: 0 }, ORG).status).toBe('outside');
  });
});

describe('despacho automático', () => {
  beforeEach(() => vi.clearAllMocks());
  it('10. calle buscada en Puyehue que Google ubica en Frutillar nunca se acepta', async () => {
    (gp.placesAutocomplete as any).mockResolvedValue([{ placeId: 'x', main: 'Arturo Prat', secondary: 'Frutillar', distanceMeters: null }]);
    (gp.placeDetails as any).mockResolvedValue({ latitude: FRUTILLAR.lat, longitude: FRUTILLAR.lng, commune: 'Frutillar', region: 'Los Lagos' });
    const out = await autoGeocodeDetailed('Arturo Prat 123', { landmarks: [], near: ORG, defaultContext: 'Puyehue', origin: ORG });
    expect(out.result).toBeNull();
    expect(out.rejected[0].check.status).toBe('outside');
  });
  it('11. punto local registrado se conserva y gana sobre Google', async () => {
    const lm = [{ id: '1', name: 'Cancha Municipal', aliases: [], category: null, latitude: -40.684, longitude: -72.59, notes: null } as any];
    const out = await autoGeocodeDetailed('Cancha Municipal', { landmarks: lm, near: ORG, defaultContext: 'Puyehue', origin: ORG });
    expect(out.result?.source).toBe('punto local');
    expect(gp.placesAutocomplete).not.toHaveBeenCalled();
  });
});
