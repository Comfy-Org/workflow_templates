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
  /** Needed only by pages that pin/exclude specific shares; optional so the
   *  narrower build-time shapes stay valid (their pages just skip pinning). */
  shareId?: string;
  isApp?: boolean;
}

/** Matches if any filter matches (OR semantics); `excludeTags` vetoes. */
function matchesFilters(template: FilterableTemplate, filters: SeoPageFilters): boolean {
  if (filters.excludeTags?.some((tag) => template.tags?.includes(tag))) return false;
  const byModel = filters.models?.some((model) => template.models?.includes(model)) ?? false;
  const byTag = filters.tags?.some((tag) => template.tags?.includes(tag)) ?? false;
  return byModel || byTag;
}

/**
 * Templates matching a page's filters, usage-sorted, minus the page's explicit
 * excludes, with its pinned shares prepended (registry order). Empty when none
 * match. Pins are looked up in the catalog by share id, so a cloud-save-only
 * share silently stays out until it is hub-published.
 */
export function resolveUseCasePageTemplates<T extends FilterableTemplate>(
  def: SeoPageDef,
  catalog: T[]
): T[] {
  const excluded = new Set(def.excludeShareIds ?? []);
  const matched = catalog
    .filter((template) => matchesFilters(template, def.filters))
    .filter((template) => !template.shareId || !excluded.has(template.shareId))
    .sort(byUsageDesc);

  const pinned = (def.pins ?? []).flatMap((pin) => {
    const found = catalog.find((template) => template.shareId === pin.shareId);
    if (!found) return [];
    // isApp override: files a pinned App Mode share under the "Comfy Apps" tab
    // when the catalog hasn't flagged it yet.
    return [pin.isApp ? { ...found, isApp: true } : found];
  });
  if (pinned.length === 0) return matched;

  const pinnedIds = new Set(pinned.map((template) => template.shareId));
  return [...pinned, ...matched.filter((t) => !t.shareId || !pinnedIds.has(t.shareId))];
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
