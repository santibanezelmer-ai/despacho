import { describe, it, expect } from 'vitest';
import { computeAvgResponse } from '@/hooks/useAvgResponseTime';
const now = Date.parse('2026-11-14T12:00:00Z');
describe('computeAvgResponse', () => {
  it('averages dispatch to arrival within 30 days', () => {
    const r = computeAvgResponse([
      { created: '2026-11-10T10:00:00Z', start: '2026-11-10T10:00:00Z', arrival: '2026-11-10T10:06:00Z' },
      { created: '2026-11-11T10:00:00Z', start: '2026-11-11T10:00:00Z', arrival: '2026-11-11T10:08:00Z' },
      { created: '2026-11-12T10:00:00Z', start: '2026-11-12T10:00:00Z', arrival: null },
    ], now);
    expect(r?.avgMs).toBe(7 * 60_000);
    expect(r?.count).toBe(2);
  });
});
