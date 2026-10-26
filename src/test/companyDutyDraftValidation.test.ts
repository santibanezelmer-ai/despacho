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

import { defaultSlotMode, dutyStatusOptions, filterMyAssignmentsByStatus, incompatibleSlotIndexes } from '../lib/companyDuty';
const slot = base.slots[0];
describe('Guardias slot scope and mode rules', () => {
  it('rejects a slot starting before the shift', () => {
    expect(buildDraftCommand({ ...base, slots: [{ ...slot, start: '2026-10-26T19:00' }] }, ['c1']).ok).toBe(false);
  });
  it('rejects a slot ending after the shift', () => {
    expect(buildDraftCommand({ ...base, slots: [{ ...slot, end: '2026-10-27T09:00' }] }, ['c1']).ok).toBe(false);
  });
  it('rejects a domiciliaria slot in a presencial shift', () => {
    expect(buildDraftCommand({ ...base, mode: 'presencial', slots: [{ ...slot, mode: 'domiciliaria' }] }, ['c1']).ok).toBe(false);
  });
  it('accepts mixed slot modes in a mixta shift', () => {
    expect(buildDraftCommand({ ...base, slots: [slot, { ...slot, mode: 'domiciliaria' }] }, ['c1']).ok).toBe(true);
  });
  it('rejects impossible calendar dates', () => {
    expect(buildDraftCommand({ ...base, start: '2026-02-31T20:00' }, ['c1']).ok).toBe(false);
    expect(buildDraftCommand({ ...base, slots: [{ ...slot, end: 'not-a-date' }] }, ['c1']).ok).toBe(false);
  });
  it('new slots follow the shift mode; mixta defaults to presencial', () => {
    expect(defaultSlotMode('domiciliaria')).toBe('domiciliaria');
    expect(defaultSlotMode('presencial')).toBe('presencial');
    expect(defaultSlotMode('mixta')).toBe('presencial');
  });
  it('reports existing incompatible slots instead of rewriting them', () => {
    const slots = [{ mode: 'presencial' }, { mode: 'domiciliaria' }];
    expect(incompatibleSlotIndexes('domiciliaria', slots)).toEqual([1]);
    expect(incompatibleSlotIndexes('mixta', slots)).toEqual([]);
    expect(slots[0].mode).toBe('presencial');
  });
  it('personal view filters by assignment status; admin by shift status', () => {
    expect(dutyStatusOptions('own')).toEqual(['propuesto', 'confirmado', 'rechazado', 'retirado', 'reemplazado']);
    expect(dutyStatusOptions('organization')).toContain('publicado');
    const rows = [{ assignment_status: 'propuesto' }, { assignment_status: 'confirmado' }, { assignment_status: 'rechazado' }];
    expect(filterMyAssignmentsByStatus(rows, 'confirmado')).toEqual([{ assignment_status: 'confirmado' }]);
    expect(filterMyAssignmentsByStatus(rows, 'all')).toHaveLength(3);
  });
});
