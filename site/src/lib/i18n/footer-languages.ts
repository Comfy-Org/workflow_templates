/**
 * The footer language switcher's links.
 *
 * Separate from the component so the one rule that matters is testable: the
 * switcher must never offer a language whose page does not exist. Routes with no
 * localized variant (the use-case pages, the model and use-case index pages) say
 * so with `localized: false`, the same declaration they already make to
 * HreflangTags, and get no switcher at all rather than a link to a 404.
 */
import { LANGUAGES, DEFAULT_LOCALE, type Locale } from '../../i18n/config';
import { getLocaleFromPath, localizeUrl } from '../../i18n/utils';
import { INDEXABLE_LOCALES } from './locales';

export interface FooterLanguageLink {
  locale: Locale;
  nativeName: string;
  url: string;
  isCurrent: boolean;
}

/** The current path with any locale prefix removed, always leading-slashed. */
export function unprefixedPath(pathname: string, currentLocale: Locale): string {
  const stripped =
    currentLocale === DEFAULT_LOCALE
      ? pathname
      : pathname.replace(new RegExp(`^/${currentLocale}`), '') || '/';
  return stripped.startsWith('/') ? stripped : `/${stripped}`;
}

/**
 * Links for the switcher, or an empty list when there is nothing honest to
 * offer: either no language has been rolled out yet, or this route is
 * English-only.
 */
export function footerLanguageLinks(
  pathname: string,
  options: { localized?: boolean; indexableLocales?: readonly Locale[] } = {}
): FooterLanguageLink[] {
  const { localized = true, indexableLocales = INDEXABLE_LOCALES } = options;
  if (!localized) return [];

  const currentLocale = getLocaleFromPath(pathname);
  const basePath = unprefixedPath(pathname, currentLocale);
  const offeredLocales: Locale[] = [
    DEFAULT_LOCALE,
    ...indexableLocales.filter((locale) => locale !== DEFAULT_LOCALE),
  ];
  if (offeredLocales.length < 2) return [];

  return offeredLocales.map((locale) => ({
    locale,
    nativeName: LANGUAGES[locale].nativeName,
    url: localizeUrl(basePath, locale),
    isCurrent: locale === currentLocale,
  }));
}
