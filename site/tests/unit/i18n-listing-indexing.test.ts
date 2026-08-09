import { describe, expect, it } from 'vitest';
import { listingIndexing } from '../../src/lib/i18n/listing-indexing';
import { INDEXABLE_LOCALES } from '../../src/lib/i18n/locales';
import type { Locale } from '../../src/lib/i18n/schema';

const BASE = '/workflows/category/image/';

describe('listingIndexing — gated locale (the shipped state)', () => {
  // Every localized listing is gated today because INDEXABLE_LOCALES is empty.
  // These assert the four surfaces agree while gated, which is what was wrong:
  // the pages self-canonicalled and advertised ten alternates with no noindex,
  // while every workflow page beneath them was correctly noindexed.
  it('does not mark a listing indexable while its locale is unreviewed', () => {
    expect(listingIndexing(BASE, 'zh' as Locale, []).indexable).toBe(false);
  });

  it('canonicals to the English route rather than to itself', () => {
    expect(listingIndexing(BASE, 'zh' as Locale, []).canonicalPath).toBe(BASE);
  });

  it('emits noindex', () => {
    expect(listingIndexing(BASE, 'zh' as Locale, []).noindex).toBe(true);
  });

  it('advertises no alternates, so only x-default is emitted', () => {
    // A cluster pointing at noindexed alternates is discarded by Google, so
    // advertising the gated locales is worse than advertising nothing.
    expect(listingIndexing(BASE, 'zh' as Locale, []).hreflangLocales).toEqual([]);
  });
});

describe('listingIndexing — flipped locale', () => {
  const flipped = ['zh'] as readonly Locale[];

  it('self-canonicals once the locale is added to INDEXABLE_LOCALES', () => {
    const result = listingIndexing(BASE, 'zh' as Locale, flipped);
    expect(result.indexable).toBe(true);
    expect(result.canonicalPath).toBe('/zh/workflows/category/image/');
    expect(result.noindex).toBe(false);
  });

  it('advertises English plus the flipped locales, and nothing else', () => {
    const result = listingIndexing(BASE, 'zh' as Locale, flipped);
    expect(result.hreflangLocales).toEqual(['en', 'zh']);
  });

  it('still gates a locale that has NOT been flipped, in the same run', () => {
    // The per-locale rollout: flipping zh must not quietly open ja.
    const result = listingIndexing(BASE, 'ja' as Locale, flipped);
    expect(result.indexable).toBe(false);
    expect(result.canonicalPath).toBe(BASE);
    expect(result.hreflangLocales).toEqual([]);
  });
});

describe('listingIndexing — invariants', () => {
  it('never treats the default locale as a gated localized route', () => {
    // English is the canonical target, never a page that canonicals elsewhere.
    const result = listingIndexing(BASE, 'en' as Locale, ['en'] as readonly Locale[]);
    expect(result.indexable).toBe(false);
    expect(result.canonicalPath).toBe(BASE);
  });

  it('keeps noindex the exact inverse of indexable', () => {
    for (const locales of [[], ['zh']] as readonly Locale[][]) {
      for (const locale of ['zh', 'ja', 'en'] as Locale[]) {
        const r = listingIndexing(BASE, locale, locales);
        expect(r.noindex).toBe(!r.indexable);
      }
    }
  });

  it('only ever self-canonicals a page it also allows to be indexed', () => {
    // The contradiction this module exists to prevent: a noindexed page that
    // still names itself as the canonical version of the route.
    for (const locales of [[], ['zh'], ['zh', 'ja']] as readonly Locale[][]) {
      for (const locale of ['zh', 'ja', 'ko', 'en'] as Locale[]) {
        const r = listingIndexing(BASE, locale, locales);
        if (r.canonicalPath !== BASE) expect(r.indexable).toBe(true);
      }
    }
  });

  it('defaults to the real INDEXABLE_LOCALES when none is passed', () => {
    // Pins the production default so a flip in locales.ts flows through here.
    const expected = INDEXABLE_LOCALES.includes('zh' as Locale);
    expect(listingIndexing(BASE, 'zh' as Locale).indexable).toBe(expected);
  });
});
