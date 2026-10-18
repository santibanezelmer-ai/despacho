import { describe, it, expect } from 'vitest';
import { emergencyStatusFromVehicle } from '@/lib/vehicleOperationalStatus';

describe('emergencyStatusFromVehicle', () => {
  it('6-3 en el lugar pasa la emergencia de despacho a en_trabajo', () => {
    expect(emergencyStatusFromVehicle('despacho', 'en_lugar')).toBe('en_trabajo');
  });
  it('6-7 pasa la emergencia a controlada', () => {
    expect(emergencyStatusFromVehicle('en_trabajo', 'controlada')).toBe('controlada');
  });
  it('nunca retrocede el estado', () => {
    expect(emergencyStatusFromVehicle('controlada', 'en_lugar')).toBeNull();
  });
  it('no toca emergencias finalizadas', () => {
    expect(emergencyStatusFromVehicle('finalizada', 'controlada')).toBeNull();
  });
  it('6-9 retirándose no cambia el estado general', () => {
    expect(emergencyStatusFromVehicle('en_trabajo', 'retirandose')).toBeNull();
  });
});
