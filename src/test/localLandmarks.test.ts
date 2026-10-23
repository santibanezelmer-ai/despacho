import { describe, it, expect } from 'vitest';
import { matchLocalLandmarks, type LocalLandmark } from '@/lib/localLandmarks';

const base = { category: null, latitude: -40, longitude: -72, notes: null };
const list: LocalLandmark[] = [
  { ...base, id: '1', name: 'Almacén Don Tito', aliases: ['esquina tito'] },
  { ...base, id: '2', name: 'Fundo Las Rosas', aliases: [] },
];

describe('matchLocalLandmarks', () => {
  it('encuentra por nombre sin tildes', () => {
    expect(matchLocalLandmarks('almacen', list).map(l => l.id)).toEqual(['1']);
  });
  it('encuentra por apodo', () => {
    expect(matchLocalLandmarks('esquina tito', list).map(l => l.id)).toEqual(['1']);
  });
  it('no devuelve nada sin coincidencia', () => {
    expect(matchLocalLandmarks('copec', list)).toEqual([]);
  });
});
