import snapshot from '../data/feature-flags.snapshot.json' with { type: 'json' };

interface FeatureFlags {
  readonly cloudFreeTier: boolean;
}

export const featureFlags: FeatureFlags = Object.freeze({
  cloudFreeTier: snapshot.flags.cloudFreeTier,
});
