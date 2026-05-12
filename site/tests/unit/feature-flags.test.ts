import { describe, expect, it } from 'vitest';
import rawFlags from '../../src/config/featureFlags.json' with { type: 'json' };
import { featureFlags } from '../../src/config/featureFlags';

describe('featureFlags', () => {
  it('mirrors the cloudFreeTier value from featureFlags.json', () => {
    expect(featureFlags.cloudFreeTier).toBe(rawFlags.cloudFreeTier);
  });

  it('exposes cloudFreeTier as a boolean', () => {
    expect(typeof featureFlags.cloudFreeTier).toBe('boolean');
  });

  it('defaults cloudFreeTier to false while signups are paused', () => {
    expect(featureFlags.cloudFreeTier).toBe(false);
  });

  it('is frozen so consumers cannot mutate flag state at runtime', () => {
    expect(Object.isFrozen(featureFlags)).toBe(true);
  });
});
