/**
 * Grouping test: asserts `deriveModelGroups` folds model-name variants into one
 * family page with the right redirects (the Nano Banana consolidation bug guard).
 */
import { describe, expect, it } from 'vitest';
import {
  deriveModelGroups,
  modelFamilyLabel,
  type CatalogTemplate,
} from '../../src/lib/seo/model-groups';

/** Catalog with the multi-word and versioned model strings that exposed the bug. */
const catalog: CatalogTemplate[] = [
  { name: 'nb-pro-1', models: ['Nano Banana Pro'], tags: ['Image'], usage: 400 },
  { name: 'nb-pro-2', models: ['Nano Banana Pro'], tags: ['Image Edit'], usage: 300 },
  { name: 'nb-2', models: ['Nano Banana 2'], tags: ['Image'], usage: 200 },
  { name: 'nb-base', models: ['Nano Banana'], tags: ['Image'], usage: 100 },
  { name: 'gemini-img', models: ['Gemini3 Pro Image Preview'], tags: ['Image'], usage: 150 },
  { name: 'gemini-text', models: ['Gemini-3.1-Pro'], tags: ['API'], usage: 50 },
  { name: 'gpt-a', models: ['GPT Image 2'], tags: ['Image'], usage: 80 },
  { name: 'gpt-b', models: ['GPT-Image-1'], tags: ['Image'], usage: 70 },
  { name: 'wan-a', models: ['Wan2.2'], tags: ['Video'], usage: 90 },
  { name: 'qie-a', models: ['Qwen-Image-Edit'], tags: ['Image Edit'], usage: 60 },
  { name: 'qi-a', models: ['Qwen-Image'], tags: ['Image'], usage: 55 },
];

describe('modelFamilyLabel', () => {
  it('matches hyphen-form rules against space-separated raw strings', () => {
    expect(modelFamilyLabel('Nano Banana Pro')).toBe('Nano Banana Pro');
    expect(modelFamilyLabel('Nano Banana 2')).toBe('Nano Banana Pro');
    expect(modelFamilyLabel('Nano Banana')).toBe('Nano Banana Pro');
    expect(modelFamilyLabel('GPT Image 2')).toBe('GPT-Image');
  });

  it('folds Gemini image variants into Nano Banana Pro but not Gemini text models', () => {
    expect(modelFamilyLabel('Gemini3 Pro Image Preview')).toBe('Nano Banana Pro');
    expect(modelFamilyLabel('Gemini-3.1-Pro')).toBe('Gemini-3.1-Pro');
  });

  it('keeps the more specific Qwen-Image-Edit rule ahead of Qwen-Image', () => {
    expect(modelFamilyLabel('Qwen-Image-Edit')).toBe('Qwen-Image-Edit');
    expect(modelFamilyLabel('Qwen-Image')).toBe('Qwen-Image');
  });

  it('returns the raw label when no rule matches', () => {
    expect(modelFamilyLabel('Grok')).toBe('Grok');
    expect(modelFamilyLabel('Ideogram')).toBe('Ideogram');
  });
});

describe('deriveModelGroups — Nano Banana consolidation', () => {
  const groups = deriveModelGroups(catalog);
  const bySlug = new Map(groups.map((g) => [g.slug, g]));

  it('consolidates the three Nano Banana variants + Gemini image into one page', () => {
    const nb = bySlug.get('nano-banana-pro');
    expect(nb).toBeDefined();
    expect(nb!.templates.map((t) => t.name).sort()).toEqual([
      'gemini-img',
      'nb-2',
      'nb-base',
      'nb-pro-1',
      'nb-pro-2',
    ]);
    expect(nb!.usage).toBe(400 + 300 + 200 + 100 + 150);
  });

  it('emits 301 redirects from every variant slug to the canonical page', () => {
    const nb = bySlug.get('nano-banana-pro')!;
    expect(nb.redirectFrom).toEqual(
      expect.arrayContaining(['nano-banana', 'nano-banana-2', 'gemini3-pro-image-preview'])
    );
    expect(nb.redirectFrom).not.toContain('nano-banana-pro');
  });

  it('does not pull Gemini text models into the Nano Banana page', () => {
    const nb = bySlug.get('nano-banana-pro')!;
    expect(nb.templates.map((t) => t.name)).not.toContain('gemini-text');
  });

  it('consolidates GPT-Image variants into one group', () => {
    const gpt = bySlug.get('gpt-image');
    expect(gpt).toBeDefined();
    expect(gpt!.templates.map((t) => t.name).sort()).toEqual(['gpt-a', 'gpt-b']);
  });
});
