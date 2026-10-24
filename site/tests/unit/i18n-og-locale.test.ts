import { describe, expect, it } from 'vitest';
import { LANGUAGES, OG_LOCALES, DEFAULT_LOCALE, type Locale } from '../../src/i18n/config';
import { clusterLocales, getLocaleFromPath, unlocalizePath } from '../../src/i18n/utils';

describe('OG_LOCALES', () => {
  it('covers every routed locale', () => {
    expect(Object.keys(OG_LOCALES).sort()).toEqual(Object.keys(LANGUAGES).sort());
  });

  it('uses the language_TERRITORY form Open Graph expects, not our routing tag', () => {
    for (const [locale, ogLocale] of Object.entries(OG_LOCALES)) {
      expect(ogLocale, `${locale} must be language_TERRITORY`).toMatch(/^[a-z]{2}_[A-Z]{2}$/);
    }
    // The two forms genuinely differ, which is why the map exists.
    expect(OG_LOCALES.ko).toBe('ko_KR');
    expect(OG_LOCALES['zh-TW']).toBe('zh_TW');
    expect(OG_LOCALES['pt-BR']).toBe('pt_BR');
  });
});

describe('clusterLocales', () => {
  it('returns every locale when a page is localized and gives no explicit list', () => {
    expect(clusterLocales(true)).toEqual(Object.keys(LANGUAGES));
  });

  it('returns nothing for an English-only page', () => {
    expect(clusterLocales(false)).toEqual([]);
  });

  it('lets an explicit list win over the boolean, including an empty one', () => {
    expect(clusterLocales(true, ['ja', 'ko'])).toEqual(['ja', 'ko']);
    // A detail page gated non-indexable in every locale passes [] and must not
    // fall back to advertising all of them.
    expect(clusterLocales(true, [])).toEqual([]);
  });
});

describe('unlocalizePath', () => {
  /** The implementation SEOHead inlined before this was extracted. */
  function previousImplementation(pathname: string): string {
    let basePath: string;
    const segments = pathname.split('/').filter(Boolean);
    if (segments[0] && segments[0] in LANGUAGES && segments[0] !== DEFAULT_LOCALE) {
      basePath = '/' + segments.slice(1).join('/');
    } else {
      basePath = pathname;
    }
    return basePath.endsWith('/') ? basePath : `${basePath}/`;
  }

  const paths = [
    '/',
    '/workflows/',
    '/workflows',
    '/ko/',
    '/ko/workflows/',
    '/ko/workflows/some-slug-abc123/',
    '/pt-BR/workflows/model/wan2-5/',
    '/zh-TW/workflows/',
    '/en/workflows/',
    '/workflows/model/flux/',
    '/not-a-locale/workflows/',
  ];

  it.each(paths)('matches the previous inline implementation for %s', (pathname) => {
    expect(unlocalizePath(pathname)).toBe(previousImplementation(pathname));
  });

  it('always returns a trailing slash', () => {
    for (const pathname of paths) expect(unlocalizePath(pathname).endsWith('/')).toBe(true);
  });

  it('leaves a path whose first segment merely starts with a locale tag alone', () => {
    // "/korean-guide/" must not be read as the ko locale.
    expect(unlocalizePath('/korean-guide/')).toBe('/korean-guide/');
    expect(getLocaleFromPath('/korean-guide/')).toBe(DEFAULT_LOCALE);
  });
});

describe('og:locale alternates', () => {
  function alternatesFor(pathname: string, localized = true, locales?: readonly Locale[]) {
    const current = getLocaleFromPath(pathname);
    return clusterLocales(localized, locales)
      .filter((locale) => locale !== current)
      .map((locale) => OG_LOCALES[locale]);
  }

  it('never lists the page own locale as an alternate', () => {
    expect(alternatesFor('/ko/workflows/')).not.toContain('ko_KR');
    expect(alternatesFor('/workflows/')).not.toContain('en_US');
  });

  it('lists every other locale for a fully localized page', () => {
    expect(alternatesFor('/ko/workflows/')).toHaveLength(Object.keys(LANGUAGES).length - 1);
  });

  it('emits none for an English-only page', () => {
    expect(alternatesFor('/workflows/use-cases/upscaling/', false)).toEqual([]);
  });

  it('follows the per-page gate the hreflang tags follow', () => {
    expect(alternatesFor('/ja/workflows/x/', true, ['en', 'ja'])).toEqual(['en_US']);
  });
});
