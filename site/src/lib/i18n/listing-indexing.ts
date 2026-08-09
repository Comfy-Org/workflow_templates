/**
 * Indexing decisions for a localized *listing* page — the hub index, a category,
 * a tag, a model, the creators list. Anything whose content is an aggregate
 * rather than one workflow.
 *
 * `resolveLocalizedWorkflow` already answers this for workflow detail pages, from
 * that workflow's own freshness, completeness and review state. A listing has no
 * single workflow to judge: it renders whatever currently matches the filter, and
 * its own chrome comes from the UI-string bundle. So the gate is the locale
 * itself — the page may be indexed exactly when that locale has completed its
 * native-review wave and been added to `INDEXABLE_LOCALES`.
 *
 * Decided in one place because the same four surfaces have to agree, and the
 * detail pages show how easily they drift apart: canonical, robots, the hreflang
 * cluster, and (through the canonical) what the sitemap may advertise. A page
 * that noindexes itself while still self-canonicalling and advertising alternates
 * is a page telling search engines two different things.
 */
import { DEFAULT_LOCALE } from '../../i18n/config';
import { localizeUrl } from '../../i18n/utils';
import { INDEXABLE_LOCALES } from './locales';
import type { Locale } from './schema';

export interface ListingIndexing {
  /** Whether this localized listing may be indexed at all. */
  indexable: boolean;
  /**
   * Localized path when indexable; the English path otherwise. Pointing a gated
   * page at its English equivalent is the "safety by canonical" the detail pages
   * rely on: an un-reviewed translation can never become the indexed version of
   * the route, only English can.
   */
  canonicalPath: string;
  /** Convenience inverse of `indexable`, matching BaseLayout's prop. */
  noindex: boolean;
  /**
   * Locales to advertise as alternates. Empty until the locale is flipped on, so
   * only x-default is emitted. Google discards an hreflang cluster that points at
   * noindexed alternates, so advertising ten gated locales is worse than silence.
   */
  hreflangLocales: Locale[];
}

/**
 * @param basePath Route without the locale prefix, e.g. `/workflows/` or
 *                 `/workflows/category/image/`.
 */
export function listingIndexing(
  basePath: string,
  locale: Locale,
  indexableLocales: readonly Locale[] = INDEXABLE_LOCALES
): ListingIndexing {
  const indexable = locale !== DEFAULT_LOCALE && indexableLocales.includes(locale);

  return {
    indexable,
    canonicalPath: indexable ? localizeUrl(basePath, locale) : basePath,
    noindex: !indexable,
    // Advertise the English original alongside the flipped locales only — never a
    // locale that is still gated, and never a cluster while nothing is flipped.
    hreflangLocales: indexable
      ? [DEFAULT_LOCALE, ...indexableLocales.filter((l) => l !== DEFAULT_LOCALE)]
      : [],
  };
}
