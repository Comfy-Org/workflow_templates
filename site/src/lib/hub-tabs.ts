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
