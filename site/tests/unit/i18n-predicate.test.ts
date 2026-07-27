import { describe, expect, it } from 'vitest';
import { isLocalePageIndexable } from '../../src/lib/i18n/predicate';
import { TRANSLATABLE_FIELDS, type IndexabilityInput } from '../../src/lib/i18n/schema';

const HASH = 'abc123';

function baseInput(overrides: Partial<IndexabilityInput> = {}): IndexabilityInput {
  const provenance = Object.fromEntries(
    TRANSLATABLE_FIELDS.map((f) => [f, 'localized'])
  ) as IndexabilityInput['provenance'];
  const englishHas = Object.fromEntries(
    TRANSLATABLE_FIELDS.map((f) => [f, true])
  ) as IndexabilityInput['englishHas'];
  return {
    locale: 'zh',
    provenance,
    englishHas,
    currentContentHash: HASH,
    review: {
      reviewer: 'tiger',
      reviewedAt: '2026-07-24',
      reviewedContentHash: HASH,
      reviewedArtifactChecksum: 'x',
    },
    supportedLocales: ['zh', 'ja', 'ko'],
    indexableLocales: ['zh'],
    ...overrides,
  };
}

describe('isLocalePageIndexable', () => {
  it('is indexable when translated, current, reviewed, supported, and flipped', () => {
    expect(isLocalePageIndexable(baseInput())).toEqual({ indexable: true, reason: '' });
  });

  it('is not indexable when the locale is not flipped on', () => {
    const r = isLocalePageIndexable(baseInput({ indexableLocales: [] }));
    expect(r.indexable).toBe(false);
    expect(r.reason).toContain('not flipped');
  });

  it('is not indexable when the locale is not supported', () => {
    const r = isLocalePageIndexable(
      baseInput({ locale: 'fr', supportedLocales: ['zh'], indexableLocales: ['fr'] })
    );
    expect(r.indexable).toBe(false);
    expect(r.reason).toContain('not supported');
  });

  it('is not indexable when a required field fell back to English', () => {
    const input = baseInput();
    input.provenance.title = 'english';
    const r = isLocalePageIndexable(input);
    expect(r.indexable).toBe(false);
    expect(r.reason).toContain('title');
  });

  it('does NOT require a field English itself lacks', () => {
    const input = baseInput();
    // English has no extendedDescription, and neither is it translated — fine.
    input.englishHas.extendedDescription = false;
    input.provenance.extendedDescription = 'english';
    expect(isLocalePageIndexable(input).indexable).toBe(true);
  });

  it('ignores non-required fields even when English-fallback', () => {
    const input = baseInput();
    // howToUse / suggestedUseCases are not in REQUIRED_FOR_INDEX.
    input.provenance.howToUse = 'english';
    input.provenance.suggestedUseCases = 'english';
    expect(isLocalePageIndexable(input).indexable).toBe(true);
  });

  it('is not indexable without a review sign-off', () => {
    const r = isLocalePageIndexable(baseInput({ review: null }));
    expect(r.indexable).toBe(false);
    expect(r.reason).toContain('no review');
  });

  it('drops out when the English source changed after sign-off (stale)', () => {
    const r = isLocalePageIndexable(baseInput({ currentContentHash: 'def456' }));
    expect(r.indexable).toBe(false);
    expect(r.reason).toContain('stale');
  });
});
