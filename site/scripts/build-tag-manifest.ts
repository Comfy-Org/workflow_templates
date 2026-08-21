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
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { listWorkflowIndex } from '../src/lib/hub-api';
import { readEnv } from '../src/lib/ranking';
import { tagSlug } from '../src/lib/tag-aliases';

const manifestPath = path.join(process.cwd(), 'src/data/hub-tag-slugs.generated.json');
const categoryPath = path.join(process.cwd(), 'src/data/hub-categories.generated.json');

async function main(): Promise<void> {
  let entries;
  try {
    entries = await listWorkflowIndex();
  } catch (err) {
    // Same contract as `loadSerializedTemplates`: a configured hub that fails is
    // a build failure, an unconfigured one is a local build and degrades. The
    // degraded shape is "no localized tag URLs in the sitemap", never a guessed
    // list — a missing URL is recoverable, an advertised 404 is not. Nothing is
    // written, so a fresh checkout (which is what CI and Vercel build from) has
    // no manifest rather than a stale one.
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
  const categories = [
    ...new Set(entries.map((entry) => entry.mediaType).filter(Boolean)),
  ].sort();

  mkdirSync(path.dirname(manifestPath), { recursive: true });
  writeFileSync(manifestPath, `${JSON.stringify(slugs, null, 2)}\n`);
  writeFileSync(categoryPath, `${JSON.stringify(categories, null, 2)}\n`);
  console.log(
    `Wrote ${slugs.length} tag slugs and ${categories.length} categories ` +
      `(${categories.join(', ')}) from ${entries.length} hub entries.`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
