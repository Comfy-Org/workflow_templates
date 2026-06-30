import { describe, expect, it } from 'vitest';
import { assignCardImages } from '../../src/lib/seo/card-images';
import type { SerializedTemplate } from '../../src/lib/hub-api';

function tmpl(
  name: string,
  opts: Partial<SerializedTemplate> = {}
): SerializedTemplate {
  return {
    name,
    title: name,
    tags: [],
    models: [],
    usage: 100,
    thumbnails: [`${name}-1.webp`],
    ...opts,
  } as SerializedTemplate;
}

describe('assignCardImages', () => {
  it('matches a card to the template that shares its words', () => {
    const templates = [
      tmpl('relight', { tags: ['Relight'], usage: 10 }),
      tmpl('upscale', { tags: ['Upscale'], usage: 10 }),
    ];
    const [a, b] = assignCardImages(
      [{ title: 'Studio relighting' }, { title: 'Resolution upscaling' }],
      templates
    );
    expect(a?.src).toContain('relight-1.webp');
    expect(b?.src).toContain('upscale-1.webp');
  });

  it('never assigns the same template to two cards', () => {
    const templates = [tmpl('a'), tmpl('b'), tmpl('c')];
    const out = assignCardImages([{ text: 'x' }, { text: 'y' }, { text: 'z' }], templates);
    const srcs = out.map((c) => c?.src);
    expect(new Set(srcs).size).toBe(3);
  });

  it('falls back to highest-usage unused template when nothing matches', () => {
    const templates = [tmpl('low', { usage: 1 }), tmpl('high', { usage: 999 })];
    const [first] = assignCardImages([{ title: 'completely unrelated' }], templates);
    expect(first?.src).toContain('high-1.webp');
  });

  it('returns null once still-image templates run out', () => {
    const out = assignCardImages([{ text: 'a' }, { text: 'b' }], [tmpl('only')]);
    expect(out[0]).not.toBeNull();
    // Repeat is allowed only as a last resort once everything else is exhausted.
    expect(out[1]?.src).toContain('only-1.webp');
  });

  it('draws from the fallback pool before repeating', () => {
    const grid = [tmpl('grid', { tags: ['Portrait'] })];
    const fallback = [tmpl('extra', { tags: ['Upscale'] })];
    const out = assignCardImages([{ title: 'Portrait' }, { title: 'Upscale' }], grid, { fallback });
    expect(out[0]?.src).toContain('grid-1.webp');
    expect(out[1]?.src).toContain('extra-1.webp');
  });

  it('never repeats an image across calls sharing a used set', () => {
    const used = new Set<string>();
    const templates = [tmpl('a'), tmpl('b'), tmpl('c')];
    const first = assignCardImages([{ text: 'x' }], templates, { used });
    const second = assignCardImages([{ text: 'y' }], templates, { used });
    expect(first[0]?.src).not.toBe(second[0]?.src);
  });

  it('skips video/audio-only templates (no still frame)', () => {
    const templates = [tmpl('video', { thumbnails: ['video-1.mp4'] }), tmpl('still')];
    const [first] = assignCardImages([{ text: 'anything' }], templates);
    expect(first?.src).toContain('still-1.webp');
  });

  it('is deterministic across runs', () => {
    const templates = [tmpl('a', { usage: 5 }), tmpl('b', { usage: 5 }), tmpl('c', { usage: 5 })];
    const cards = [{ text: 'one' }, { text: 'two' }];
    expect(assignCardImages(cards, templates)).toEqual(assignCardImages(cards, templates));
  });
});
