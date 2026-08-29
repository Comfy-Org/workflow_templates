import { afterEach, describe, expect, it } from 'vitest';

import {
  experimentFlags,
  isExperimentEnabled,
  type ExperimentName,
} from '../../src/config/experimentFlags';

const OVERRIDE_KEY = 'EXPERIMENT_MINIMAX_H3_DEMO';

afterEach(() => {
  delete process.env[OVERRIDE_KEY];
});

describe('experiment flags', () => {
  it('gives every declared experiment a usable entry', () => {
    for (const [name, flag] of Object.entries(experimentFlags)) {
      expect(typeof flag.enabled, `${name}.enabled`).toBe('boolean');
      expect(Number.isNaN(Date.parse(flag.updatedAt)), `${name}.updatedAt`).toBe(false);
      // The CI flip writes both, and the Slack alert quotes `reason` — an empty
      // one turns the alert into "the demo went off, no idea why".
      expect(flag.updatedBy.length, `${name}.updatedBy`).toBeGreaterThan(0);
      expect(flag.reason.length, `${name}.reason`).toBeGreaterThan(0);
    }
  });

  it('reads the committed JSON by default', () => {
    expect(isExperimentEnabled('minimaxH3Demo')).toBe(experimentFlags.minimaxH3Demo.enabled);
  });

  it('derives the override variable name from the camelCase flag name', () => {
    // The regex that produces EXPERIMENT_MINIMAX_H3_DEMO from minimaxH3Demo has
    // to split on both letter->capital and digit->capital boundaries. Get it
    // wrong and the override silently never applies, which looks exactly like
    // "the flag is stuck" to whoever is debugging the demo locally.
    process.env[OVERRIDE_KEY] = 'on';
    expect(isExperimentEnabled('minimaxH3Demo')).toBe(true);

    process.env[OVERRIDE_KEY] = 'off';
    expect(isExperimentEnabled('minimaxH3Demo')).toBe(false);
  });

  it('ignores an override that is not exactly on or off', () => {
    for (const value of ['', 'true', '1', 'ON', 'yes']) {
      process.env[OVERRIDE_KEY] = value;
      expect(isExperimentEnabled('minimaxH3Demo'), `override "${value}"`).toBe(
        experimentFlags.minimaxH3Demo.enabled
      );
    }
  });

  it('exposes a frozen object so nothing can flip a flag at runtime', () => {
    const name: ExperimentName = 'minimaxH3Demo';
    expect(Object.isFrozen(experimentFlags)).toBe(true);
    expect(Object.isFrozen(experimentFlags[name])).toBe(true);
  });
});
