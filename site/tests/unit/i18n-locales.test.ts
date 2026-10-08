import { describe, expect, it } from 'vitest';
import {
  AVAILABLE_APP_LOCALES,
  INDEXABLE_LOCALES,
  SUPPORTED_HUB_LOCALES,
  assertFlippedLocalesIndexable,
  assertLocaleSets,
} from '../../src/lib/i18n/locales';

describe('locale sets', () => {
  it('holds the documented narrowing: INDEXABLE ⊆ SUPPORTED ⊆ AVAILABLE', () => {
    expect(() => assertLocaleSets()).not.toThrow();
    const available = new Set<string>(AVAILABLE_APP_LOCALES);
    expect(SUPPORTED_HUB_LOCALES.every((l) => available.has(l))).toBe(true);
    const supported = new Set<string>(SUPPORTED_HUB_LOCALES);
    expect(INDEXABLE_LOCALES.every((l) => supported.has(l))).toBe(true);
  });
});

describe('assertFlippedLocalesIndexable', () => {
  it('passes when a flipped locale has indexable pages, however many are held', () => {
    // The realistic shape: most pages indexable, a tail still untranslated.
    expect(() => assertFlippedLocalesIndexable(new Map([['zh', 519]]), ['zh'])).not.toThrow();
    expect(() => assertFlippedLocalesIndexable(new Map([['zh', 1]]), ['zh'])).not.toThrow();
  });

  it('throws when a flipped locale resolved nothing indexable', () => {
    expect(() => assertFlippedLocalesIndexable(new Map([['zh', 0]]), ['zh'])).toThrow(
      /flipped locale\(s\) zh resolved zero indexable pages/
    );
  });

  it('treats a locale missing from the counts as zero, not as absent', () => {
    // A locale that never reached the resolver at all is the same failure: the
    // language is flipped on and nothing indexable came out of the build.
    expect(() => assertFlippedLocalesIndexable(new Map(), ['zh'])).toThrow(/zero indexable pages/);
  });

  it('names every empty locale, so one build reports the whole problem', () => {
    expect(() => assertFlippedLocalesIndexable(new Map([['zh', 10]]), ['zh', 'ja', 'ko'])).toThrow(
      /ja, ko/
    );
  });

  it('does nothing while no locale is flipped', () => {
    expect(() => assertFlippedLocalesIndexable(new Map(), [])).not.toThrow();
  });

  it('ignores an empty locale that is not flipped', () => {
    // The guard iterates the flipped set, not the counts. A locale nobody flipped
    // has no canonicals, sitemap entries or hreflang to be wrong about, so its
    // emptiness is normal — every locale looks like this before its review wave.
    expect(() =>
      assertFlippedLocalesIndexable(
        new Map([
          ['zh', 519],
          ['ja', 0],
        ]),
        ['zh']
      )
    ).not.toThrow();
  });
});
