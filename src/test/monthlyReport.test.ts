import { describe, expect, it } from 'vitest';
import { monthlyDue, previousMonth, recipientAllowed, summarize } from '../../supabase/functions/_shared/monthly-report';

describe('monthly report rules', () => {
  it('includes the complete previous calendar month in Chile', () => {
    expect(previousMonth(new Date('2026-12-01T11:00:00Z'))).toEqual({ period: '2026-11', start: '2026-11-01T03:00:00.000Z', end: '2026-12-01T03:00:00.000Z' });
    expect(previousMonth(new Date('2026-07-01T12:00:00Z'))).toEqual({ period: '2026-06', start: '2026-06-01T04:00:00.000Z', end: '2026-07-01T04:00:00.000Z' });
  });
  it('handles January across years', () => {
    expect(previousMonth(new Date('2027-01-01T11:00:00Z')).period).toBe('2026-12');
  });
  it('runs on day 1 at 08 Chile time in both offsets', () => {
    expect(monthlyDue(new Date('2026-12-01T11:00:00Z'))).toBe(true);
    expect(monthlyDue(new Date('2026-07-01T12:00:00Z'))).toBe(true);
    expect(monthlyDue(new Date('2026-12-01T12:00:00Z'))).toBe(false);
    expect(monthlyDue(new Date('2026-12-02T11:00:00Z'))).toBe(false);
  });
  it('sends only to active officials and admins', () => {
    expect(recipientAllowed({ status: 'active', role: 'oficial' })).toBe(true);
    expect(recipientAllowed({ status: 'active', role: 'admin' })).toBe(true);
    expect(recipientAllowed({ status: 'suspended', role: 'admin' })).toBe(false);
    expect(recipientAllowed({ status: 'active', role: 'voluntario' })).toBe(false);
    expect(recipientAllowed({ status: 'active', role: 'operador' })).toBe(false);
  });
  it('measures dispatch to first arrival and nonnegative recorded kilometers', () => {
    const result = summarize([{ id: 'e1', dispatched_at: '2026-11-10T10:00:00Z', finished_at: '2026-11-10T11:00:00Z', status: 'finalizada', emergency_key_id: 'k1', emergency_vehicles: [
      { vehicle_id: 'v1', on_scene_at: '2026-11-10T10:06:00Z', odometer_start: 100, odometer_end: 125 },
      { vehicle_id: 'v2', on_scene_at: '2026-11-10T10:08:00Z', odometer_start: 200, odometer_end: 190 },
    ] }]);
    expect(result.responseMinutes).toBe(6);
    expect(result.kilometers).toBe(25);
    expect(result.durationMinutes).toBe(60);
  });
});