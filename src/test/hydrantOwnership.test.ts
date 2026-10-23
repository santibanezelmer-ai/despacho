import { describe, expect, it } from 'vitest';
import { isOwnHydrant } from '@/lib/hydrants';

describe('shared hydrant ownership', () => {
  it('retains ownership for the contributing organization', () => {
    expect(isOwnHydrant('entre-lagos', 'entre-lagos')).toBe(true);
  });
  it('does not grant ownership to another organization reading a shared hydrant', () => {
    expect(isOwnHydrant('entre-lagos', 'demo')).toBe(false);
  });
  it('does not grant ownership without an organization', () => {
    expect(isOwnHydrant('entre-lagos', null)).toBe(false);
  });
});