/**
 * The sitemap URLs the build cannot discover for itself.
 *
 * `@astrojs/sitemap` collects the pages a build emits as files. Every route under
 * `src/pages/[locale]/` is on-demand rendered, and so is the English model route
 * now that it has to issue a real 301 for variant slugs, so none of them appear in
 * that collection. They are supplied through the integration's `customPages`
 * option instead, which is what this module builds.
 *
 * It lives outside `astro.config.mjs` so the rule can be tested against real
 * inputs. The construction is pure; the one filesystem read (the tag manifest) is
 * a separate function.
 */
import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_LOCALE } from '../i18n/config';

/** The media types `workflows/category/[type]` serves. Mirrors `MediaType`. */
const CATEGORY_TYPES: readonly string[] = ['image', 'video', 'audio', '3d'];

const CATEGORY_MANIFEST_PATH = path.join(
  process.cwd(),
  'src/data/hub-categories.generated.json'
);

/**
 * Written by `pnpm build:tag-manifest` during prebuild; gitignored, like the
 * synced template catalog it sits beside.
 */
const TAG_MANIFEST_PATH = path.join(process.cwd(), 'src/data/hub-tag-slugs.generated.json');

/**
 * Tag slugs the hub index actually carries, or none.
 *
 * Deliberately no fallback to the synced templates in `src/content/templates`.
 * Those are the repo's own workflows; the tag routes list the hub's, which is a
 * larger catalog with a different tag vocabulary. Deriving the list from the files
 * omitted 25 tags the hub has and invented 4 it does not — and the localized tag
 * route 404s a tag with no matching workflows, so those 4 would have been sitemap
 * entries pointing at 404s, per locale. Advertising nothing is recoverable;
 * advertising a 404 is the exact contradiction this ticket exists to remove.
 */
export function loadHubTagSlugs(manifestPath: string = TAG_MANIFEST_PATH): string[] {
  if (!fs.existsSync(manifestPath)) return [];
  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((slug): slug is string => typeof slug === 'string' && slug.length > 0);
  } catch {
    return [];
  }
}

/**
 * The categories the hub index actually fills, or none.
 *
 * Same contract as `loadHubTagSlugs`, and same reason: the category route 404s a
 * type with no matching workflows, so advertising all four unconditionally puts a
 * 404 in the sitemap the moment one empties. Nothing is guessed from the synced
 * templates; an absent manifest means no localized category URLs this build.
 */
export function loadHubCategories(manifestPath: string = CATEGORY_MANIFEST_PATH): string[] {
  if (!fs.existsSync(manifestPath)) return [];
  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (type): type is string => typeof type === 'string' && CATEGORY_TYPES.includes(type)
    );
  } catch {
    return [];
  }
}

export interface CustomPagesInput {
  /** Absolute origin, no trailing slash (e.g. `https://comfy.org`). */
  siteOrigin: string;
  /** Hub profiles with a `/workflows/<username>/` page. */
  creatorUsernames: Iterable<string>;
  /** Locales flipped indexable — `INDEXABLE_LOCALES`, never the full locale set. */
  indexableLocales: Iterable<string>;
  /** Model families whose page renders indexable; both English and localized. */
  indexableModelSlugs: Iterable<string>;
  /** Tag slugs from `loadHubTagSlugs()`. */
  tagSlugs: Iterable<string>;
  /** Non-empty category types from `loadHubCategories()`. */
  categoryTypes: Iterable<string>;
}

/**
 * Build the `customPages` list.
 *
 * Localized directory pages are gated on the same flag the routes read. Before
 * this the hand-written list disagreed with the routes in both directions at
 * once: every locale's listing root was advertised, including the ones that
 * render `noindex` and canonical to English, while no launched locale's
 * category/tag/model pages were advertised even though they self-canonical and
 * invite indexing. `listing-indexing.ts` exists to keep canonical, robots,
 * hreflang and the sitemap saying one thing, and this is the fourth surface
 * reading the same flag as the other three.
 *
 * The localized set mirrors the English one, because the localized routes render
 * the same catalog through `localizeCards`, which maps entries and never drops
 * them.
 */
export function buildCustomPages({
  siteOrigin,
  creatorUsernames,
  indexableLocales,
  indexableModelSlugs,
  tagSlugs,
  categoryTypes,
}: CustomPagesInput): string[] {
  const origin = siteOrigin.replace(/\/$/, '');
  const modelSlugs = [...indexableModelSlugs];

  const creatorPages = [...creatorUsernames].map((username) => `${origin}/workflows/${username}/`);

  // English model pages, listed by hand for the same reason the localized ones
  // are: that route is on-demand rendered, so the sitemap integration never sees
  // it among the built pages. Without this the indexable model URLs would have
  // vanished from the sitemap the moment the route stopped prerendering.
  const modelPages = modelSlugs.map((slug) => `${origin}/workflows/model/${slug}/`);

  const localePages = [...indexableLocales]
    .filter((locale) => locale !== DEFAULT_LOCALE)
    .flatMap((locale) => {
      const base = `${origin}/${locale}/workflows`;
      return [
        `${base}/`,
        ...[...categoryTypes].map((type) => `${base}/category/${type}/`),
        ...[...tagSlugs].map((slug) => `${base}/tag/${slug}/`),
        // Model pages carry a second gate (content quality), already resolved
        // into `indexableModelSlugs`; a locale must not advertise what English
        // withholds.
        ...modelSlugs.map((slug) => `${base}/model/${slug}/`),
      ];
    });

  return [...creatorPages, ...modelPages, ...localePages];
}
