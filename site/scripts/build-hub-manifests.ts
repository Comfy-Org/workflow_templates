/**
 * Write the hub-derived manifests `astro.config.mjs` reads.
 *
 * Three files, all gitignored, all generated during prebuild beside the synced
 * template catalog:
 *
 *   src/data/hub-tag-slugs.generated.json     tag slugs the hub index carries
 *   src/data/hub-categories.generated.json    media types the index declares
 *   src/data/hub-model-catalog.generated.json the catalog the model routes serve
 *
 * The config cannot fetch any of them itself: it is loaded by `astro check`,
 * `astro dev`, eslint and every unit-test run, none of which should need the
 * network to answer. So the fetch happens once, here.
 *
 * Nor can it derive them from `src/content/templates`. Those files are the repo's
 * own templates, synced from `templates/index.json`; the hub is a larger catalog
 * that the routes actually serve, and the two differ in both directions:
 *
 *   - Tags. Measured against production: the files yield 54 tag slugs, the hub 75,
 *     and 4 of the files' slugs (`character-replacement`, `element-segmentation`,
 *     `int8`, `reference-to-video`) belong to no hub workflow at all. The
 *     localized tag route 404s a tag with no matching workflows, so deriving from
 *     the files would have put four 404s per locale into the sitemap while
 *     omitting 25 real pages.
 *   - Models. Both model routes resolve a request from `loadSerializedTemplates()`
 *     — the hub index — so the build-time guards (brand safety, orphaned content,
 *     slug uniqueness) and the sitemap's model list have to see that catalog.
 *     Deriving them from the synced files validated a catalog the routes never
 *     serve, letting a hub-only family or alias change bypass the guards entirely.
 *
 * Usage: pnpm build:hub-manifests
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import {
  CATEGORY_MANIFEST_PATH,
  HUB_MANIFEST_PATHS,
  MODEL_CATALOG_PATH,
  TAG_MANIFEST_PATH,
} from '../src/lib/hub-manifests';
import { listWorkflowIndex, loadSerializedTemplates } from '../src/lib/hub-api';
import { readEnv } from '../src/lib/ranking';
import { tagSlug } from '../src/lib/tag-aliases';

/**
 * A refresh that cannot complete must leave nothing behind.
 *
 * The degraded contract is "no hub-derived URLs and no guards this build", and
 * that only holds if the previous run's files are gone. A fresh checkout (what CI
 * and Vercel build from) has none, but a reused checkout does, and reading a hub
 * snapshot of unknown age is worse than reading nothing: it re-advertises tag and
 * category URLs that may since have emptied, and re-validates a stale model
 * catalog. Cleared before giving up either way, degraded or fatal.
 */
function clearManifests(): void {
  for (const file of HUB_MANIFEST_PATHS) rmSync(file, { force: true });
}

function write(file: string, value: unknown): void {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

async function main(): Promise<void> {
  let entries;
  let catalog;
  try {
    // One hub request feeds both: `listWorkflowIndex` caches it for the process
    // and `loadSerializedTemplates` reads through the same cache.
    entries = await listWorkflowIndex();
    catalog = await loadSerializedTemplates(async () => []);
  } catch (err) {
    // Same contract as `loadSerializedTemplates`: a configured hub that fails is
    // a build failure, an unconfigured one is a local build and degrades.
    clearManifests();
    if (readEnv('PUBLIC_HUB_API_URL')) {
      throw new Error(`Hub API failed while building the hub manifests: ${err}`);
    }
    console.warn(
      `Hub API unreachable (${err}). Skipping the hub manifests — this build's sitemap ` +
        `will omit hub-derived URLs and its model guards will not run.`
    );
    return;
  }

  const slugs = [
    ...new Set(
      entries.flatMap((entry) =>
        (entry.tags || [])
          .filter((tag): tag is string => typeof tag === 'string' && tag.trim().length > 0)
          .map((tag) => tagSlug(tag))
          .filter((slug) => slug.length > 0)
      )
    ),
  ].sort();

  // The categories that actually have workflows, read off what the index
  // declares. The category route 404s an empty type exactly as the tag route
  // 404s an empty tag, so the sitemap has to be told which ones exist rather
  // than assuming all four always do. Nothing is inferred from tags: when the
  // hub populates `mediaType` on every entry this list follows on its own, with
  // no sitemap change.
  const categories = [...new Set(entries.map((entry) => entry.mediaType).filter(Boolean))].sort();

  // Only the fields `deriveModelGroups` reads, so the config derives families
  // with the same function over the same data the routes serve. `usage` is the
  // post-ranking value `serializeIndexEntry` produces, which is what the
  // clustering thresholds weigh.
  const modelCatalog = catalog.map((template) => ({
    name: template.name,
    models: template.models,
    tags: template.tags,
    usage: template.usage,
  }));

  write(TAG_MANIFEST_PATH, slugs);
  write(CATEGORY_MANIFEST_PATH, categories);
  write(MODEL_CATALOG_PATH, modelCatalog);
  console.log(
    `Wrote ${slugs.length} tag slugs, ${categories.length} categories ` +
      `(${categories.join(', ')}) and ${modelCatalog.length} model-catalog entries ` +
      `from ${entries.length} hub entries.`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
