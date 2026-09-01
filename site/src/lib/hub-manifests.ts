/**
 * Readers for the hub-derived manifests `pnpm build:hub-manifests` writes during
 * prebuild.
 *
 * `astro.config.mjs` needs three things the hub index owns — the tag slugs it
 * carries, the media types it declares, and the catalog the model routes resolve
 * requests from — and it can fetch none of them: the config is loaded by
 * `astro check`, `astro dev`, eslint and every unit-test run, none of which
 * should need the network to answer. So the fetch happens once during prebuild
 * and lands in gitignored files beside the synced template catalog, which is
 * generated the same way.
 *
 * Every reader degrades to "nothing" rather than to a guess. An absent manifest
 * means prebuild did not run, not that the hub is empty, and the callers are
 * written so that "nothing" costs a missing sitemap URL or a skipped guard —
 * both recoverable — where a guess would advertise a 404 or validate a catalog
 * the routes never serve.
 */
import fs from 'node:fs';
import path from 'node:path';

import type { CatalogTemplate } from './workflow-pages/model-groups';

const dataFile = (name: string) => path.join(process.cwd(), 'src/data', name);

/** The media types `workflows/category/[type]` serves. Mirrors `MediaType`. */
const CATEGORY_TYPES: readonly string[] = ['image', 'video', 'audio', '3d'];

export const TAG_MANIFEST_PATH = dataFile('hub-tag-slugs.generated.json');
export const CATEGORY_MANIFEST_PATH = dataFile('hub-categories.generated.json');
export const MODEL_CATALOG_PATH = dataFile('hub-model-catalog.generated.json');

/** Every manifest the builder writes, for callers that clear them as a set. */
export const HUB_MANIFEST_PATHS = [
  TAG_MANIFEST_PATH,
  CATEGORY_MANIFEST_PATH,
  MODEL_CATALOG_PATH,
] as const;

function readJsonArray(manifestPath: string): unknown[] {
  if (!fs.existsSync(manifestPath)) return [];
  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

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
  return readJsonArray(manifestPath).filter(
    (slug): slug is string => typeof slug === 'string' && slug.length > 0
  );
}

/**
 * The categories the hub index actually fills, or none.
 *
 * Same contract as `loadHubTagSlugs`, and same reason: the category route 404s a
 * type with no matching workflows, so advertising all four unconditionally puts a
 * 404 in the sitemap the moment one empties. Nothing is guessed from the synced
 * templates; an absent manifest means no category URLs this build.
 */
export function loadHubCategories(manifestPath: string = CATEGORY_MANIFEST_PATH): string[] {
  return readJsonArray(manifestPath).filter(
    (type): type is string => typeof type === 'string' && CATEGORY_TYPES.includes(type)
  );
}

/**
 * The catalog the model routes resolve a request from, reduced to the fields
 * `deriveModelGroups` reads.
 *
 * Both model routes derive their families from `loadSerializedTemplates()`, i.e.
 * the live hub index. The build-time guards and the sitemap's model list have to
 * see that same catalog: deriving them from `src/content/templates` validated the
 * repo's committed catalog instead, so a hub-only family or alias change bypassed
 * brand-safety and slug-uniqueness validation while the route served it, and the
 * sitemap could advertise a slug the route no longer resolves.
 *
 * `usage` is the post-ranking value `serializeIndexEntry` produces, not the raw
 * index field, because that is what `deriveModelGroups` weighs against
 * `MIN_CLUSTER_USAGE`.
 */
export function loadHubModelCatalog(manifestPath: string = MODEL_CATALOG_PATH): CatalogTemplate[] {
  const entries: CatalogTemplate[] = [];
  for (const raw of readJsonArray(manifestPath)) {
    if (typeof raw !== 'object' || raw === null) continue;
    const entry = raw as Record<string, unknown>;
    if (typeof entry.name !== 'string' || entry.name.length === 0) continue;
    entries.push({
      name: entry.name,
      models: Array.isArray(entry.models) ? entry.models.filter(isNonEmptyString) : [],
      tags: Array.isArray(entry.tags) ? entry.tags.filter(isNonEmptyString) : [],
      usage: typeof entry.usage === 'number' && Number.isFinite(entry.usage) ? entry.usage : 0,
    });
  }
  return entries;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}
