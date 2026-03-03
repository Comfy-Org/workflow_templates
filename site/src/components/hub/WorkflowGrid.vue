<script setup lang="ts">
/**
 * WorkflowGrid - Shared grid with tab bar, sort toggle, and paginated card grid.
 * Accepts pre-filtered templates and handles tabs, sorting, and display internally.
 * Used by both HubBrowse (hub page) and [username].astro (profile page).
 */
import { ref, computed, watch } from 'vue';
import { Button } from '@/components/ui/button';
import HubWorkflowCard from './HubWorkflowCard.vue';

export interface WorkflowTemplate {
  name: string;
  title: string;
  tags: string[];
  logos: { provider: string | string[] }[];
  usage: number;
  date: string;
  thumbnails: string[];
  username?: string;
  creatorDisplayName?: string;
}

const props = withDefaults(
  defineProps<{
    templates: WorkflowTemplate[];
    locale: string;
    /** Additional grid classes to override default column layout */
    gridClass?: string;
    /** Sort mode — controlled by parent (e.g. sidebar) */
    sortBy?: 'popular' | 'newest';
  }>(),
  {
    gridClass: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
    sortBy: 'popular',
  },
);

const displayCount = ref(30);

// Reset pagination when input templates or sort change
watch(
  () => [props.templates, props.sortBy],
  () => {
    displayCount.value = 30;
  },
);

const sortedTemplates = computed(() => {
  const result = [...props.templates];

  if (props.sortBy === 'popular') {
    result.sort((a, b) => b.usage - a.usage);
  } else {
    result.sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }

  return result;
});

const displayedTemplates = computed(() => sortedTemplates.value.slice(0, displayCount.value));
const hasMore = computed(() => displayCount.value < sortedTemplates.value.length);

function loadMore() {
  displayCount.value += 30;
}
</script>

<template>
  <div class="flex-1 w-full min-w-0">
    <!-- Card grid -->
    <div class="grid gap-5 relative z-10" :class="gridClass">
      <HubWorkflowCard
        v-for="tmpl in displayedTemplates"
        :key="tmpl.name"
        :name="tmpl.name"
        :title="tmpl.title"
        :tags="tmpl.tags"
        :logos="tmpl.logos"
        :thumbnails="tmpl.thumbnails"
        :locale="locale"
        :username="tmpl.username"
        :creator-display-name="tmpl.creatorDisplayName"
      />
    </div>

    <!-- Empty state -->
    <div v-if="displayedTemplates.length === 0" class="text-center py-20 text-white/40">
      <p class="text-lg">No templates match your filters</p>
      <p class="text-sm mt-2">Try removing some filters</p>
    </div>

    <!-- Load more -->
    <div v-if="hasMore" class="flex justify-center pt-10 pb-4">
      <Button variant="pill" size="pill" @click="loadMore">Load more</Button>
    </div>

    <!-- Count indicator -->
    <div class="text-center text-hub-muted text-sm pb-4 pt-2">
      Showing {{ displayedTemplates.length }} of {{ sortedTemplates.length }} templates
    </div>
  </div>
</template>
