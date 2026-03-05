<script setup lang="ts">
/**
 * WorkflowGrid - Shared grid with tab bar, sort toggle, and paginated card grid.
 * Accepts pre-filtered templates and handles tabs, sorting, and display internally.
 * Used by both HubBrowse (hub page) and [username].astro (profile page).
 */
import { ref, computed, watch } from 'vue';
import { Button } from '@/components/ui/button';
import { IconApps, IconWorkflow } from '@/components/ui/icons';
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
    /** Make the toolbar sticky (used on hub page inside scroll context) */
    stickyToolbar?: boolean;
    /** Hide author line on cards (useful on creator profile pages) */
    hideAuthor?: boolean;
  }>(),
  {
    gridClass: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
    stickyToolbar: false,
    hideAuthor: false,
  },
);

const activeTab = ref<'all' | 'nodeGraphs' | 'comfyApps'>('all');
const sortBy = ref<'popular' | 'newest'>('popular');
const displayCount = ref(30);

// Reset pagination when input templates change (e.g. sidebar filters updated)
watch(
  () => props.templates,
  () => {
    displayCount.value = 30;
  },
);

function toggleSort() {
  sortBy.value = sortBy.value === 'popular' ? 'newest' : 'popular';
  displayCount.value = 30;
}

const tabbedTemplates = computed(() => {
  if (activeTab.value === 'comfyApps') return [];
  return props.templates;
});

const sortedTemplates = computed(() => {
  const result = [...tabbedTemplates.value];

  if (sortBy.value === 'popular') {
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
    <!-- Tabs + Sort bar -->
    <div
      class="flex items-center justify-between py-8"
      :class="stickyToolbar ? 'sticky top-16 bg-page z-40' : ''"
    >
      <!-- Tab pills -->
      <div class="flex items-center gap-2">
        <Button
          :variant="activeTab === 'all' ? 'pill-active' : 'pill'"
          size="pill"
          @click="activeTab = 'all'"
        >
          All
        </Button>
        <Button
          :variant="activeTab === 'nodeGraphs' ? 'pill-active' : 'pill'"
          size="pill-icon"
          @click="activeTab = 'nodeGraphs'"
        >
          <IconWorkflow />
          Node Graphs
        </Button>
        <Button
          :variant="activeTab === 'comfyApps' ? 'pill-active' : 'pill'"
          size="pill-icon"
          @click="activeTab = 'comfyApps'"
        >
          <IconApps />
          Comfy Apps
        </Button>
      </div>

      <!-- Sort button -->
      <Button variant="pill" size="pill-icon" @click="toggleSort">
        <svg
          class="size-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
          />
        </svg>
        {{ sortBy === 'popular' ? 'Most Popular' : 'Newest' }}
      </Button>
    </div>

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
        :hide-author="hideAuthor"
      />
    </div>

    <!-- Empty state -->
    <div v-if="displayedTemplates.length === 0" class="text-center py-20 text-white/40">
      <p class="text-lg">{{ activeTab === 'comfyApps' ? 'Comfy Apps coming soon' : 'No templates match your filters' }}</p>
      <p v-if="activeTab !== 'comfyApps'" class="text-sm mt-2">Try removing some filters</p>
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
