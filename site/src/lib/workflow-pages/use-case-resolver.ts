/**
 * Resolves use-case SEO pages from the registry (`./use-cases.ts`) against the
 * catalog. Node-importable (no `import.meta.glob`); editorial copy is loaded
 * separately in `content-loaders.ts`.
 */
import { byUsageDesc, type SerializedTemplate } from '../hub-api';
import { SEO_PAGES, type SeoPageDef, type SeoPageFilters } from './use-cases';
import { deriveModelGroups, type ModelGroup } from './model-groups';
import { modelContentPasses } from './landing-content';
import { firstStillAcross } from '../media-utils';

/** The template fields the filter/sort reads — kept minimal so build-time
 *  sitemap templates (a narrower shape than SerializedTemplate) also satisfy it. */
export interface FilterableTemplate {
  models?: string[];
  tags?: string[];
  usage?: number;
}

/** Matches if any filter matches (OR semantics). */
function matchesFilters(template: FilterableTemplate, filters: SeoPageFilters): boolean {
  const byModel = filters.models?.some((model) => template.models?.includes(model)) ?? false;
  const byTag = filters.tags?.some((tag) => template.tags?.includes(tag)) ?? false;
  return byModel || byTag;
}

/** Templates matching a page's filters, usage-sorted. Empty when none match. */
export function resolveUseCasePageTemplates<T extends FilterableTemplate>(
  def: SeoPageDef,
  catalog: T[]
): T[] {
  return catalog.filter((template) => matchesFilters(template, def.filters)).sort(byUsageDesc);
}

/** A model family related to a use-case (or vice versa), ready to link. */
export interface RelatedModel {
  slug: string;
  label: string;
  /** First still thumbnail across the family's templates, for image cards. */
  thumbnail?: string;
  /** Total workflows in this model family across the catalog. */
  count: number;
}

// Indexable model groups, memoized per catalog. `qualifies` alone is weaker than
// the page's own gate, so a priority family without a landing JSON would link to a
// noindex grid — require shippable content too.
const qualifyingGroupsCache = new WeakMap<SerializedTemplate[], ModelGroup[]>();

export function qualifyingGroups(catalog: SerializedTemplate[]): ModelGroup[] {
  let groups = qualifyingGroupsCache.get(catalog);
  if (!groups) {
    groups = deriveModelGroups(catalog).filter(
      (group) => group.qualifies && modelContentPasses(group.slug)
    );
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
      thumbnail: firstStillAcross(group.templates) ?? undefined,
      count: group.templates.length,
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
