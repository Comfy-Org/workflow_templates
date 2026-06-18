/**
 * Shared config + label resolution for the browse toolbar (tabs / filter / sort).
 *
 * Single source of truth for:
 *  - the toolbar's i18n label bundle (resolved in Astro; Vue islands never import i18n)
 *  - the type of those labels (consumed by WorkflowGrid + BrowseToolbar)
 *  - the hub filter facet groups (Models | Categories)
 *
 * Pages build the labels once with `buildToolbarLabels(locale)` and pass them to
 * `WorkflowGrid`, which mounts the toolbar. Only pages that want the filter
 * popover (the hub landing page) also pass `buildFacetsConfig(locale)`.
 */
import { t } from '@/i18n/ui';
import type { Locale } from '@/i18n/config';
import type { FilterBadge } from '@/composables/useHubStore';

/** A filter facet group rendered as an inner tab in the filter popover. */
export interface FacetGroupConfig {
  key: string;
  type: FilterBadge['type'];
  label: string;
}

/** Every user-visible string the toolbar needs, pre-resolved for one locale. */
export interface ToolbarLabels {
  all: string;
  nodeGraphs: string;
  comfyApps: string;
  filter: string;
  clearAll: string;
  searchPlaceholder: string;
  noResults: string;
  sortPopular: string;
  sortNewest: string;
}

/** Resolve the toolbar label bundle for a locale (call once per page, in Astro). */
export function buildToolbarLabels(locale: Locale): ToolbarLabels {
  return {
    all: t('hub.tab.all', locale),
    nodeGraphs: t('hub.tab.nodeGraphs', locale),
    comfyApps: t('hub.tab.comfyApps', locale),
    filter: t('hub.filter', locale),
    clearAll: t('hub.facets.clearAll', locale),
    searchPlaceholder: t('hub.facets.search', locale),
    noResults: t('hub.facets.noResults', locale),
    sortPopular: t('hub.sort.popular', locale),
    sortNewest: t('hub.sort.newest', locale),
  };
}

/** The hub filter facet groups (Models | Categories), labels resolved for a locale. */
export function buildFacetsConfig(locale: Locale): FacetGroupConfig[] {
  return [
    { key: 'models', type: 'model', label: t('hub.models', locale) },
    { key: 'categories', type: 'tag', label: t('labels.categories', locale) },
  ];
}
