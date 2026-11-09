import { describe, it, expect } from 'vitest';
import { isStaleChunkError } from '@/lib/staleChunk';

describe('isStaleChunkError', () => {
  it('detecta módulo dinámico desactualizado', () => {
    expect(isStaleChunkError('Failed to fetch dynamically imported module: https://operixdispatch.com/assets/RadioComplementSection-8ujKx7Pj.js')).toBe(true);
  });
  it('detecta Safari', () => {
    expect(isStaleChunkError('Importing a module script failed.')).toBe(true);
  });
  it('ignora otros errores', () => {
    expect(isStaleChunkError('useAuth must be used within AuthProvider')).toBe(false);
  });
});
