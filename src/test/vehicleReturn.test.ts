import { describe, it, expect } from 'vitest';
import { parseReturnOdometer, runSequential } from '@/lib/vehicleReturn';

describe('6-10 kilometraje de llegada', () => {
  it('exige kilometraje', () => {
    expect(parseReturnOdometer('', 100).ok).toBe(false);
  });
  it('rechaza km menor al de salida', () => {
    expect(parseReturnOdometer('90', 100)).toEqual({ ok: false, error: 'Km menor al de salida (100)' });
  });
  it('acepta km válido', () => {
    expect(parseReturnOdometer('120', 100)).toEqual({ ok: true, value: 120 });
  });
});

describe('6-10 coordinado', () => {
  it('registra el resultado individual y no detiene el resto si uno falla', async () => {
    const res = await runSequential([{ code: 'B-1' }, { code: 'B-2' }, { code: 'R-1' }], async i => {
      if (i.code === 'B-2') throw new Error('Ya estaba en cuartel o no se pudo guardar');
    });
    expect(res).toEqual([
      { code: 'B-1', ok: true },
      { code: 'B-2', ok: false, error: 'Ya estaba en cuartel o no se pudo guardar' },
      { code: 'R-1', ok: true },
    ]);
  });
});
