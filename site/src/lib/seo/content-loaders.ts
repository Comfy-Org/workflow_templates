/**
 * Loads SEO-page editorial copy from the `seoModels`/`seoUseCases` collections,
 * returning `null` when a slug has none. Astro-only (`getEntry`); Node callers
 * read the JSON via `fs` in `load-articles.ts`.
 */
import { getEntry } from 'astro:content';
import type { GeneratedSeoContent } from './schema';

export async function loadModelContent(slug: string): Promise<GeneratedSeoContent | null> {
  const entry = await getEntry('seoModels', slug);
  return entry?.data ?? null;
}

export async function loadUseCaseContent(slug: string): Promise<GeneratedSeoContent | null> {
  const entry = await getEntry('seoUseCases', slug);
  return entry?.data ?? null;
}
