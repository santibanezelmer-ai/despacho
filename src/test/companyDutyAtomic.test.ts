import { expect, it } from 'vitest';
import { dutyRpcContract, executeDutyCommand, type DutyCommand } from '../lib/companyDuty';

const draft: DutyCommand = {
  kind: 'createDraft', companyId: 'company-a', name: 'Noche',
  start: '2026-11-10T00:00:00Z', end: '2026-11-10T08:00:00Z', mode: 'mixta',
  slots: [
    { role: 'Conductor', mode: 'presencial', start: '2026-11-10T00:00:00Z', end: '2026-11-10T08:00:00Z', capacity: 1, critical: true, specialties: ['conductor'] },
    { role: 'Dotación', mode: 'domiciliaria', start: '2026-11-10T00:00:00Z', end: '2026-11-10T08:00:00Z', capacity: 2, critical: false, specialties: [] },
  ],
};
it('maps the complete draft to one RPC without separate creation calls', () => {
  expect(dutyRpcContract('org-a', draft)).toEqual({ name: 'guard_create_draft', args: {
    _org: 'org-a', _company: 'company-a', _name: 'Noche', _start: draft.start,
    _end: draft.end, _mode: 'mixta', _slots: draft.slots,
  } });
});
it('keeps the new atomic write blocked before installation and real authorization validation', async () => {
  await expect(executeDutyCommand('org-a', draft)).rejects.toThrow();
});