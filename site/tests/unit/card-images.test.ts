import { describe, expect, it } from 'vitest';
import { assignCardTemplates, resolveRailImages } from '../../src/lib/workflow-pages/card-images';
import type { MatcherTemplate } from '../../src/lib/hub-api';

function tpl(name: string, tags: string[], usage = 100): MatcherTemplate {
  return {
    name,
    shareId: name,
    title: name,
    description: '',
    tags,
    models: [],
    usage,
    thumbnails: [`${name}.webp`],
  };
}

describe('assignCardTemplates resolution order', () => {
  // A card with no grid overlap must take a matching fallback template rather than
  // the grid's only unused one, or the later card that truly matches the grid
  // template is left with a worse pick.
  it('prefers a content-matched fallback over an arbitrary unused grid template', () => {
    const cards = [
      { title: 'Anime portraits', text: 'anime character art' },
      { title: 'Video upscaling', text: 'upscale video footage' },
    ];
    const grid = [tpl('upscaler', ['upscaling', 'video'])];
    const fallback = [tpl('anime-gen', ['anime', 'character'])];

    const [first, second] = assignCardTemplates(cards, grid, { fallback });

    expect(first?.name).toBe('anime-gen');
    expect(second?.name).toBe('upscaler');
  });

  it('never repeats a template while unused ones remain', () => {
    const cards = [
      { title: 'A', text: 'alpha' },
      { title: 'B', text: 'beta' },
    ];
    const grid = [tpl('one', ['x']), tpl('two', ['y'])];
    const picks = assignCardTemplates(cards, grid).map((t) => t?.name);
    expect(new Set(picks).size).toBe(2);
  });
});

describe('resolveRailImages', () => {
  const pool = [
    { name: 'a', thumbnails: ['a1.webp', 'a2.webp'] },
    { name: 'hero', thumbnails: ['hero.webp'] },
    { name: 'b', thumbnails: ['b1.mp4', 'b2.webp'] },
  ];

  it('keeps a card own thumbnail and draws fallbacks for the rest, without repeats', () => {
    const cards = [
      { title: 'Owned', ownThumbnail: 'own.webp' },
      { title: 'Fallback 1' },
      { title: 'Fallback 2' },
    ];
    const out = resolveRailImages(cards, pool, { excludeName: 'hero' });

    expect(out[0].image).toEqual({ src: expect.stringContaining('own.webp'), alt: 'Owned' });
    // hero excluded, videos skipped, no repeat of the owned thumbnail
    const srcs = out.map((c) => c.image?.src);
    expect(srcs.some((s) => s?.includes('hero.webp'))).toBe(false);
    expect(srcs.some((s) => s?.includes('b1.mp4'))).toBe(false);
    expect(new Set(srcs).size).toBe(srcs.length);
  });

  it('yields a null image when the pool runs dry', () => {
    const out = resolveRailImages([{ title: 'X' }, { title: 'Y' }], [
      { name: 'only', thumbnails: ['one.webp'] },
    ]);
    expect(out[0].image).not.toBeNull();
    expect(out[1].image).toBeNull();
  });
});
