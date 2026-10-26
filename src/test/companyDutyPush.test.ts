import { describe, it, expect } from 'vitest';
import { dutyCommandQueuesPush } from '@/lib/companyDuty';

describe('guard push triggers', () => {
  it('assigning a volunteer triggers delivery', () => expect(dutyCommandQueuesPush({ kind: 'assign', slotId: 's', volunteerId: 'v' })).toBe(true));
  it('publishing triggers delivery', () => expect(dutyCommandQueuesPush({ kind: 'publish', shiftId: 's', expected: 'borrador', reason: '' })).toBe(true));
  it('volunteer response does not trigger delivery', () => expect(dutyCommandQueuesPush({ kind: 'confirm', assignmentId: 'a', accept: true, reason: '' })).toBe(false));
});
