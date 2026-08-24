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

  it('returns null for audio, which paints an icon rather than an image', () => {
    expect(featuredPreloadImage([template({ thumbnails: ['sound.mp3'] })])).toBeNull();
  });

  it('preloads the poster for a video slate, which is the usual slide one', () => {
    // Returning null here is the bug that left the live listing with zero
    // preloads while its LCP element was this very slate.
    const generated = 'https://comfy-hub-assets.comfy.org/uploads/306cccad-6557-40d5-9bea-db46db4ab789.mp4';
    expect(featuredPreloadImage([template({ thumbnails: [generated] })])).toBe(
      'https://media.comfy.org/hub-media/posters/306cccad-6557-40d5-9bea-db46db4ab789.jpg'
    );
  });

  it('falls back to the frame transform when no copy has been generated', () => {
    const unknown = 'https://comfy-hub-assets.comfy.org/uploads/00000000-0000-0000-0000-000000000000.mp4';
    expect(featuredPreloadImage([template({ thumbnails: [unknown] })])).toBe(
      'https://comfy-hub-assets.comfy.org/cdn-cgi/media/mode=frame,time=1s/uploads/00000000-0000-0000-0000-000000000000.mp4'
    );
  });

  it('returns null when the item has no thumbnails', () => {
    expect(featuredPreloadImage([template({ thumbnails: [] })])).toBeNull();
  });
});
