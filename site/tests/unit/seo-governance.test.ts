/**
 * Rules test: brand-safety denylist matching and the isIndexable noindex gate
 * in `governance.ts` (logic not exercised by the content tests).
 */
import { describe, expect, it } from 'vitest';
import { checkBrandSafety, assertBrandSafe, isIndexable } from '../../src/lib/seo/governance';

describe('checkBrandSafety', () => {
  it('catches denied terms regardless of case', () => {
    expect(checkBrandSafety('AI Face Swap online')).toContain('face swap');
    expect(checkBrandSafety('DeepFake generator')).toContain('deepfake');
  });

  it('passes clean use-case keywords', () => {
    expect(checkBrandSafety('ai headshot generator')).toEqual([]);
    expect(checkBrandSafety('ai caricature generator')).toEqual([]);
  });
});

describe('assertBrandSafe', () => {
  it('throws on a denied slug or keyword', () => {
    expect(() =>
      assertBrandSafe({ slug: 'ai-face-swap', primaryKeyword: 'ai face swap', title: 'Face Swap' })
    ).toThrow(/Brand-safety/);
  });

  it('does not throw for a safe entry', () => {
    expect(() =>
      assertBrandSafe({
        slug: 'ai-headshot-generator',
        primaryKeyword: 'ai headshot generator',
        title: 'AI Headshot Generator Workflows',
      })
    ).not.toThrow();
  });
});

describe('isIndexable', () => {
  it('is false with an empty cluster, whatever the content state', () => {
    expect(isIndexable({ clusterSize: 0, humanEdited: true, qualityPassed: true })).toBe(false);
  });

  it('is true when backed by templates and human-edited', () => {
    expect(isIndexable({ clusterSize: 5, humanEdited: true, qualityPassed: false })).toBe(true);
  });

  it('is true when backed by templates and the validator passed', () => {
    expect(isIndexable({ clusterSize: 5, humanEdited: false, qualityPassed: true })).toBe(true);
  });

  it('is false when generated content failed the contract', () => {
    expect(isIndexable({ clusterSize: 5, humanEdited: false, qualityPassed: false })).toBe(false);
  });
});
