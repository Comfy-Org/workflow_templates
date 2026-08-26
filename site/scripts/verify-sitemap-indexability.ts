/**
 * Sitemap membership and each route's noindex decision come from different datasets
 * (on-disk JSON vs live hub index) and can drift; verify the built artifacts agree.
 * Static-only, so it also catches the empty-set case where prebuild didn't run.
 *
 * The same pass also enforces the hreflang contract across every rendered page:
 * a broken language cluster is invisible in the build and in Search Console, and
 * only shows up weeks later as lost rankings in that language.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  checkHreflangContract,
  parseAlternates,
  parseCanonical,
  parseNoindex,
  resolveSiteOrigin,
  type RenderedPage,
} from './hreflang-contract';

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

function main(): void {
  if (!fs.existsSync(STATIC_DIR)) {
    console.error(`Error: build output not found at ${STATIC_DIR}. Run \`pnpm build\` first.`);
    process.exit(1);
  }

  const problems: string[] = [];

  for (const section of SECTIONS) {
    const inSitemap = sitemapSlugs(section);
    const indexable = renderedIndexableSlugs(section);

    if (indexable.size === 0) {
      problems.push(`No indexable ${section} pages rendered — prebuild sync likely did not run.`);
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
  const result = checkHreflangContract(pages, origin);
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

main();
