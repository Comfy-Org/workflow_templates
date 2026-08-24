import { describe, expect, it } from 'vitest';
import { DEFAULTS, RESOLUTION_PRESETS, keyframePositions } from '@/lib/demos/mmh3/config';

describe('MiniMax H3 demo settings', () => {
  it('places references proportionally throughout every supported clip length', () => {
    expect(keyframePositions(5)).toEqual([1, 41, 81]);
    expect(keyframePositions(10)).toEqual([1, 81, 161]);
    expect(keyframePositions(15)).toEqual([1, 121, 241]);
  });

  it('defaults to a 10-second clip', () => {
    expect(DEFAULTS.seconds).toBe(10);
  });

  it('offers resolution presets through 1 MP high quality', () => {
    expect(RESOLUTION_PRESETS).toEqual([
      { label: 'Draft', megapixels: 0.2 },
      { label: 'Standard', megapixels: 0.4 },
      { label: 'High', megapixels: 1 },
    ]);
  });
});
