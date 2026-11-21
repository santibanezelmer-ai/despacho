import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import FinalizeEmergencyDialog from '@/components/dispatch/FinalizeEmergencyDialog';

const state = vi.hoisted(() => ({
  vehicles: [{ id: 'ev-1', released_at: '2026-11-21T18:00:00Z' as string | null, vehicles: { code: 'B-1' } }],
}));
vi.mock('@/hooks/useEmergencyReturnVehicles', () => ({
  useEmergencyReturnVehicles: () => ({ data: state.vehicles, isLoading: false }),
}));
vi.mock('@/hooks/useEmergencyCrewRoles', () => ({
  useEmergencyCrewRoles: () => ({ data: [], isLoading: false }),
}));
vi.mock('@/components/dispatch/VehicleReturnManager', () => ({ default: () => null }));
vi.mock('@/components/dispatch/VehiclePersonnelManager', () => ({ default: () => null }));

afterEach(() => {
  cleanup();
  state.vehicles[0].released_at = '2026-11-21T18:00:00Z';
});

describe('finalización de falsa alarma', () => {
  const show = (falseAlarm: boolean) => {
    const onConfirm = vi.fn();
    render(<FinalizeEmergencyDialog emergencyId="e-1" emergencyStatus="controlada" folio="EMG-TEST"
      falseAlarm={falseAlarm} onConfirm={onConfirm} onClose={vi.fn()} />);
    return { onConfirm, button: screen.getByRole('button', { name: 'Finalizar emergencia' }) };
  };

  it('confirma sin chofer ni oficial cuando los móviles ya retornaron', async () => {
    const { onConfirm, button } = show(true);
    expect(button).not.toBeDisabled();
    await act(async () => { fireEvent.click(button); });
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('sigue impidiendo cierre si un móvil no ha retornado', () => {
    state.vehicles[0].released_at = null;
    const { onConfirm, button } = show(true);
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('las alarmas normales siguen exigiendo ambos roles', () => {
    const { button } = show(false);
    expect(button).toBeDisabled();
  });
});