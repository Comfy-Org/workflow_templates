/**
 * Node-side landing-content check for build steps that run outside a page render
 * (sitemap, qualifying-groups filter, orphan assertion) — `content-loaders.ts` is
 * `astro:content`-only. One definition of "rich": JSON exists and not `qualityFailed`.
 */
import fs from 'node:fs';
import path from 'node:path';

import type { GeneratedSeoContent } from './schema';

const MODELS_DIR = path.join(process.cwd(), 'src/content/landing/models');
const USE_CASES_DIR = path.join(process.cwd(), 'src/content/landing/use-cases');

function readContent(dir: string, slug: string): GeneratedSeoContent | null {
  const contentPath = path.join(dir, `${slug}.json`);
  if (!fs.existsSync(contentPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(contentPath, 'utf-8')) as GeneratedSeoContent;
  } catch {
    return null;
  }
}

function contentPasses(dir: string, slug: string): boolean {
  const content = readContent(dir, slug);
  return content !== null && content.qualityFailed !== true;
}

function listSlugs(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.slice(0, -'.json'.length));
}

/**
 * The authored landing content itself, for callers that need to feed it to the
 * same indexability helper a route calls rather than just ask pass/fail.
 * `content-loaders.ts` is the `astro:content` twin of this, for page renders.
 */
export const readModelContent = (slug: string): GeneratedSeoContent | null =>
  readContent(MODELS_DIR, slug);

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
