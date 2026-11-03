import { describe, expect, it } from 'vitest';
import { usableDispatchAddress } from '@/lib/dispatchAddress';

describe('usable dispatch addresses', () => {
  it('recovers a pending lookup draft with its exact coordinates', () => {
    expect(usableDispatchAddress('Obteniendo dirección…', { latitude: -40.720176, longitude: -72.575642 }))
      .toBe('-40.720176, -72.575642');
  });
  it('rejects a pending address without coordinates', () => {
    expect(usableDispatchAddress('Obteniendo dirección…', null)).toBe('');
  });
  it('rejects a pending address with invalid coordinates', () => {
    expect(usableDispatchAddress('Obteniendo dirección…', { latitude: 91, longitude: -72.575642 })).toBe('');
  });
  it('preserves an operator-entered address', () => {
    expect(usableDispatchAddress('Av. República 123', { latitude: -40.720176, longitude: -72.575642 }))
      .toBe('Av. República 123');
  });
});