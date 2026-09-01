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
 *
 * The same pass also enforces the hreflang contract across every rendered page:
 * a broken language cluster is invisible in the build and in Search Console, and
 * only shows up weeks later as lost rankings in that language.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LOCALES } from '../src/i18n/config';
import {
  checkHreflangContract,
  declaresOnDemandRendering,
  parseAlternates,
  parseCanonical,
  parseNoindex,
  resolveSiteOrigin,
  type RenderedPage,
} from './hreflang-contract';

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

/** Cap on printed problems; a broken cluster repeats across thousands of pages. */
const MAX_REPORTED = 25;

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

/** Every rendered index.html, keyed by the URL path it will be served from. */
function collectRenderedPages(): RenderedPage[] {
  const pages: RenderedPage[] = [];
  const walk = (dir: string, urlPath: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full, `${urlPath}${entry.name}/`);
        continue;
      }
      if (entry.name !== 'index.html') continue;
      const html = fs.readFileSync(full, 'utf-8');
      pages.push({
        path: urlPath,
        alternates: parseAlternates(html),
        canonical: parseCanonical(html),
        noindex: parseNoindex(html),
      });
    }
  };
  walk(STATIC_DIR, '/');
  return pages;
}

/** The route whose render policy decides whether a missing localized detail page is a problem. */
const LOCALIZED_DETAIL_ROUTE = 'src/pages/[locale]/workflows/[slug].astro';

/**
 * Whether the localized detail route is prerendered, read from the route itself.
 *
 * Astro's `output: 'static'` prerenders every page that does not opt out, so the
 * absence of the opt-out in the route file is the policy. Read from source rather
 * than from the emitted pages: a build whose hub fetch failed emits none of them,
 * and inferring from that would excuse the very absence worth reporting.
 *
 * Throws when the route is gone rather than answering "not prerendered". That
 * answer would reclassify every missing localized detail page as unverifiable and
 * switch the existence rule off in silence, which is exactly what a moved or
 * renamed route must not be able to do.
 */
function localizedDetailIsPrerendered(): boolean {
  const route = path.join(SITE_DIR, LOCALIZED_DETAIL_ROUTE);
  if (!fs.existsSync(route)) {
    throw new Error(
      `${LOCALIZED_DETAIL_ROUTE} is missing, so the localized detail render policy cannot be ` +
        'determined. Point LOCALIZED_DETAIL_ROUTE at the route if it moved.'
    );
  }
  return !declaresOnDemandRendering(fs.readFileSync(route, 'utf-8'));
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

  const pages = collectRenderedPages();
  const origin = resolveSiteOrigin(process.env.PUBLIC_SITE_ORIGIN);
  const clustered = pages.filter((p) => p.alternates.length > 0).length;
  const result = checkHreflangContract(pages, origin, LOCALES, localizedDetailIsPrerendered());
  console.log(`  hreflang: ${clustered} of ${pages.length} pages emit alternates (${origin})`);
  if (result.unverifiable) {
    console.log(
      `  hreflang: ${result.unverifiable} alternates target server-rendered routes, not checkable here`
    );
  }
  problems.push(...result.problems);

  if (problems.length) {
    console.error('\nBuilt-site contract violated:');
    for (const p of problems.slice(0, MAX_REPORTED)) console.error(`  ✗ ${p}`);
    if (problems.length > MAX_REPORTED) {
      console.error(`  ... and ${problems.length - MAX_REPORTED} more`);
    }
    process.exit(1);
  }

  console.log('\nSitemap membership and the hreflang contract both hold.');
}

main().catch((error) => {
  // The checks themselves report through `problems`; reaching here means an input
  // the run depends on was not there, which is a failure, not a clean pass.
  console.error(`\nError: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
