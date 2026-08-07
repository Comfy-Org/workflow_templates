import type { HubTab } from '@/composables/useHubStore';

/**
 * The hub's All / Node Graphs / Comfy Apps tab, as a pure predicate.
 *
 * The tab is a scope rather than a filter refinement: it decides which universe
 * is being browsed, so everything derived from the catalogue has to agree on it.
 * The grid and the filter facet counts both narrow through this, which is what
 * stops a count advertising more than its tab can return.
 */

/** Minimal shape the tab scope reads. */
export interface TabbableTemplate {
  isApp?: boolean;
}

export function templatesInTab<T extends TabbableTemplate>(templates: T[], tab: HubTab): T[] {
  if (tab === 'comfyApps') return templates.filter((t) => t.isApp);
  if (tab === 'nodeGraphs') return templates.filter((t) => !t.isApp);
  return templates;
}

/** A selected filter value, as held in the store. */
export interface ScopedBadge {
  type: string;
  value: string;
}

/** The fields a badge can select on. */
export interface FacetedTemplate {
  models?: string[];
  tags?: string[];
}

/**
 * Badges that still match something in the given (already tab-scoped) templates.
 *
 * Scoping the facet list to the tab is not enough on its own. A badge selected on
 * one tab stays applied after switching while its option vanishes from the scoped
 * list, so "All, filter Wan, then Comfy Apps" left `Wan` active with no visible
 * way to clear it and an empty grid. Badges that still exist in the new tab are
 * kept, so switching does not silently discard a filter that still means
 * something. A badge of an unrecognised type is kept rather than dropped, since
 * this cannot know what it selects on.
 */
export function badgesAvailableIn<T extends FacetedTemplate>(
  badges: ScopedBadge[],
  scopedTemplates: T[]
): ScopedBadge[] {
  if (badges.length === 0) return badges;

  // A Map, not an object literal: a badge type of "constructor" or "toString"
  // would hit Object.prototype on a plain object and throw on .has().
  const available = new Map<string, Set<string>>([
    ['model', new Set(scopedTemplates.flatMap((t) => t.models ?? []))],
    ['tag', new Set(scopedTemplates.flatMap((t) => t.tags ?? []))],
  ]);

  return badges.filter((b) => {
    const values = available.get(b.type);
    return values ? values.has(b.value) : true;
  });
}
