<script setup lang="ts">
/**
 * WorkflowGrid - Shared grid with tab bar, sort toggle, and paginated card grid.
 * Accepts pre-filtered templates and handles tabs, sorting, and display internally.
 * Used by both HubBrowse (hub page) and [username].astro (profile page).
 */
import { ref, computed, watch, onMounted } from 'vue';
import { Button } from '@/components/ui/button';
import HubWorkflowCard from './HubWorkflowCard.vue';
import BrowseToolbar from './BrowseToolbar.vue';
import { useHubStore } from '@/composables/useHubStore';
import { loadCatalog } from '@/lib/catalog';
import type { FacetGroupConfig, ToolbarLabels } from '@/lib/toolbar';

export type HubThumbnailVariant = 'compareSlider' | 'hoverDissolve' | 'zoomHover' | 'hoverZoom';

export interface WorkflowTemplate {
  name: string;
  title: string;
  shareId?: string;
  tags: string[];
  models: string[];
  logos: { provider: string | string[] }[];
  usage: number;
  date: string;
  thumbnails: string[];
  username?: string;
  creatorDisplayName?: string;
  creatorAvatarUrl?: string;
  isApp?: boolean;
  thumbnailVariant?: HubThumbnailVariant;
  mediaType?: string;
  mediaSubtype?: string;
}

const props = withDefaults(
  defineProps<{
    templates: WorkflowTemplate[];
    locale: string;
    /** Additional grid classes to override default column layout */
    gridClass?: string;
    /**
     * Toolbar labels. When provided, the grid renders the shared BrowseToolbar
     * (tabs + sort, plus filter when `facetsConfig` is set). Omit to render the
     * grid with no toolbar.
     */
    toolbarLabels?: ToolbarLabels;
    /** Filter facet groups for the toolbar; omit for tabs + sort only. */
    facetsConfig?: FacetGroupConfig[];
    /**
     * Template set the filter facet counts are derived from. Defaults to
     * `templates`; pass the pre-filter set when the parent already narrows
     * `templates` by the active badges (so counts stay stable while filtering).
     */
    facetTemplates?: WorkflowTemplate[];
    /**
     * When true, `templates` is only the embedded first-page slice (for instant
     * paint); the full catalog is lazy-loaded from grid.json on mount and swapped
     * in. Used by the detail "View all workflows" grid so pages don't embed the
     * whole catalog. Omit for pages that already pass a bounded subset.
     */
    lazyFull?: boolean;
    /** With `lazyFull`, exclude this workflow `name` from the fetched catalog. */
    excludeName?: string;
    /**
     * Share ids to keep at the top of the grid in this order, ahead of the
     * usage/date sort — curated picks (use-case page pins) often have no click
     * history, so sorting alone buries them.
     */
    pinnedShareIds?: string[];
  }>(),
  {
    gridClass: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    toolbarLabels: undefined,
    facetsConfig: undefined,
    facetTemplates: undefined,
    lazyFull: false,
    excludeName: undefined,
    pinnedShareIds: () => [],
  }
);

// Working set: starts as the passed `templates` (embedded slice or full subset),
// then, when `lazyFull`, is replaced by the full catalog once it loads.
const workingSet = ref<WorkflowTemplate[]>([...props.templates]);

onMounted(() => {
  if (!props.lazyFull) return;
  // Locale-scoped: the embedded slice is already translated, so swapping in the
  // English catalog would revert the cards in front of the reader.
  loadCatalog(props.locale)
    .then((catalog) => {
      workingSet.value = props.excludeName
        ? catalog.filter((t) => t.name !== props.excludeName)
        : catalog;
    })
    .catch((err) => {
      // Keep the embedded slice on failure — the grid stays usable.
      console.error('Failed to load full catalog for grid:', err);
    });
});

// Keep the working set in sync if the parent swaps `templates` (non-lazy pages).
watch(
  () => props.templates,
  (next) => {
    if (!props.lazyFull) workingSet.value = [...next];
  }
);

const facetSource = computed(() => props.facetTemplates ?? workingSet.value);

const store = useHubStore();
const displayCount = ref(30);

// Reset pagination when the inputs that change the result set change.
watch([workingSet, store.activeTab, store.sortBy], () => {
  displayCount.value = 30;
});

const tabbedTemplates = computed(() => {
  if (store.activeTab.value === 'comfyApps') return workingSet.value.filter((t) => t.isApp);
  if (store.activeTab.value === 'nodeGraphs') return workingSet.value.filter((t) => !t.isApp);
  return workingSet.value;
});

const sortedTemplates = computed(() => {
  const result = [...tabbedTemplates.value];

  if (store.sortBy.value === 'popular') {
    result.sort((a, b) => b.usage - a.usage);
  } else {
    result.sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }

  if (props.pinnedShareIds.length === 0) return result;
  const pinRank = new Map(props.pinnedShareIds.map((id, index) => [id, index]));
  const pinned = result
    .filter((t) => t.shareId && pinRank.has(t.shareId))
    .sort((a, b) => pinRank.get(a.shareId!)! - pinRank.get(b.shareId!)!);
  const rest = result.filter((t) => !t.shareId || !pinRank.has(t.shareId));
  return [...pinned, ...rest];
});

const displayedTemplates = computed(() => sortedTemplates.value.slice(0, displayCount.value));
const hasMore = computed(() => displayCount.value < sortedTemplates.value.length);

function loadMore() {
  displayCount.value += 30;
}
</script>

<template>
  <div class="flex-1 w-full min-w-0">
    <div v-if="toolbarLabels" class="bg-page py-4">
      <BrowseToolbar
        :templates="facetSource"
        :facets-config="facetsConfig"
        :labels="toolbarLabels"
      />
    </div>

    <div class="grid gap-5 relative z-10" :class="gridClass">
      <HubWorkflowCard
        v-for="tmpl in displayedTemplates"
        :key="tmpl.name"
        :name="tmpl.name"
        :title="tmpl.title"
        :share-id="tmpl.shareId"
        :tags="tmpl.tags"
        :logos="tmpl.logos"
        :models="tmpl.models"
        :thumbnails="tmpl.thumbnails"
        :locale="locale"
        :username="tmpl.username"
        :creator-display-name="tmpl.creatorDisplayName"
        :creator-avatar-url="tmpl.creatorAvatarUrl"
        :is-app="tmpl.isApp"
        :thumbnail-variant="tmpl.thumbnailVariant"
        :media-type="tmpl.mediaType"
        :media-subtype="tmpl.mediaSubtype"
      />
    </div>

    <div v-if="displayedTemplates.length === 0" class="text-center py-20 text-content-muted">
      <p class="text-lg">No templates match your filters</p>
      <p class="text-sm mt-2">Try removing some filters</p>
    </div>

    <div v-if="hasMore" class="flex justify-center pt-10 pb-4">
      <Button variant="brand-outline" size="nav" class="px-12 uppercase" @click="loadMore">
        <span class="ppformula-text-center-sm">Load more</span>
      </Button>
    </div>

    <div class="text-center text-hub-muted text-sm pb-4 pt-2">
      Showing {{ displayedTemplates.length }} of {{ sortedTemplates.length }} templates
    </div>
  </div>
</template>
