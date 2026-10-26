import { describe, expect, it, vi } from 'vitest';
import { buildDraftCommand, executeDutyCommand } from '../lib/companyDuty';

const base = { companyId: 'c1', name: 'Noche', start: '2026-10-26T20:00', end: '2026-10-27T08:00', mode: 'mixta',
  slots: [{ role: 'Conductor', mode: 'presencial', start: '2026-10-26T20:00', end: '2026-10-27T08:00', capacity: 2 }] };

describe('Guardias draft validation (writes blocked)', () => {
  it('builds a timezone-qualified createDraft command', () => {
    const r = buildDraftCommand(base, ['c1']);
    expect(r.ok).toBe(true);
    if ('command' in r) { expect(r.command.start.endsWith('Z')).toBe(true); expect(r.command.slots[0].capacity).toBe(2); }
  });
  it('rejects a company outside the authorized scope', () => {
    expect(buildDraftCommand(base, ['c2']).ok).toBe(false);
  });
  it('rejects end before start', () => {
    expect(buildDraftCommand({ ...base, end: '2026-10-26T19:00' }, ['c1']).ok).toBe(false);
  });
  it('rejects capacity above 500', () => {
    expect(buildDraftCommand({ ...base, slots: [{ ...base.slots[0], capacity: 501 }] }, ['c1']).ok).toBe(false);
  });
  it('never calls the transport while operations are disabled', async () => {
    const transport = vi.fn();
    const r = buildDraftCommand(base, ['c1']);
    if ('errors' in r) throw new Error('invalid');
    await expect(executeDutyCommand('org', r.command, transport)).rejects.toThrow();
    expect(transport).not.toHaveBeenCalled();
  });
});
