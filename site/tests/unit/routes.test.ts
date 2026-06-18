import { describe, expect, it } from 'vitest';
import { workflowDetailPath, workflowDetailSlug, tagPath, creatorPath } from '../../src/lib/routes';

describe('workflowDetailPath', () => {
  it('builds a {name}-{shareId} URL when both are present', () => {
    expect(workflowDetailPath('flux-schnell', 'e90e933d6c5d')).toBe(
      '/workflows/flux-schnell-e90e933d6c5d/'
    );
  });

  it('falls back to {name} when shareId is missing', () => {
    expect(workflowDetailPath('legacy-name')).toBe('/workflows/legacy-name/');
    expect(workflowDetailPath('legacy-name', '')).toBe('/workflows/legacy-name/');
  });

  it('prefixes non-default locales', () => {
    expect(workflowDetailPath('flux-schnell', 'e90e933d6c5d', 'ja')).toBe(
      '/ja/workflows/flux-schnell-e90e933d6c5d/'
    );
  });

  it('does not prefix the default locale', () => {
    expect(workflowDetailPath('flux-schnell', 'abc', 'en')).toBe('/workflows/flux-schnell-abc/');
  });

  it('falls back to shareId when name is missing — workflow stays findable', () => {
    expect(workflowDetailPath(undefined, 'abc123')).toBe('/workflows/abc123-abc123/');
    expect(workflowDetailPath(null, 'abc123')).toBe('/workflows/abc123-abc123/');
    expect(workflowDetailPath('', 'abc123')).toBe('/workflows/abc123-abc123/');
  });

  it('returns null only when both name and shareId are missing', () => {
    expect(workflowDetailPath(undefined)).toBeNull();
    expect(workflowDetailPath(null, null)).toBeNull();
    expect(workflowDetailPath('', '')).toBeNull();
  });
});

describe('workflowDetailSlug', () => {
  it('joins name and shareId with a hyphen', () => {
    expect(workflowDetailSlug('flux-schnell', 'e90e933d6c5d')).toBe('flux-schnell-e90e933d6c5d');
  });

  it('returns the bare name when shareId is missing', () => {
    expect(workflowDetailSlug('legacy-name')).toBe('legacy-name');
    expect(workflowDetailSlug('legacy-name', null)).toBe('legacy-name');
    expect(workflowDetailSlug('legacy-name', '')).toBe('legacy-name');
  });

  it('falls back to shareId when name is missing — never hides findable workflows', () => {
    expect(workflowDetailSlug(undefined, 'abc123')).toBe('abc123-abc123');
    expect(workflowDetailSlug(null, 'abc123')).toBe('abc123-abc123');
    expect(workflowDetailSlug('', 'abc123')).toBe('abc123-abc123');
  });

  it('returns null only when both name and shareId are missing', () => {
    expect(workflowDetailSlug(undefined)).toBeNull();
    expect(workflowDetailSlug(null, null)).toBeNull();
    expect(workflowDetailSlug('', '')).toBeNull();
  });
});

describe('tagPath', () => {
  it('builds a slugified tag URL', () => {
    expect(tagPath('upscaling')).toBe('/workflows/tag/upscaling/');
  });

  it('prefixes non-default locales but not the default', () => {
    expect(tagPath('upscaling', 'ja')).toBe('/ja/workflows/tag/upscaling/');
    expect(tagPath('upscaling', 'en')).toBe('/workflows/tag/upscaling/');
    expect(tagPath('upscaling', undefined)).toBe('/workflows/tag/upscaling/');
  });
});

describe('creatorPath', () => {
  it('slugifies the username', () => {
    expect(creatorPath('Comfy Org')).toBe('/workflows/comfy-org/');
  });

  it('prefixes non-default locales but not the default', () => {
    expect(creatorPath('topaz', 'ar')).toBe('/ar/workflows/topaz/');
    expect(creatorPath('topaz', 'en')).toBe('/workflows/topaz/');
  });
});
