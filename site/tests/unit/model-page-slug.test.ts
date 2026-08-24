import { describe, expect, it } from 'vitest';
import { modelPageSlug, deriveModelGroups } from '../../src/lib/workflow-pages/model-groups';

/**
 * Detail-page model chips link `modelPageSlug(model)`. Every family label the
 * resolver can produce is also a group slug `deriveModelGroups` emits for the
 * same catalog, so a chip can never point at a model URL with no page behind
 * it (the old `slugify(model)` links produced 404s like /workflows/model/wan2-2/).
 */
describe('modelPageSlug', () => {
  it('collapses versioned variants to the family slug', () => {
    expect(modelPageSlug('Wan2.2')).toBe('wan');
    expect(modelPageSlug('Wan2.1')).toBe('wan');
    expect(modelPageSlug('LTX-2.3')).toBe('ltx');
    expect(modelPageSlug('Flux.1 Dev')).toBe('flux');
    expect(modelPageSlug('Z-Image Turbo')).toBe('z-image');
    expect(modelPageSlug('Gemini3 Pro Image Preview')).toBe('nano-banana');
  });

  it('slugifies unmatched model names as their own family', () => {
    expect(modelPageSlug('Chatterbox TTS')).toBe('chatterbox-tts');
  });

  it('returns null for non-model placeholders', () => {
    expect(modelPageSlug('None')).toBeNull();
    expect(modelPageSlug('')).toBeNull();
    expect(modelPageSlug('  ')).toBeNull();
  });

  it('always resolves to a slug deriveModelGroups generates a page for', () => {
    const catalog = [
      { name: 'a', models: ['Wan2.2', 'Wan2.1'], tags: [], usage: 10 },
      { name: 'b', models: ['LTX-2.3'], tags: [], usage: 5 },
      { name: 'c', models: ['Chatterbox TTS'], tags: [], usage: 1 },
      { name: 'd', models: ['Gemini3 Pro Image Preview'], tags: [], usage: 2 },
    ];
    const pageSlugs = new Set(deriveModelGroups(catalog).map((group) => group.slug));
    for (const model of catalog.flatMap((tmpl) => tmpl.models)) {
      const slug = modelPageSlug(model);
      expect(slug, model).not.toBeNull();
      expect(pageSlugs.has(slug as string), `${model} -> ${slug}`).toBe(true);
    }
  });
});
