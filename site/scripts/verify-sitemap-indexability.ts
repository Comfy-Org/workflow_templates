/**
 * Sitemap membership and each route's noindex decision come from different datasets
 * (on-disk JSON vs live hub index) and can drift; verify the built artifacts agree.
 * Static-only, so it also catches the empty-set case where prebuild didn't run.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

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

  if (problems.length) {
    console.error('\nSitemap ↔ indexable contract violated:');
    for (const p of problems) console.error(`  ✗ ${p}`);
    process.exit(1);
  }

  console.log('\nSitemap membership matches the rendered-indexable set.');
}

main();
