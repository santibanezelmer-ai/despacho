import { describe, expect, it } from 'vitest';
import { invitationEmailSent } from '../lib/invitationDelivery';

describe('invitation email result', () => {
  it('counts an explicit email_sent true as sent', () => {
    expect(invitationEmailSent({ success: true, email_sent: true })).toBe(true);
  });
  it('does not count an invitation created without email as sent', () => {
    expect(invitationEmailSent({ success: true, email_sent: false })).toBe(false);
  });
  it('does not count missing delivery confirmation or errors as sent', () => {
    for (const result of [null, undefined, {}, { success: true }, { error: 'failed', email_sent: true }]) {
      expect(invitationEmailSent(result)).toBe(false);
    }
  });
});