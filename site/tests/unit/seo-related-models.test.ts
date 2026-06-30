/**
 * Relatedness test: `relatedModelsForUseCase` / `useCasesFeaturingModel` derive
 * the cross-link rails from grid overlap (replacing the old hand-typed
 * relatedModels), ranked by overlap and limited to qualifying model pages.
 */
import { describe, expect, it } from 'vitest';
import {
  relatedModelsForUseCase,
  useCasesFeaturingModel,
} from '../../src/lib/seo/use-case-resolver';
import { SEO_PAGES } from '../../src/config/seo-pages';
import type { SerializedTemplate } from '../../src/lib/hub-api';

/** A use-case backed by a real registry filter, so the resolver selects the grid. */
const portraitPage = SEO_PAGES.find((p) => p.slug === 'ai-headshot-generator')!;

/** Minimal template; only the fields the resolvers read need to be real. */
function tmpl(name: string, models: string[], usage = 100): SerializedTemplate {
  return { name, tags: ['Portrait'], models, usage } as SerializedTemplate;
}

// Flux powers 3 of the grid's templates, Z-Image 1. Both are PRIORITY_MODELS so
// they qualify even at low usage; "Mystery Model" never qualifies and must be dropped.
const catalog: SerializedTemplate[] = [
  tmpl('a', ['Flux']),
  tmpl('b', ['Flux']),
  tmpl('c', ['Flux', 'Z-Image']),
  tmpl('d', ['Mystery Model']),
];

describe('relatedModelsForUseCase', () => {
  const related = relatedModelsForUseCase(portraitPage, catalog);

  it('ranks by how many of the grid templates use each family', () => {
    expect(related.map((r) => r.slug)).toEqual(['flux', 'z-image']);
  });

  it('only surfaces qualifying model families', () => {
    expect(related.map((r) => r.slug)).not.toContain('mystery-model');
  });

  it('respects the limit', () => {
    expect(relatedModelsForUseCase(portraitPage, catalog, 1).map((r) => r.slug)).toEqual(['flux']);
  });
});

describe('useCasesFeaturingModel', () => {
  it('returns the use-cases whose grid the family powers', () => {
    const slugs = useCasesFeaturingModel('flux', catalog).map((def) => def.slug);
    expect(slugs).toContain('ai-headshot-generator');
  });

  it('is empty for a non-qualifying or unknown model', () => {
    expect(useCasesFeaturingModel('mystery-model', catalog)).toEqual([]);
    expect(useCasesFeaturingModel('does-not-exist', catalog)).toEqual([]);
  });
});
