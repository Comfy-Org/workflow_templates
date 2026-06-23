<script setup lang="ts">
/**
 * HubBrowse - Main interactive Vue island for the hub page.
 * Owns the browse toolbar (tabs + filter + sort) and delegates the
 * grid rendering to WorkflowGrid.
 *
 * Filter/tab/sort state is shared via useHubStore so that the toolbar,
 * the navbar SearchPopover, and the grid stay in sync.
 */
import { computed } from 'vue';
import WorkflowGrid from './WorkflowGrid.vue';
import { useHubStore } from '@/composables/useHubStore';
import type { MediaType, ThumbnailVariant } from '@/lib/hub-api';
import type { FacetGroupConfig, ToolbarLabels } from '@/lib/toolbar';

export interface SerializedTemplate {
  name: string;
  title: string;
  description: string;
  mediaType: MediaType;
  tags: string[];
  models: string[];
  logos: { provider: string | string[] }[];
  usage: number;
  date: string;
  thumbnails: string[];
  username: string;
  creatorDisplayName: string;
  isApp: boolean;
  thumbnailVariant?: ThumbnailVariant;
  mediaSubtype?: string;
}

const props = defineProps<{
  templates: SerializedTemplate[];
  locale: string;
  mediaTypes: string[];
  facetsConfig: FacetGroupConfig[];
  toolbarLabels: ToolbarLabels;
}>();

const store = useHubStore();

// Filtered templates using shared store badges (sorting handled by WorkflowGrid)
const filteredTemplates = computed(() => {
  const badges = store.filterBadges.value;
  if (badges.length === 0) return props.templates;

  const tagBadges = badges.filter((b) => b.type === 'tag').map((b) => b.value);
  const modelBadges = badges.filter((b) => b.type === 'model').map((b) => b.value);
  const modeBadges = badges.filter((b) => b.type === 'mode').map((b) => b.value);

  let result = [...props.templates];

  if (tagBadges.length > 0) {
    result = result.filter((t) => tagBadges.some((tag) => t.tags.includes(tag)));
  }

  if (modelBadges.length > 0) {
    result = result.filter((t) => modelBadges.some((model) => t.models.includes(model)));
  }

  if (modeBadges.length > 0) {
    result = result.filter((t) => {
      if (modeBadges.includes('app')) return t.isApp;
      if (modeBadges.includes('nodeGraph')) return !t.isApp;
      return true;
    });
  }

  return result;
});
</script>

<template>
  <div class="pb-32">
    <!-- WorkflowGrid mounts the shared toolbar (tabs + filter + sort). It renders
         the badge-filtered set, but facet counts read the full `templates` so
         they stay stable as filters are applied. -->
    <WorkflowGrid
      :templates="filteredTemplates"
      :facet-templates="templates"
      :facets-config="facetsConfig"
      :toolbar-labels="toolbarLabels"
      :locale="locale"
      grid-class="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
    />
  </div>
</template>
