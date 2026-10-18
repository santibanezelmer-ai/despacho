import { describe, it, expect } from 'vitest';
import { ACTIVE_EMERGENCIES_POLL_MS } from '@/hooks/useEmergencies';

describe('active emergencies polling', () => {
  it('reconciles every 5 seconds', () => {
    expect(ACTIVE_EMERGENCIES_POLL_MS).toBe(5000);
  });
});
