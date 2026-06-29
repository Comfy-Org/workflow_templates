import { describe, expect, it } from 'vitest';
import { getFeatured, featuredPreloadImage, FEATURED_COUNT } from '../../src/lib/featured';
import type { SerializedTemplate } from '../../src/lib/hub-api';

/** Minimal SerializedTemplate; only the fields under test need to be meaningful. */
function template(overrides: Partial<SerializedTemplate>): SerializedTemplate {
  return {
    name: 'n',
    shareId: 's',
    title: 'T',
    description: '',
    mediaType: 'image',
    tags: [],
    models: [],
    logos: [],
    usage: 0,
    date: '',
    thumbnails: [],
    username: '',
    creatorDisplayName: '',
    creatorAvatarUrl: '',
    isApp: false,
    ...overrides,
  };
}

describe('getFeatured', () => {
  it('orders by usage descending', () => {
    const result = getFeatured([
      template({ name: 'low', usage: 10 }),
      template({ name: 'high', usage: 100 }),
      template({ name: 'mid', usage: 50 }),
    ]);
    expect(result.map((t) => t.name)).toEqual(['high', 'mid', 'low']);
  });

  it('caps at FEATURED_COUNT by default', () => {
    const many = Array.from({ length: FEATURED_COUNT + 4 }, (_, i) =>
      template({ name: `t${i}`, usage: i })
    );
    expect(getFeatured(many)).toHaveLength(FEATURED_COUNT);
  });

  it('honors an explicit count', () => {
    const many = Array.from({ length: 10 }, (_, i) => template({ name: `t${i}`, usage: i }));
    expect(getFeatured(many, 3)).toHaveLength(3);
  });

  it('does not mutate the input array', () => {
    const input = [template({ name: 'a', usage: 1 }), template({ name: 'b', usage: 2 })];
    getFeatured(input);
    expect(input.map((t) => t.name)).toEqual(['a', 'b']);
  });
});

describe('featuredPreloadImage', () => {
  it('returns the thumbnail URL of the first item for image assets', () => {
    const featured = [template({ thumbnails: ['flux.webp'] })];
    expect(featuredPreloadImage(featured)).toBe('/workflows/thumbnails/flux.webp');
  });

  it('passes through absolute URLs unchanged', () => {
    const featured = [template({ thumbnails: ['https://cdn.example.com/a.webp'] })];
    expect(featuredPreloadImage(featured)).toBe('https://cdn.example.com/a.webp');
  });

  it('returns null when there is no featured item', () => {
    expect(featuredPreloadImage([])).toBeNull();
  });

  it('returns null when the primary asset is video/audio (not image-preloadable)', () => {
    expect(featuredPreloadImage([template({ thumbnails: ['clip.mp4'] })])).toBeNull();
    expect(featuredPreloadImage([template({ thumbnails: ['sound.mp3'] })])).toBeNull();
  });

  it('returns null when the item has no thumbnails', () => {
    expect(featuredPreloadImage([template({ thumbnails: [] })])).toBeNull();
  });
});
