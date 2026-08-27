/**
 * Sitemap membership and each route's noindex decision come from different datasets
 * (on-disk JSON vs live hub index) and can drift; verify the built artifacts agree.
 * Static-only, so it also catches the empty-set case where the catalog is missing.
 *
 * How a section's verdict is read depends on how its route renders:
 *
 * - Prerendered (use-cases): from the built HTML's robots meta — the page's real,
 *   final answer.
 * - On-demand (model): that route emits no HTML for the build to inspect, since it
 *   has to run per request to 301 a variant slug. Its verdict is recomputed here
 *   instead, by calling `isModelPageIndexable` — the same helper the route calls,
 *   over families derived the same way. That still catches the drift this check
 *   exists for, because the sitemap's own list comes from a different expression
 *   in astro.config.mjs (`qualifies && modelContentPasses`), so a change to either
 *   side breaks the tie. What it can no longer see is a render-time difference
 *   between the helper's answer and the markup, which only a request to the
 *   running route would show.
 *
 * Reads `templates/index.json` rather than the synced `src/content/templates`,
 * because this runs in a job that only downloads the build artifact and never runs
 * prebuild. That file is the committed source the sync generates from, so it is
 * the same catalog, and it is present at checkout.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import { deriveModelGroups } from '../src/lib/workflow-pages/model-groups';
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
 * On-demand sections: recompute the verdict with the route's own helper, over the
 * catalog the route actually serves.
 *
 * This read `templates/index.json` while sitemap membership came from
 * `src/content/templates`, which prebuild syncs from that same committed file, so
 * it compared the repo catalog to itself. The model route resolves through
 * `loadSerializedTemplates`, which fetches the hub index, and the two disagree by
 * 45 families. Prebuild writes the hub-derived list for exactly this reason; the
 * fetch cannot happen here, since this job runs against a downloaded build
 * artifact with no network.
 *
 * Falls back to the committed index when the manifest is absent, which is the
 * pre-existing behaviour and still better than skipping the check.
 */
function modelIndexableSlugs(): Set<string> {
  const groups = loadHubModelGroups() ?? modelGroupsFromRepoCatalog();
  return new Set(
    groups
      .filter((group) =>
        isModelPageIndexable(group, group.templateCount, readModelContent(group.slug))
      )
      .map((group) => group.slug)
  );
}

interface ManifestModelGroup {
  slug: string;
  qualifies: boolean;
  templateCount: number;
}

function loadHubModelGroups(): ManifestModelGroup[] | null {
  const file = path.join(SITE_DIR, 'src/data/hub-model-groups.generated.json');
  if (!fs.existsSync(file)) return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf-8'));
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

function modelGroupsFromRepoCatalog(): ManifestModelGroup[] {
  const categories = loadTemplateIndex(DEFAULT_LOCALE);
  if (!categories) return [];
  return deriveModelGroups(flattenTemplates(categories)).map((group) => ({
    slug: group.slug,
    qualifies: group.qualifies,
    templateCount: group.templates.length,
  }));
}

function indexableSlugs(section: Section): Set<string> {
  return section === 'model' ? modelIndexableSlugs() : renderedIndexableSlugs(section);
}

function diff(a: Set<string>, b: Set<string>): string[] {
  return [...a].filter((x) => !b.has(x)).sort();
}

function main(): void {
  if (!fs.existsSync(STATIC_DIR)) {
    console.error(`Error: build output not found at ${STATIC_DIR}. Run \`pnpm build\` first.`);
    process.exit(1);
  }

  const problems: string[] = [];

  for (const section of SECTIONS) {
    const inSitemap = sitemapSlugs(section);
    const indexable = indexableSlugs(section);

    if (indexable.size === 0) {
      // An empty set is never a legitimate answer here, and the two sections fail
      // it for different reasons, so name the one that applies.
      problems.push(
        section === 'model'
          ? 'No indexable model pages — templates/index.json is missing or unreadable.'
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

main();
