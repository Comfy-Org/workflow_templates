/**
 * Node-side landing-content check for build steps that run outside a page render
 * (sitemap, qualifying-groups filter, orphan assertion) — `content-loaders.ts` is
 * `astro:content`-only. One definition of "rich": JSON exists and not `qualityFailed`.
 */
import fs from 'node:fs';
import path from 'node:path';

const MODELS_DIR = path.join(process.cwd(), 'src/content/landing/models');
const USE_CASES_DIR = path.join(process.cwd(), 'src/content/landing/use-cases');

function contentPasses(dir: string, slug: string): boolean {
  const contentPath = path.join(dir, `${slug}.json`);
  if (!fs.existsSync(contentPath)) return false;
  try {
    return JSON.parse(fs.readFileSync(contentPath, 'utf-8')).qualityFailed !== true;
  } catch {
    return false;
  }
}

function listSlugs(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.slice(0, -'.json'.length));
}

export const modelContentPasses = (slug: string): boolean => contentPasses(MODELS_DIR, slug);
export const useCaseContentPasses = (slug: string): boolean => contentPasses(USE_CASES_DIR, slug);
export const listModelContentSlugs = (): string[] => listSlugs(MODELS_DIR);
export const listUseCaseContentSlugs = (): string[] => listSlugs(USE_CASES_DIR);

/**
 * Throw at build time if a landing JSON has no page to render it — its filename
 * doesn't match a canonical slug in `validSlugs`. Catches authored copy silently
 * dead because the slug drifted from the generated group / SEO_PAGES slug.
 */
export function assertNoOrphanedContent(kind: 'model' | 'use-case', validSlugs: Set<string>): void {
  const authored = kind === 'model' ? listModelContentSlugs() : listUseCaseContentSlugs();
  const orphans = authored.filter((slug) => !validSlugs.has(slug));
  if (orphans.length > 0) {
    throw new Error(
      `Orphaned ${kind} landing content (no page renders these slugs): ${orphans.join(', ')}. ` +
        `Rename the JSON to a canonical slug or add the matching ${kind}.`
    );
  }
}
