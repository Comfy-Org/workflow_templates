import { describe, expect, it } from 'vitest';
import {
  isModelPageIndexable,
  isUseCasePageIndexable,
} from '../../src/lib/workflow-pages/seo-page';
import type { GeneratedSeoContent } from '../../src/lib/workflow-pages/schema';

// A page is "rich" (indexable-eligible) only when editorial content is present AND
// it passed the quality gate. The two ways to be NOT rich are: no content at all
// (null → a bare template grid) or content the generator flagged as low quality.
const passedContent: GeneratedSeoContent = {
  extendedDescription: 'x',
  howToUse: ['step'],
  metaDescription: 'meta',
  faqItems: [{ question: 'q', answer: 'a' }],
};
const qualityFailedContent: GeneratedSeoContent = { ...passedContent, qualityFailed: true };
const noContent = null; // thin page: bare grid, no editorial copy

describe('isModelPageIndexable', () => {
  const qualifying = { qualifies: true };
  const nonQualifying = { qualifies: false };

  it('indexes a qualifying family with present, quality-passing content and real templates', () => {
    expect(isModelPageIndexable(qualifying, 8, passedContent)).toBe(true);
  });

  it('does NOT index a qualifying family with no editorial content (bare grid)', () => {
    expect(isModelPageIndexable(qualifying, 8, noContent)).toBe(false);
  });

  it('does NOT index when the content failed the quality gate', () => {
    expect(isModelPageIndexable(qualifying, 8, qualityFailedContent)).toBe(false);
  });

  it('does NOT index a non-qualifying family even with good content', () => {
    expect(isModelPageIndexable(nonQualifying, 8, passedContent)).toBe(false);
  });

  it('does NOT index with an empty cluster', () => {
    expect(isModelPageIndexable(qualifying, 0, passedContent)).toBe(false);
  });
});

describe('isUseCasePageIndexable', () => {
  it('indexes when content is present, quality-passing, and templates exist (no qualifies gate)', () => {
    expect(isUseCasePageIndexable(3, passedContent)).toBe(true);
  });

  it('does NOT index a thin or quality-failed page', () => {
    expect(isUseCasePageIndexable(3, noContent)).toBe(false);
    expect(isUseCasePageIndexable(0, passedContent)).toBe(false);
    expect(isUseCasePageIndexable(3, qualityFailedContent)).toBe(false);
  });
});
