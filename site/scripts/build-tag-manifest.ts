/**
 * Write the hub's tag-slug list for the sitemap to read.
 *
 * The localized tag routes are on-demand rendered, so `@astrojs/sitemap` never
 * discovers them and their URLs have to be listed by hand in `astro.config.mjs`.
 * The config cannot fetch that list itself: it is loaded by `astro check`,
 * `astro dev`, eslint and every unit-test run, none of which should need the
 * network to answer.
 *
 * Nor can it derive the list from `src/content/templates`. Those files are the
 * repo's own templates; the tag pages are built from the hub index, which is a
 * larger catalog with a different tag vocabulary. Measured against production:
 * the files yield 54 tag slugs, the hub 75, and 4 of the files' slugs
 * (`character-replacement`, `element-segmentation`, `int8`, `reference-to-video`)
 * belong to no hub workflow at all. The localized tag route 404s a tag with no
 * matching workflows, so deriving from the files would have put four 404s per
 * locale into the sitemap while omitting 25 real pages.
 *
 * So the fetch happens once, here, during prebuild, and the result is a
 * gitignored file next to the synced catalog that is generated the same way.
 *
 * Usage: pnpm build:tag-manifest
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { listWorkflowIndex } from '../src/lib/hub-api';
import { deriveModelGroups } from '../src/lib/workflow-pages/model-groups';
import { readEnv } from '../src/lib/ranking';
import { tagSlug } from '../src/lib/tag-aliases';

const manifestPath = path.join(process.cwd(), 'src/data/hub-tag-slugs.generated.json');
const categoryPath = path.join(process.cwd(), 'src/data/hub-categories.generated.json');
const modelPath = path.join(process.cwd(), 'src/data/hub-model-groups.generated.json');

/** Drop generated manifests so a failed refresh cannot leave the last run's URLs behind. */
function discardManifests(): void {
  rmSync(manifestPath, { force: true });
  rmSync(categoryPath, { force: true });
  rmSync(modelPath, { force: true });
}

async function main(): Promise<void> {
  let entries;
  try {
    entries = await listWorkflowIndex();
  } catch (err) {
    // Same contract as `loadSerializedTemplates`: a configured hub that fails is
    // a build failure, an unconfigured one is a local build and degrades. The
    // degraded shape is "no localized tag URLs in the sitemap", never a guessed
    // list — a missing URL is recoverable, an advertised 404 is not.
    //
    // Both files are removed first. Writing nothing is only the degraded shape on
    // a fresh checkout; in a reused one, an earlier successful run leaves
    // manifests behind and `astro.config.mjs` would read them and advertise the
    // previous build's localized tag and category URLs as though this build had
    // produced them. Stale output survives a failed refresh in neither branch,
    // which is why this runs before the throw as well.
    discardManifests();
    if (readEnv('PUBLIC_HUB_API_URL')) {
      throw new Error(`Hub API failed while building the tag manifest: ${err}`);
    }
    console.warn(
      `Hub API unreachable (${err}). Skipping the tag manifest — the sitemap will ` +
        `omit localized tag URLs for this build.`
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

  // The categories that actually have workflows, by the same rule the routes
  // classify with. The category route 404s an empty type exactly as the tag
  // route 404s an empty tag, so the sitemap has to be told which ones exist
  // rather than assuming all four always do. This is also what makes the
  // classification source swappable: when the hub populates `mediaType` on every
  // entry, this list keeps following it and no sitemap change is needed.
  const categories = [...new Set(entries.map((entry) => entry.mediaType).filter(Boolean))].sort();

  mkdirSync(path.dirname(manifestPath), { recursive: true });
  /**
   * The model families the routes actually serve.
   *
   * The build guards and the indexability check used to derive these from
   * `src/content/templates`, which prebuild syncs from the committed
   * `templates/index.json`. The routes do not read that catalog: they resolve
   * through `loadSerializedTemplates`, which fetches this same hub index and only
   * falls back to the repo files when the hub is unconfigured. Measured against
   * production the two disagree by 45 families, 3 the hub serves and the guards
   * never saw, 42 the guards validated with no route behind them, so a hub-only
   * slug collision or denied term could pass a green build.
   *
   * Only the fields those callers read, so the manifest stays small and its
   * contract is visible.
   */
  const modelGroups = deriveModelGroups(entries).map((group) => ({
    slug: group.slug,
    label: group.label,
    qualifies: group.qualifies,
    redirectFrom: group.redirectFrom,
    keywords: { primary: group.keywords.primary, secondary: group.keywords.secondary },
    templateCount: group.templates.length,
  }));

  writeFileSync(manifestPath, `${JSON.stringify(slugs, null, 2)}\n`);
  writeFileSync(modelPath, `${JSON.stringify(modelGroups, null, 2)}\n`);
  writeFileSync(categoryPath, `${JSON.stringify(categories, null, 2)}\n`);
  console.log(
    `Wrote ${slugs.length} tag slugs, ${categories.length} categories ` +
      `(${categories.join(', ')}) and ${modelGroups.length} model families ` +
      `from ${entries.length} hub entries.`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
