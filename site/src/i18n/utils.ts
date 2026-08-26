import { LANGUAGES, DEFAULT_LOCALE, type Locale } from './config';

// Get locale from URL path
export function getLocaleFromPath(pathname: string): Locale {
  const segments = pathname.split('/').filter(Boolean);
  const firstSegment = segments[0];
  if (firstSegment && firstSegment in LANGUAGES && firstSegment !== DEFAULT_LOCALE) {
    return firstSegment as Locale;
  }
  return DEFAULT_LOCALE;
}

// Build localized URL
export function localizeUrl(path: string, locale: Locale): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (locale === DEFAULT_LOCALE) {
    return cleanPath;
  }
  return `/${locale}${cleanPath}`;
}

// Get all localized versions of a URL for hreflang
export function getAlternateUrls(basePath: string): { locale: Locale; url: string }[] {
  return Object.keys(LANGUAGES).map((locale) => ({
    locale: locale as Locale,
    url: localizeUrl(basePath, locale as Locale),
  }));
}

// Get language info
export function getLanguageInfo(locale: Locale) {
  return LANGUAGES[locale];
}

// Check if locale uses RTL
export function isRTL(locale: Locale): boolean {
  return LANGUAGES[locale]?.dir === 'rtl';
}

/**
 * The locales a page declares as a cluster. Shared so the hreflang tags and the
 * og:locale tags cannot drift into contradicting each other: an explicit
 * per-page list wins, otherwise it is all locales or none by the boolean.
 */
export function clusterLocales(localized: boolean, locales?: readonly Locale[]): readonly Locale[] {
  return locales ?? (localized ? (Object.keys(LANGUAGES) as Locale[]) : []);
}

/**
 * The locale-independent form of a path, with a trailing slash: the base every
 * alternate URL is built from. SEOHead used to inline this, one copy of the
 * locale-prefix rule away from `getLocaleFromPath`.
 */
export function unlocalizePath(pathname: string): string {
  const locale = getLocaleFromPath(pathname);
  const stripped = locale === DEFAULT_LOCALE ? pathname : pathname.slice(locale.length + 1) || '/';
  return stripped.endsWith('/') ? stripped : `${stripped}/`;
}
