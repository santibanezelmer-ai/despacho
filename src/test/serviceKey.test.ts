import { describe, it, expect } from 'vitest';
import { isAuthorizedServiceKey, isFalseAlarm, missingCrewRoles } from '@/lib/serviceKey';

describe('cierre de tripulación', () => {
  it('falsa alarma permite cierre sin conductor ni oficial', () => {
    expect(missingCrewRoles([], false, true)).toEqual([]);
    expect(missingCrewRoles([], true, true)).toEqual([]);
  });
  it('detecta falsa alarma por indicador, clave o tipificación', () => {
    expect(isFalseAlarm({ code: '10-0', name: 'Incendio' }, true)).toBe(true);
    expect(isFalseAlarm({ code: '6-16' })).toBe(true);
    expect(isFalseAlarm({ code: '10-0', name: 'Falsa Alarma' })).toBe(true);
    expect(isFalseAlarm({ code: '10-0', name: 'Incendio' }, false)).toBe(false);
    expect(isFalseAlarm(null)).toBe(false);
  });
  it('retirar falsa alarma restablece ambos requisitos', () => {
    expect(missingCrewRoles([], false, false)).toEqual(['Conductor', 'Oficial a Cargo']);
  });
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
