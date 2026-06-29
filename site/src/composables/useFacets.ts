import { computed, type Ref } from 'vue';
import { useHubStore, type FilterBadge } from './useHubStore';
import { tagDisplayName } from '@/lib/tag-aliases';

/**
 * Facet data for the hub filter bar — the single source of truth for the
 * full lists of filterable values (models, tags) with their template counts.
 *
 * Replaces the top-5 `topTags`/`topModels` computeds that were duplicated
 * across the old sidebar/drawer. FacetBar renders off this; the store
 * (useHubStore.filterBadges) holds the active selection.
 */

/** Minimal template shape the facet derivation needs. */
export interface FacetTemplate {
  tags: string[];
  models: string[];
}

/** A single selectable value within a facet group. */
export interface FacetValue {
  value: string;
  displayValue: string;
  count: number;
}

/** A facet group (e.g. all models, or all tags). */
export interface Facet {
  type: FilterBadge['type'];
  values: FacetValue[];
}

/**
 * Maps each facet badge type to the template field it reads and the display
 * transform for its values. Adding a future facet type (e.g. 'industry') is a
 * one-line addition here — the render layer stays untouched.
 */
const FACET_SOURCES: Record<
  Extract<FilterBadge['type'], 'model' | 'tag'>,
  { field: (t: FacetTemplate) => string[]; display: (v: string) => string }
> = {
  model: { field: (t) => t.models, display: (v) => v },
  tag: { field: (t) => t.tags, display: (v) => tagDisplayName(v) },
};

function buildFacet(
  templates: FacetTemplate[],
  type: Extract<FilterBadge['type'], 'model' | 'tag'>
): Facet {
  const { field, display } = FACET_SOURCES[type];
  const counts = new Map<string, number>();
  for (const t of templates) {
    for (const v of new Set(field(t))) {
      counts.set(v, (counts.get(v) || 0) + 1);
    }
  }
  const values = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([value, count]) => ({ value, displayValue: display(value), count }));
  return { type, values };
}

/**
 * Derive facet groups (keyed by type) from a reactive template list, plus
 * shared helpers for reading active selection from the store.
 */
export function useFacets(templates: Ref<FacetTemplate[]>) {
  const store = useHubStore();

  const facetsByType = computed<Record<string, Facet>>(() => ({
    model: buildFacet(templates.value, 'model'),
    tag: buildFacet(templates.value, 'tag'),
  }));

  function isBadgeActive(type: FilterBadge['type'], value: string): boolean {
    return store.filterBadges.value.some((b) => b.type === type && b.value === value);
  }

  function activeCountForType(type: FilterBadge['type']): number {
    return store.filterBadges.value.filter((b) => b.type === type).length;
  }

  return { facetsByType, isBadgeActive, activeCountForType };
}
