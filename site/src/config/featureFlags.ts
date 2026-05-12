import rawFlags from './featureFlags.json' with { type: 'json' };

interface FeatureFlags {
  readonly cloudFreeTier: boolean;
}

const { cloudFreeTier } = rawFlags;

export const featureFlags: FeatureFlags = Object.freeze({ cloudFreeTier });
