/**
 * Sitemap filter for ComfyUI workflow site.
 *
 * Excludes pages that must not appear in sitemaps:
 * 1. OpenGraph image routes (/workflows/og/, /workflows/og.png).
 * 2. Pages under non-indexable locale prefixes.
 * 3. Non-qualifying model pages (model family not indexable).
 * 4. Empty hub category pages.
 * 5. Non-indexable / thin use-case pages.
 * 6. Legacy workflow redirects (missing 12-hex share_id suffix).
 * 7. Localized workflow detail pages where:
 *    - The locale is not in INDEXABLE_LOCALES, OR
 *    - The specific workflow's translation is held/non-indexable according to resolveLocalizedWorkflow().
 * 8. Any prerendered page whose built HTML carries meta refresh, meta robots "noindex" / "none",
 *    or canonicalUrl !== selfUrl.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveLocalizedWorkflow } from './i18n/resolver';
import { LOCALES, type Locale } from '../i18n/config';
import { parseCanonical, parseMetaRefresh, parseNoindex } from './html-directives';

export interface SitemapFilterOptions {
  /** Families whose model pages render indexable (both English and localized). */
  indexableModelSlugs?: ReadonlySet<string> | Set<string>;
  /** Tag slugs or category types from hub manifests. */
  hubCategories?: readonly string[] | string[];
  /** Slugs of use cases that have a qualifying grid and pass content checks. */
  indexableUseCaseSlugs?: ReadonlySet<string> | Set<string>;
  /** Locales currently flipped to indexable (e.g. from INDEXABLE_LOCALES). */
  indexableLocales?: ReadonlySet<string> | Set<string>;
  /** Creator usernames for creator profile pages (/workflows/{username}/). */
  creatorUsernames?: ReadonlySet<string> | Set<string> | readonly string[] | string[];
  /** Optional directory of built output to check prerendered HTML directly. */
  distDir?: string | null;
  /** Custom indexability resolver for testing. Defaults to resolveLocalizedWorkflow. */
  resolveWorkflowIndexable?: (shareId: string, locale: Locale) => boolean;
}

/**
 * Locate built dist directory if available.
 * Resolves relative to this file's package root first so it functions identically
 * whether invoked from site/ or the repo root.
 */
function getDistDir(explicit?: string | null): string | null {
  if (explicit !== undefined) return explicit;
  const siteDir = path.resolve(fileURLToPath(import.meta.url), '../../..');
  const candidates = [
    path.join(siteDir, 'dist/client'),
    path.join(siteDir, 'dist'),
    path.join(process.cwd(), 'dist/client'),
    path.join(process.cwd(), 'dist'),
  ];
  return candidates.find((d) => fs.existsSync(d)) ?? null;
}

// Cache HTML inspection results by file path so repeated checks don't hit the disk.
const htmlDirectiveCache = new Map<string, boolean>();

/** Clear the HTML directive cache (used in tests). */
export function __resetHtmlDirectiveCache(): void {
  htmlDirectiveCache.clear();
}

/**
 * Check whether a prerendered HTML file on disk specifies "noindex", "none",
 * meta-refresh redirect, or non-self canonical.
 * Returns false if the page declares noindex or canonicalizes to another URL.
 */
export function checkRenderedHtmlDirectives(distDir: string, pageUrl: string): boolean {
  try {
    const url = new URL(pageUrl, 'https://comfy.org');
    let cleanPath = url.pathname.replace(/^\/+/, '');
    if (cleanPath.endsWith('/')) {
      cleanPath = cleanPath.slice(0, -1);
    }
    const htmlPath =
      cleanPath === ''
        ? path.join(distDir, 'index.html')
        : path.join(distDir, cleanPath, 'index.html');

    if (htmlDirectiveCache.has(htmlPath)) {
      return htmlDirectiveCache.get(htmlPath)!;
    }

    let targetFile = htmlPath;
    if (!fs.existsSync(targetFile)) {
      try {
        const decoded = decodeURI(cleanPath);
        const decodedFile =
          decoded === ''
            ? path.join(distDir, 'index.html')
            : path.join(distDir, decoded, 'index.html');
        if (fs.existsSync(decodedFile)) {
          targetFile = decodedFile;
        } else {
          // Handle format: 'file' (e.g. slug.html instead of slug/index.html)
          const altFile = path.join(distDir, `${cleanPath}.html`);
          if (fs.existsSync(altFile)) {
            targetFile = altFile;
          } else {
            // If the HTML file does not exist on disk (e.g. on-demand route), do not reject based on HTML.
            return true;
          }
        }
      } catch {
        return true;
      }
    }

    const html = fs.readFileSync(targetFile, 'utf-8');

    // 1. Meta refresh redirect check: pages that redirect via http-equiv are not indexable content
    if (parseMetaRefresh(html)) {
      htmlDirectiveCache.set(htmlPath, false);
      return false;
    }

    // 2. Meta robots / googlebot noindex / none check (compares comma-separated tokens exactly)
    if (parseNoindex(html)) {
      htmlDirectiveCache.set(htmlPath, false);
      return false;
    }

    // 3. Canonical URL check (handles both absolute and root-relative hrefs)
    const canonicalHref = parseCanonical(html);
    if (canonicalHref) {
      try {
        const canonicalUrl = new URL(canonicalHref, url.origin);
        const normCanonicalPath = canonicalUrl.pathname.endsWith('/')
          ? canonicalUrl.pathname
          : `${canonicalUrl.pathname}/`;
        const normSelfPath = url.pathname.endsWith('/') ? url.pathname : `${url.pathname}/`;

        const isLocalhost = url.hostname === 'localhost' || url.hostname === '127.0.0.1';

        // Canonical must match self path, query search, and hostname (unless testing on localhost)
        if (
          normCanonicalPath !== normSelfPath ||
          canonicalUrl.search !== url.search ||
          (!isLocalhost && canonicalUrl.hostname.toLowerCase() !== url.hostname.toLowerCase())
        ) {
          htmlDirectiveCache.set(htmlPath, false);
          return false;
        }
      } catch {
        htmlDirectiveCache.set(htmlPath, false);
        return false;
      }
    }

    htmlDirectiveCache.set(htmlPath, true);
    return true;
  } catch {
    return true;
  }
}

/**
 * Pure predicate to determine if a URL should be included in the sitemap.
 */
export function isSitemapUrlAllowed(page: string, options: SitemapFilterOptions = {}): boolean {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(page, 'https://comfy.org');
  } catch {
    return false;
  }

  const rawPath = parsedUrl.pathname;

  // 1. Exclude OG image routes (e.g. /workflows/og/, /workflows/og.png)
  if (rawPath.includes('/workflows/og/') || rawPath.endsWith('/workflows/og.png')) {
    return false;
  }

  // Normalize path with trailing slash for directory route matching
  const normPath = rawPath.endsWith('/') ? rawPath : `${rawPath}/`;

  // 2. Filter out non-indexable locale prefixes globally
  const localePrefixMatch = normPath.match(/^\/([a-z]{2}(?:-[a-zA-Z]{2})?)\//);
  if (localePrefixMatch && localePrefixMatch[1].toLowerCase() !== 'en') {
    const rawLocale = localePrefixMatch[1];
    const canonicalLocale =
      (LOCALES.find((l) => l.toLowerCase() === rawLocale.toLowerCase()) as Locale) ??
      (rawLocale as Locale);

    if (options.indexableLocales && !options.indexableLocales.has(canonicalLocale)) {
      return false;
    }
  }

  // 3. Model pages: /workflows/model/{slug}/ or /{locale}/workflows/model/{slug}/
  const modelMatch = normPath.match(/\/workflows\/model\/([^/]+)\/$/);
  if (modelMatch && options.indexableModelSlugs) {
    if (!options.indexableModelSlugs.has(modelMatch[1])) {
      return false;
    }
  }

  // 4. Category pages: /workflows/category/{type}/ or /{locale}/workflows/category/{type}/
  const categoryMatch = normPath.match(/\/workflows\/category\/([^/]+)\/$/);
  if (categoryMatch && options.hubCategories && options.hubCategories.length > 0) {
    if (!options.hubCategories.includes(categoryMatch[1])) {
      return false;
    }
  }

  // 5. Use-case pages: /workflows/use-cases/{slug}/ or /{locale}/workflows/use-cases/{slug}/
  const useCaseMatch = normPath.match(/\/workflows\/use-cases\/([^/]+)\/$/);
  if (useCaseMatch && options.indexableUseCaseSlugs) {
    if (!options.indexableUseCaseSlugs.has(useCaseMatch[1])) {
      return false;
    }
  }

  // 6. Workflows detail, creator profiles, and subsection routes
  const match = normPath.match(/\/workflows\/([^/]+)\/$/);
  if (match) {
    const segment = match[1];
    const isSpecialSection = ['category', 'tag', 'model', 'creators', 'use-cases'].some((p) =>
      normPath.includes(`/workflows/${p}/`)
    );

    let isCreatorPage = false;
    if (options.creatorUsernames) {
      for (const username of options.creatorUsernames) {
        if (username.toLowerCase() === segment.toLowerCase()) {
          isCreatorPage = true;
          break;
        }
      }
    }

    if (!isSpecialSection && !isCreatorPage) {
      // Workflow detail page: must have 12-char hex share_id suffix
      const lastHyphen = segment.lastIndexOf('-');
      if (lastHyphen === -1) return false;
      const candidate = segment.slice(lastHyphen + 1);
      if (candidate.length !== 12 || !/^[0-9a-fA-F]+$/.test(candidate)) {
        return false;
      }

      // Localized workflow detail page
      const localeMatch = normPath.match(/^\/([a-z]{2}(?:-[a-zA-Z]{2})?)\/workflows\//);
      if (localeMatch && localeMatch[1].toLowerCase() !== 'en') {
        const rawLocale = localeMatch[1];
        const locale =
          (LOCALES.find((l) => l.toLowerCase() === rawLocale.toLowerCase()) as Locale) ??
          (rawLocale as Locale);

        if (options.indexableLocales && !options.indexableLocales.has(locale)) {
          return false;
        }

        const checkIndexable =
          options.resolveWorkflowIndexable ??
          ((shareId: string, loc: Locale) =>
            resolveLocalizedWorkflow(shareId, loc, {
              indexableLocales: options.indexableLocales
                ? (Array.from(options.indexableLocales) as Locale[])
                : undefined,
            }).indexable);

        if (!checkIndexable(candidate.toLowerCase(), locale)) {
          return false;
        }
      }
    }
  }

  // 7. Pre-write HTML inspection guard for prerendered pages
  const distDir = getDistDir(options.distDir);
  if (distDir) {
    if (!checkRenderedHtmlDirectives(distDir, page)) {
      return false;
    }
  }

  return true;
}

/**
 * Creates the filter function for `@astrojs/sitemap`.
 */
export function createSitemapFilter(options: SitemapFilterOptions = {}): (page: string) => boolean {
  let filterOptions: SitemapFilterOptions | undefined;
  return (page: string) => {
    filterOptions ??= { ...options, distDir: getDistDir(options.distDir) };
    return isSitemapUrlAllowed(page, filterOptions);
  };
}
