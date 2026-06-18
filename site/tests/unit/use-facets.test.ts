import { beforeEach, describe, expect, it } from 'vitest';
import { ref } from 'vue';
import { useFacets, type FacetTemplate } from '../../src/composables/useFacets';
import { useHubStore } from '../../src/composables/useHubStore';

/**
 * useFacets derives the full model/tag facet lists (with counts, ranked by
 * template count) from a template list, and exposes active-state helpers that
 * read the shared useHubStore badges. The store is a module-level singleton, so
 * each test clears it first.
 */

function makeTemplates(): FacetTemplate[] {
  return [
    { models: ['Flux', 'SDXL'], tags: ['API', 'image', 'image'] },
    { models: ['Flux'], tags: ['image', 'video'] },
    { models: ['Flux', 'Wan'], tags: ['image'] },
    { models: ['SDXL'], tags: ['video'] },
  ];
}

beforeEach(() => {
  useHubStore().clearBadges();
});

describe('useFacets — facetsByType', () => {
  it('ranks models by template count, descending', () => {
    const { facetsByType } = useFacets(ref(makeTemplates()));
    const models = facetsByType.value.model.values;
    expect(models.map((v) => v.value)).toEqual(['Flux', 'SDXL', 'Wan']);
    expect(models.map((v) => v.count)).toEqual([3, 2, 1]);
  });

  it('ranks tags by template count and counts each template once per tag', () => {
    const { facetsByType } = useFacets(ref(makeTemplates()));
    const tags = facetsByType.value.tag.values;
    expect(tags.find((v) => v.value === 'image')?.count).toBe(3);
    expect(tags.find((v) => v.value === 'video')?.count).toBe(2);
    expect(tags.find((v) => v.value === 'API')?.count).toBe(1);
  });

  it('applies tag display aliases (API → Partner Nodes) without changing the value', () => {
    const { facetsByType } = useFacets(ref(makeTemplates()));
    const api = facetsByType.value.tag.values.find((v) => v.value === 'API');
    expect(api?.displayValue).toBe('Partner Nodes');
    // models have no alias map → displayValue equals value
    const flux = facetsByType.value.model.values.find((v) => v.value === 'Flux');
    expect(flux?.displayValue).toBe('Flux');
  });

  it('is reactive — recomputes when the template list changes', () => {
    const templates = ref<FacetTemplate[]>([{ models: ['Flux'], tags: ['image'] }]);
    const { facetsByType } = useFacets(templates);
    expect(facetsByType.value.model.values).toHaveLength(1);

    templates.value = [...templates.value, { models: ['SDXL'], tags: ['video'] }];
    expect(facetsByType.value.model.values.map((v) => v.value)).toEqual(['Flux', 'SDXL']);
  });

  it('returns empty value lists for an empty template set', () => {
    const { facetsByType } = useFacets(ref([]));
    expect(facetsByType.value.model.values).toEqual([]);
    expect(facetsByType.value.tag.values).toEqual([]);
  });
});

describe('useFacets — active-state helpers', () => {
  it('isBadgeActive reflects store badges by type + value', () => {
    const store = useHubStore();
    const { isBadgeActive } = useFacets(ref(makeTemplates()));

    expect(isBadgeActive('model', 'Flux')).toBe(false);
    store.toggleBadge({ type: 'model', value: 'Flux' });
    expect(isBadgeActive('model', 'Flux')).toBe(true);
    // same value, different type is independent
    expect(isBadgeActive('tag', 'Flux')).toBe(false);
  });

  it('activeCountForType counts only badges of that type', () => {
    const store = useHubStore();
    const { activeCountForType } = useFacets(ref(makeTemplates()));

    store.toggleBadge({ type: 'model', value: 'Flux' });
    store.toggleBadge({ type: 'model', value: 'SDXL' });
    store.toggleBadge({ type: 'tag', value: 'image' });

    expect(activeCountForType('model')).toBe(2);
    expect(activeCountForType('tag')).toBe(1);
    expect(activeCountForType('mode')).toBe(0);
  });
});
