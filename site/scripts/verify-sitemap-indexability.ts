/**
 * Sitemap membership and each route's noindex decision come from different datasets
 * and can drift; verify the built artifacts agree.
 *
 * How a section's verdict is read depends on how its route renders:
 *
 * - Prerendered (use-cases): from the built HTML's robots meta — the page's real,
 *   final answer.
 * - On-demand (model): that route emits no HTML for the build to inspect, since it
 *   has to run per request to 301 a variant slug. Its verdict is recomputed here
 *   instead, by calling `isModelPageIndexable` — the same helper the route calls,
 *   over families derived from the catalog the route derives them from: the live
 *   hub index.
 *
 * That dataset is the whole point. The sitemap's model list is built from a hub
 * snapshot taken during prebuild; the route answers from the hub as it is at
 * request time. Reading the prerendered HTML used to compare the two by accident,
 * because `getStaticPaths` built those pages from hub data. Recomputing the
 * verdict from `templates/index.json` — the committed catalog the sitemap's own
 * snapshot is a sibling of — would compare the repo to itself and could no longer
 * fail on the drift this check exists for.
 *
 * The hub fetch is the only network call, and it degrades rather than fails: a
 * gate that blocks merges must not go red because the hub was down. When it
 * degrades it says so and falls back to `templates/index.json`, the only catalog
 * present in a job that downloads the build artifact without ever running
 * prebuild.
 *
 * One coupling worth naming, because it is the obvious way to reintroduce a false
 * verdict: `listWorkflowIndex` filters by `PUBLIC_APPROVED_ONLY` and usage is
 * ranked through `PUBLIC_ALGOLIA_*`, so this check has to run with the same values
 * as the build whose artifact it reads. That holds by construction today —
 * `site-ci.yml` is the only workflow that runs this step, and neither its build
 * job nor its audit job sets any of them — but setting one on a single job would
 * break the check without touching a line of it.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import { listWorkflowIndex, loadSerializedTemplates } from '../src/lib/hub-api';
import { deriveModelGroups, type CatalogTemplate } from '../src/lib/workflow-pages/model-groups';
import { readModelContent } from '../src/lib/workflow-pages/landing-content';
import { isModelPageIndexable } from '../src/lib/workflow-pages/seo-page';
import { flattenTemplates, loadTemplateIndex } from './lib/index-reader';
import { DEFAULT_LOCALE } from './lib/constants';

const SITE_DIR = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const STATIC_DIR =
  ['dist/client', 'dist']
    .map((d) => path.join(SITE_DIR, d))
    .find((d) => fs.existsSync(path.join(d, 'workflows'))) ?? path.join(SITE_DIR, 'dist');

const SECTIONS = ['model', 'use-cases'] as const;
type Section = (typeof SECTIONS)[number];

function sitemapSlugs(section: Section): Set<string> {
  const slugs = new Set<string>();
  const re = new RegExp(`/workflows/${section}/([^/<]+)/`, 'g');
  for (const file of fs.readdirSync(STATIC_DIR)) {
    if (!file.startsWith('sitemap') || !file.endsWith('.xml')) continue;
    const xml = fs.readFileSync(path.join(STATIC_DIR, file), 'utf-8');
    for (const m of xml.matchAll(re)) slugs.add(m[1]);
  }
  return slugs;
}

/** Prerendered sections: the built page's own robots meta is the answer. */
function renderedIndexableSlugs(section: Section): Set<string> {
  const dir = path.join(STATIC_DIR, 'workflows', section);
  const slugs = new Set<string>();
  if (!fs.existsSync(dir)) return slugs;
  for (const slug of fs.readdirSync(dir)) {
    const html = path.join(dir, slug, 'index.html');
    if (!fs.existsSync(html)) continue;
    const noindex = /<meta[^>]+name="robots"[^>]+content="[^"]*noindex/i.test(
      fs.readFileSync(html, 'utf-8')
    );
    if (!noindex) slugs.add(slug);
  }
  return slugs;
}

/**
 * The catalog the model routes serve, or the committed index if the hub is
 * unreachable. Announced either way — a silent fallback would leave the check
 * looking green while comparing the repo to itself.
 */
async function modelCatalog(): Promise<{ catalog: CatalogTemplate[]; degraded: boolean }> {
  try {
    // Ask the index first and let it be the thing that fails: without
    // `PUBLIC_HUB_API_URL` set — which is this job — `loadSerializedTemplates`
    // swallows a hub failure and falls back to the collection it is handed,
    // so on its own it would return an empty catalog and read as "nothing is
    // indexable" rather than as an outage.
    await listWorkflowIndex();
    return { catalog: await loadSerializedTemplates(async () => []), degraded: false };
  } catch (err) {
    console.log(`  hub index unreachable (${err})`);
  }
  const categories = loadTemplateIndex(DEFAULT_LOCALE);
  return { catalog: categories ? flattenTemplates(categories) : [], degraded: true };
}

/** On-demand sections: recompute the verdict with the route's own helper. */
async function modelIndexableSlugs(): Promise<Set<string>> {
  const { catalog, degraded } = await modelCatalog();
  if (degraded) {
    console.log(
      '  model: DEGRADED — hub index unavailable, families derived from templates/index.json. ' +
        'Drift between the sitemap and the live catalog cannot be detected in this run.'
    );
  }

  return new Set(
    deriveModelGroups(catalog)
      .filter((group) =>
        isModelPageIndexable(group, group.templates.length, readModelContent(group.slug))
      )
      .map((group) => group.slug)
  );
}

function indexableSlugs(section: Section): Promise<Set<string>> {
  return section === 'model'
    ? modelIndexableSlugs()
    : Promise.resolve(renderedIndexableSlugs(section));
}

function diff(a: Set<string>, b: Set<string>): string[] {
  return [...a].filter((x) => !b.has(x)).sort();
}

async function main(): Promise<void> {
  if (!fs.existsSync(STATIC_DIR)) {
    console.error(`Error: build output not found at ${STATIC_DIR}. Run \`pnpm build\` first.`);
    process.exit(1);
  }

  const problems: string[] = [];

  for (const section of SECTIONS) {
    const inSitemap = sitemapSlugs(section);
    const indexable = await indexableSlugs(section);

    if (indexable.size === 0) {
      // An empty set is never a legitimate answer here, and the two sections fail
      // it for different reasons, so name the one that applies.
      problems.push(
        section === 'model'
          ? 'No indexable model pages — the hub index and templates/index.json are both empty or unreadable.'
          : `No indexable ${section} pages rendered — prebuild sync likely did not run.`
      );
    }
    const noindexButListed = diff(inSitemap, indexable);
    if (noindexButListed.length) {
      problems.push(`${section}: listed but noindex/absent: ${noindexButListed.join(', ')}`);
    }
    const indexableButUnlisted = diff(indexable, inSitemap);
    if (indexableButUnlisted.length) {
      problems.push(`${section}: indexable but not listed: ${indexableButUnlisted.join(', ')}`);
    }

    console.log(`  ${section}: ${inSitemap.size} in sitemap, ${indexable.size} indexable`);
  }

  if (problems.length) {
    console.error('\nSitemap ↔ indexable contract violated:');
    for (const p of problems) console.error(`  ✗ ${p}`);
    process.exit(1);
  }

  console.log('\nSitemap membership matches the rendered-indexable set.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
