/**
 * Resolves use-case SEO pages from the registry (`config/seo-pages.ts`) against the
 * catalog. Node-importable (no `import.meta.glob`); editorial copy is loaded
 * separately in `content-loaders.ts`.
 */
import type { SerializedTemplate } from '../hub-api';
import { SEO_PAGES, type SeoPageDef, type SeoPageFilters } from '../../config/seo-pages';
import { deriveModelGroups, type ModelGroup } from './model-groups';
import { useCasePath } from '../routes';
import { isMediaFile } from '../media-utils';
import type { SeoPageCard } from './schema';

/** First still (non-video/-audio) thumbnail across a group's templates. */
function groupThumbnail(group: ModelGroup): string | undefined {
  for (const template of group.templates) {
    const still = template.thumbnails?.find((thumb) => !isMediaFile(thumb));
    if (still) return still;
  }
  return undefined;
}

/** True if a template matches any of the page's filters (OR semantics). */
function matchesFilters(template: SerializedTemplate, filters: SeoPageFilters): boolean {
  const byModel = filters.models?.some((model) => template.models.includes(model)) ?? false;
  const byTag = filters.tags?.some((tag) => template.tags.includes(tag)) ?? false;
  const byMediaType = filters.mediaType ? template.mediaType === filters.mediaType : false;
  return byModel || byTag || byMediaType;
}

/** Templates matching a page's filters, usage-sorted. Empty when none match. */
export function resolveUseCasePageTemplates(
  def: SeoPageDef,
  catalog: SerializedTemplate[]
): SerializedTemplate[] {
  return catalog
    .filter((template) => matchesFilters(template, def.filters))
    .sort((a, b) => (b.usage || 0) - (a.usage || 0));
}

/** Every use-case page as a card, dropping empty grids. Shared by rail + index. */
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

// Reverse index (template name -> its use-case pages), memoized per catalog so
// the template-detail page does an O(1) lookup instead of re-resolving per render.
const membershipCache = new WeakMap<SerializedTemplate[], Map<string, SeoPageDef[]>>();

function useCaseMembership(catalog: SerializedTemplate[]): Map<string, SeoPageDef[]> {
  const cached = membershipCache.get(catalog);
  if (cached) return cached;

  const index = new Map<string, SeoPageDef[]>();
  for (const def of SEO_PAGES) {
    for (const template of resolveUseCasePageTemplates(def, catalog)) {
      const list = index.get(template.name);
      if (list) list.push(def);
      else index.set(template.name, [def]);
    }
  }
  membershipCache.set(catalog, index);
  return index;
}

/** Use-case pages featuring a template; powers the rail on template-detail pages. */
export function useCasePagesFeaturingTemplate(
  templateName: string,
  catalog: SerializedTemplate[]
): SeoPageDef[] {
  return useCaseMembership(catalog).get(templateName) ?? [];
}

/** A model family related to a use-case (or vice versa), ready to link. */
export interface RelatedModel {
  slug: string;
  label: string;
  /** First still thumbnail of the family's top template, for image cards. */
  thumbnail?: string;
  /** Total workflows in this model family across the catalog. */
  count: number;
  /** Short tagline (the family's primary keyword), for richer cards. */
  description?: string;
}

// Qualifying model groups, memoized per catalog: relatedness only links rich,
// indexable model pages, never a bare noindex grid.
const qualifyingGroupsCache = new WeakMap<SerializedTemplate[], ModelGroup[]>();

function qualifyingGroups(catalog: SerializedTemplate[]): ModelGroup[] {
  let groups = qualifyingGroupsCache.get(catalog);
  if (!groups) {
    groups = deriveModelGroups(catalog).filter((group) => group.qualifies);
    qualifyingGroupsCache.set(catalog, groups);
  }
  return groups;
}

/**
 * Models genuinely related to a use-case: the qualifying families that power its
 * resolved grid, ranked by how many of the page's workflows use each (a model
 * that drives many of the page's templates is more related than an incidental
 * one). Replaces hand-typed `relatedModels`, so it can never drift from the grid.
 */
export function relatedModelsForUseCase(
  def: SeoPageDef,
  catalog: SerializedTemplate[],
  limit = 3
): RelatedModel[] {
  const grid = resolveUseCasePageTemplates(def, catalog);
  const gridNames = new Set(grid.map((template) => template.name));

  return qualifyingGroups(catalog)
    .map((group) => ({
      group,
      count: group.templates.filter((template) => gridNames.has(template.name)).length,
    }))
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map(({ group }) => ({
      slug: group.slug,
      label: group.label,
      thumbnail: groupThumbnail(group),
      count: group.templates.length,
      description: group.keywords?.primary,
    }));
}

/**
 * Reverse of `relatedModelsForUseCase`: the use-case pages whose grid this model
 * family powers, ranked by overlap. Powers the "use cases featuring this model"
 * rail on a model page, derived rather than read from a hand-typed list.
 */
export function useCasesFeaturingModel(
  modelSlug: string,
  catalog: SerializedTemplate[],
  limit = 6
): SeoPageDef[] {
  const group = qualifyingGroups(catalog).find((candidate) => candidate.slug === modelSlug);
  if (!group) return [];
  const familyNames = new Set(group.templates.map((template) => template.name));

  return SEO_PAGES.map((def) => {
    const overlap = resolveUseCasePageTemplates(def, catalog).filter((template) =>
      familyNames.has(template.name)
    ).length;
    return { def, overlap };
  })
    .filter((entry) => entry.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap)
    .slice(0, limit)
    .map((entry) => entry.def);
}
