/**
 * Card resolvers for the model + use-case index pages. Both render the same
 * `SeoPageCard` grid; only qualifying/non-empty pages become cards.
 */
import type { SerializedTemplate } from '../hub-api';
import { modelPath, useCasePath } from '../routes';
import type { SeoPageCard } from './schema';
import { deriveModelGroups } from './model-groups';
import { SEO_PAGES } from './use-cases';
import { resolveUseCasePageTemplates } from './use-case-resolver';

export function resolveModelPageCards(
  catalog: SerializedTemplate[],
  locale?: string
): SeoPageCard[] {
  return deriveModelGroups(catalog)
    .filter((group) => group.qualifies)
    .sort((a, b) => b.usage - a.usage)
    .map((group) => ({
      href: modelPath(group.slug, locale),
      title: `${group.label} ComfyUI Workflows`,
      count: group.templates.length,
      thumbnail: group.templates[0]?.thumbnails?.[0] ?? null,
    }));
}

export function resolveUseCasePageCards(
  catalog: SerializedTemplate[],
  locale?: string
): SeoPageCard[] {
  return SEO_PAGES.map((def) => {
    const templates = resolveUseCasePageTemplates(def, catalog);
    return {
      href: useCasePath(def.slug, locale),
      title: def.h1,
      count: templates.length,
      thumbnail: templates[0]?.thumbnails?.[0] ?? null,
    };
  }).filter((card) => card.count > 0);
}
