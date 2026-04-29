import { describe, expect, it } from 'vitest';
import { workflowDetailPath, workflowDetailSlug } from '../../src/lib/routes';

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

  it('returns null when name is missing — prevents /workflows/undefined/ links', () => {
    expect(workflowDetailPath(undefined)).toBeNull();
    expect(workflowDetailPath(null)).toBeNull();
    expect(workflowDetailPath('')).toBeNull();
    expect(workflowDetailPath(undefined, 'abc123')).toBeNull();
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

  it('returns null when name is missing — keeps malformed entries out of search index', () => {
    expect(workflowDetailSlug(undefined)).toBeNull();
    expect(workflowDetailSlug(null)).toBeNull();
    expect(workflowDetailSlug('')).toBeNull();
    expect(workflowDetailSlug(undefined, 'abc123')).toBeNull();
    expect(workflowDetailSlug('', 'abc123')).toBeNull();
  });
});
