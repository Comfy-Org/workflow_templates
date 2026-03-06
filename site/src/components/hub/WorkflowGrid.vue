<script setup lang="ts">
/**
 * WorkflowGrid - Shared grid with tab bar, sort toggle, and paginated card grid.
 * Accepts pre-filtered templates and handles tabs, sorting, and display internally.
 * Used by both HubBrowse (hub page) and [username].astro (profile page).
 */
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
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
  }
);

const activeTab = ref<'all' | 'nodeGraphs' | 'comfyApps'>('all');
const sortBy = ref<'popular' | 'newest'>('popular');
const displayCount = ref(30);

// Reset pagination when input templates change (e.g. sidebar filters updated)
watch(
  () => props.templates,
  () => {
    displayCount.value = 30;
  }
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

// Mobile popover state
const typePopoverOpen = ref(false);
const sortPopoverOpen = ref(false);

function closeAllPopovers() {
  typePopoverOpen.value = false;
  sortPopoverOpen.value = false;
}

function toggleTypePopover() {
  sortPopoverOpen.value = false;
  typePopoverOpen.value = !typePopoverOpen.value;
}

function toggleSortPopover() {
  typePopoverOpen.value = false;
  sortPopoverOpen.value = !sortPopoverOpen.value;
}

function selectTab(tab: 'all' | 'nodeGraphs' | 'comfyApps') {
  activeTab.value = tab;
  typePopoverOpen.value = false;
}

function selectSort(sort: 'popular' | 'newest') {
  sortBy.value = sort;
  displayCount.value = 30;
  sortPopoverOpen.value = false;
}

const activeTabLabel = computed(() => {
  if (activeTab.value === 'nodeGraphs') return 'Node Graphs';
  if (activeTab.value === 'comfyApps') return 'Comfy Apps';
  return 'All';
});

const activeSortLabel = computed(() => {
  return sortBy.value === 'popular' ? 'Most Popular' : 'Newest';
});

// Close popovers on outside click
function handleOutsideClick(e: MouseEvent) {
  const target = e.target as HTMLElement;
  if (!target.closest('[data-mobile-popover]')) {
    closeAllPopovers();
  }
}

onMounted(() => {
  document.addEventListener('click', handleOutsideClick);
});

onUnmounted(() => {
  document.removeEventListener('click', handleOutsideClick);
});
</script>

<template>
  <div class="flex-1 w-full min-w-0">
    <!-- Mobile Tabs + Sort bar (popover pills) -->
    <div
      class="flex lg:hidden items-center gap-2 py-8"
      :class="stickyToolbar ? 'sticky top-16 bg-page z-40' : ''"
    >
      <!-- Type popover -->
      <div class="relative" data-mobile-popover>
        <Button
          :variant="activeTab !== 'all' ? 'pill-active' : 'pill'"
          size="pill-icon"
          @click="toggleTypePopover"
          class="flex items-center"
        >
          <svg class="size-4" fill="none" stroke="currentColor" aria-hidden="true">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M3 4h18M3 8h18M3 12h18"
            />
          </svg>
          {{ activeTabLabel }}
          <svg
            class="size-3 transition-transform"
            :class="typePopoverOpen ? 'rotate-180' : ''"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </Button>

        <!-- Dropdown -->
        <div
          v-if="typePopoverOpen"
          class="absolute top-full left-0 mt-2 w-44 rounded-xl bg-hub-surface border border-white/10 shadow-xl z-50 overflow-hidden"
        >
          <button
            type="button"
            class="flex items-center gap-2 w-full px-4 py-2.5 text-xs text-left transition-colors"
            :class="
              activeTab === 'all'
                ? 'text-white font-bold bg-white/10'
                : 'text-white/70 hover:text-white hover:bg-white/5'
            "
            @click="selectTab('all')"
          >
            All
          </button>
          <button
            type="button"
            class="flex items-center gap-2 w-full px-4 py-2.5 text-xs text-left transition-colors"
            :class="
              activeTab === 'nodeGraphs'
                ? 'text-white font-bold bg-white/10'
                : 'text-white/70 hover:text-white hover:bg-white/5'
            "
            @click="selectTab('nodeGraphs')"
          >
            <IconWorkflow class="size-4" />
            Node Graphs
          </button>
          <button
            type="button"
            class="flex items-center gap-2 w-full px-4 py-2.5 text-xs text-left transition-colors"
            :class="
              activeTab === 'comfyApps'
                ? 'text-white font-bold bg-white/10'
                : 'text-white/70 hover:text-white hover:bg-white/5'
            "
            @click="selectTab('comfyApps')"
          >
            <IconApps class="size-4" />
            Comfy Apps
          </button>
        </div>
      </div>

      <!-- Sort popover -->
      <div class="relative" data-mobile-popover>
        <Button variant="pill" size="pill-icon" @click="toggleSortPopover">
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
          {{ activeSortLabel }}
          <svg
            class="size-3 transition-transform"
            :class="sortPopoverOpen ? 'rotate-180' : ''"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </Button>

        <!-- Dropdown -->
        <div
          v-if="sortPopoverOpen"
          class="absolute top-full left-0 mt-2 w-40 rounded-xl bg-hub-surface border border-white/10 shadow-xl z-50 overflow-hidden"
        >
          <button
            type="button"
            class="flex items-center gap-2 w-full px-4 py-2.5 text-xs text-left transition-colors"
            :class="
              sortBy === 'popular'
                ? 'text-white font-bold bg-white/10'
                : 'text-white/70 hover:text-white hover:bg-white/5'
            "
            @click="selectSort('popular')"
          >
            Most Popular
          </button>
          <button
            type="button"
            class="flex items-center gap-2 w-full px-4 py-2.5 text-xs text-left transition-colors"
            :class="
              sortBy === 'newest'
                ? 'text-white font-bold bg-white/10'
                : 'text-white/70 hover:text-white hover:bg-white/5'
            "
            @click="selectSort('newest')"
          >
            Newest
          </button>
        </div>
      </div>
    </div>

    <!-- Desktop Tabs + Sort bar -->
    <div
      class="hidden lg:flex items-center justify-between py-8"
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
      <p class="text-lg">
        {{
          activeTab === 'comfyApps' ? 'Comfy Apps coming soon' : 'No templates match your filters'
        }}
      </p>
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
