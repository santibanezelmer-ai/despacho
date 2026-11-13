import { describe, expect, it } from 'vitest';
import { isNoteCurrent } from '@/hooks/useDispatchNotes';

describe('comunicados vencen a los 3 días', () => {
  const now = Date.parse('2026-11-13T12:00:00Z');
  it('sigue vigente a las 71 horas', () => {
    expect(isNoteCurrent({ active: true, created_at: new Date(now - 71 * 3600000).toISOString() }, now)).toBe(true);
  });
  it('vence a las 73 horas', () => {
    expect(isNoteCurrent({ active: true, created_at: new Date(now - 73 * 3600000).toISOString() }, now)).toBe(false);
  });
});
