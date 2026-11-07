import { describe, it, expect } from 'vitest';
import { isAuthorizedServiceKey, missingCrewRoles } from '@/lib/serviceKey';

describe('cierre de tripulación', () => {
  it('10-9 se cierra solo con conductor', () => {
    expect(isAuthorizedServiceKey({ code: '10-9', name: 'Otros servicios' })).toBe(true);
    expect(missingCrewRoles(['conductor'], true)).toEqual([]);
  });
  it('10-9 sin conductor sigue bloqueado', () => {
    expect(missingCrewRoles(['oficial_a_cargo'], true)).toEqual(['Conductor']);
  });
  it('emergencias normales exigen conductor y oficial a cargo', () => {
    expect(isAuthorizedServiceKey({ code: '10-0', name: 'Incendio' })).toBe(false);
    expect(missingCrewRoles(['conductor'], false)).toEqual(['Oficial a Cargo']);
  });
});
