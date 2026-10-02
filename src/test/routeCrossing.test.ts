import { describe, it, expect } from 'vitest';
import { parseRouteCrossingQuery, resolveRouteCrossing } from '@/lib/routeKilometer';
describe('cruces', () => {
  it('parsea variantes', () => {
    for (const q of ['Cruce Ruta 215 con U-475', 'ruta 215 y u-475', 'Ruta 215 / U-475', 'CH-215 esq. U 475'])
      expect(parseRouteCrossingQuery(q)).toEqual({ a: 'CH-215', b: 'U-475' });
    expect(parseRouteCrossingQuery('ruta 215 km 30')).toBeNull();
    expect(parseRouteCrossingQuery('Los Aromos y Las Encinas')).toBeNull();
  });
  it('calcula CH-215 x U-475', async () => {
    const r: any = await resolveRouteCrossing({ a: 'CH-215', b: 'U-475' });
    expect(r.status).toBe('found'); expect(r.kmA).toBeCloseTo(59.9, 1); expect(r.kmB).toBe(0);
  });
});
