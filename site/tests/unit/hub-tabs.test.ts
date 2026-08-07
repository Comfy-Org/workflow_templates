import { beforeEach, describe, expect, it } from 'vitest';
import { ref } from 'vue';
import { templatesInTab, type TabbableTemplate } from '../../src/lib/hub-tabs';
import { useFacets, type FacetTemplate } from '../../src/composables/useFacets';
import { useHubStore } from '../../src/composables/useHubStore';

/**
 * The hub tab is a scope, so the filter facet counts have to be derived from the
 * templates inside the active tab. Counting the whole catalogue advertised
 * totals the tab could never return: on Comfy Apps, "Wan 37" rendered an empty
 * grid because none of those 37 templates are apps.
 */

interface T extends FacetTemplate {
  name: string;
  isApp?: boolean;
}

function catalog(): T[] {
  return [
    { name: 'app-a', isApp: true, models: ['Nano Banana Pro'], tags: ['Image Edit'] },
    { name: 'app-b', isApp: true, models: ['Nano Banana Pro'], tags: ['Image Edit'] },
    { name: 'graph-a', isApp: false, models: ['Wan'], tags: ['Video'] },
    { name: 'graph-b', isApp: false, models: ['Wan'], tags: ['Video'] },
    { name: 'graph-c', isApp: false, models: ['Wan'], tags: ['Video'] },
  ];
}

describe('templatesInTab', () => {
  it('returns everything on the all tab', () => {
    expect(templatesInTab(catalog(), 'all')).toHaveLength(5);
  });

  it('returns only apps on comfyApps', () => {
    expect(templatesInTab(catalog(), 'comfyApps').map((t) => t.name)).toEqual(['app-a', 'app-b']);
  });

  it('returns only node graphs on nodeGraphs', () => {
    expect(templatesInTab(catalog(), 'nodeGraphs').map((t) => t.name)).toEqual([
      'graph-a',
      'graph-b',
      'graph-c',
    ]);
  });

  it('treats a missing isApp as a node graph', () => {
    const partial: TabbableTemplate[] = [{}];
    expect(templatesInTab(partial, 'comfyApps')).toEqual([]);
    expect(templatesInTab(partial, 'nodeGraphs')).toHaveLength(1);
  });
});

describe('facet counts scoped to the active tab', () => {
  beforeEach(() => {
    useHubStore().clearBadges();
  });

  it('counts the whole catalogue on the all tab', () => {
    const { facetsByType } = useFacets(ref(templatesInTab(catalog(), 'all')));
    const models = facetsByType.value.model.values;
    expect(models.find((v) => v.value === 'Wan')?.count).toBe(3);
    expect(models.find((v) => v.value === 'Nano Banana Pro')?.count).toBe(2);
  });

  // The reported bug: this used to report Wan 3 on a tab holding only apps.
  it('drops a model with no apps from the comfyApps tab entirely', () => {
    const { facetsByType } = useFacets(ref(templatesInTab(catalog(), 'comfyApps')));
    const models = facetsByType.value.model.values;
    expect(models.find((v) => v.value === 'Wan')).toBeUndefined();
    expect(models.find((v) => v.value === 'Nano Banana Pro')?.count).toBe(2);
  });

  it('scopes category counts the same way', () => {
    const { facetsByType } = useFacets(ref(templatesInTab(catalog(), 'comfyApps')));
    const tags = facetsByType.value.tag.values;
    expect(tags.find((v) => v.value === 'Video')).toBeUndefined();
    expect(tags.find((v) => v.value === 'Image Edit')?.count).toBe(2);
  });

  it('never advertises a count the tab cannot return', () => {
    for (const tab of ['all', 'nodeGraphs', 'comfyApps'] as const) {
      const scoped = templatesInTab(catalog(), tab);
      const { facetsByType } = useFacets(ref(scoped));
      for (const group of [facetsByType.value.model, facetsByType.value.tag]) {
        for (const v of group.values) {
          expect(v.count).toBeGreaterThan(0);
          expect(v.count).toBeLessThanOrEqual(scoped.length);
        }
      }
    }
  });
});
