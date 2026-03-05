<script setup lang="ts">
/**
 * HubBrowse - Main interactive Vue island for the hub page.
 * Owns sidebar filters (media type, tags, models) and delegates
 * tab/sort/grid rendering to WorkflowGrid.
 * Includes a mobile filter drawer overlay.
 *
 * Filter state is shared via useHubStore (filterBadges) so that
 * SearchPopover and HubBrowse sidebar stay in sync.
 */
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { Button } from '@/components/ui/button';
import WorkflowGrid from './WorkflowGrid.vue';
import { useHubStore } from '@/composables/useHubStore';

export interface SerializedTemplate {
  name: string;
  title: string;
  description: string;
  mediaType: 'image' | 'video' | 'audio' | '3d';
  tags: string[];
  models: string[];
  logos: { provider: string | string[] }[];
  usage: number;
  date: string;
  thumbnails: string[];
  username: string;
  creatorDisplayName: string;
}

const props = defineProps<{
  templates: SerializedTemplate[];
  locale: string;
  mediaTypes: string[];
}>();

const store = useHubStore();
const { mobileDrawerOpen } = store;

// Sidebar state
const sortBy = ref<'popular' | 'newest'>('popular');

// Data-driven top tags (by template count)
const topTags = computed(() => {
  const counts = new Map<string, number>();
  for (const t of props.templates) {
    for (const tag of t.tags) {
      counts.set(tag, (counts.get(tag) || 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name]) => name);
});

// Derive top models from template data
const topModels = computed(() => {
  const counts = new Map<string, number>();
  for (const t of props.templates) {
    for (const m of t.models) {
      counts.set(m, (counts.get(m) || 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name]) => name);
});

// Toggle helpers using shared store badges
function toggleTagFilter(tag: string) {
  store.toggleBadge({ type: 'tag', value: tag });
}

function toggleModelFilter(model: string) {
  store.toggleBadge({ type: 'model', value: model });
}

function isTagActive(tag: string): boolean {
  return store.filterBadges.value.some((b) => b.type === 'tag' && b.value === tag);
}

function isModelActive(model: string): boolean {
  return store.filterBadges.value.some((b) => b.type === 'model' && b.value === model);
}

function clearAllFilters() {
  store.clearBadges();
  sortBy.value = 'popular';
}

function closeMobileDrawer() {
  store.closeMobileDrawer();
}

// Lock body scroll when drawer is open
function lockBodyScroll(lock: boolean) {
  if (lock) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
}

// Watch drawer state for body scroll lock
watch(mobileDrawerOpen, (open) => {
  lockBodyScroll(open);
});

// Bridge: hamburger lives in Astro's HubNavbar, so we attach directly
const hamburgerEl = () => document.getElementById('mobile-filter-toggle');

onMounted(() => {
  hamburgerEl()?.addEventListener('click', store.toggleMobileDrawer);
});

onUnmounted(() => {
  hamburgerEl()?.removeEventListener('click', store.toggleMobileDrawer);
  lockBodyScroll(false);
});

// Filtered templates using shared store badges (sorting handled by WorkflowGrid)
const filteredTemplates = computed(() => {
  const badges = store.filterBadges.value;
  if (badges.length === 0) return props.templates;

  const tagBadges = badges.filter((b) => b.type === 'tag').map((b) => b.value);
  const modelBadges = badges.filter((b) => b.type === 'model').map((b) => b.value);

  let result = [...props.templates];

  if (tagBadges.length > 0) {
    result = result.filter((t) => tagBadges.some((tag) => t.tags.includes(tag)));
  }

  if (modelBadges.length > 0) {
    result = result.filter((t) => modelBadges.some((model) => t.models.includes(model)));
  }

  return result;
});

const activeFilterCount = computed(() => store.filterBadges.value.length);
</script>

<template>
  <div>
    <!-- Sidebar + Grid -->
    <div class="flex items-start justify-between gap-16 ">
      <!-- Desktop Sidebar -->
      <aside
        class="hidden lg:flex flex-col gap-8 shrink-0 sticky top-24 bg-page max-h-[calc(100vh-6rem)] overflow-y-auto overflow-x-hidden scrollbar-thin"
        style="width: var(--hub-sidebar-width)"
      >
        <!-- Top Creators link -->
        <div>
          <a href="/templates/creators/">
            <Button variant="pill-outline" size="pill" class="w-full justify-center">
              Top Creators
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
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Button>
          </a>
        </div>

        <!-- SORT section -->
        <div class="flex flex-col gap-3">
          <p class="text-hub-muted text-xs font-semibold uppercase">SORT</p>
          <div class="flex flex-col gap-3">
            <Button
              :variant="sortBy === 'popular' ? 'pill-active' : 'pill'"
              size="pill"
              class="w-fit"
              @click="sortBy = 'popular'"
            >
              Most Popular
            </Button>
            <Button
              :variant="sortBy === 'newest' ? 'pill-active' : 'pill'"
              size="pill"
              class="w-fit"
              @click="sortBy = 'newest'"
            >
              Newest
            </Button>
          </div>
        </div>

        <!-- CATEGORIES section -->
        <div class="flex flex-col gap-3">
          <p class="text-hub-muted text-xs font-semibold uppercase">POPULAR CATEGORIES</p>
          <div class="flex flex-col gap-3">
            <Button
              v-for="tag in topTags"
              :key="tag"
              :variant="isTagActive(tag) ? 'pill-active' : 'pill'"
              size="pill"
              class="w-fit"
              @click="toggleTagFilter(tag)"
            >
              {{ tag }}
            </Button>
          </div>
        </div>

        <!-- POPULAR MODELS section -->
        <div class="flex flex-col gap-3">
          <p class="text-hub-muted text-xs font-semibold uppercase">POPULAR MODELS</p>
          <div class="flex flex-col gap-3">
            <Button
              v-for="model in topModels"
              :key="model"
              :variant="isModelActive(model) ? 'pill-active' : 'pill'"
              size="pill"
              class="w-fit"
              @click="toggleModelFilter(model)"
            >
              {{ model }}
            </Button>
          </div>
        </div>
      </aside>

      <!-- Grid (delegated to WorkflowGrid) -->
      <WorkflowGrid
        :templates="filteredTemplates"
        :locale="locale"
        grid-class="grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        :sort-by="sortBy"
      />
    </div>

    <!-- Mobile Filter Drawer Overlay -->
    <div
      class="fixed inset-0 z-50 bg-black/60 lg:hidden transition-opacity duration-300"
      :class="mobileDrawerOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'"
      @click.self="closeMobileDrawer"
    />

    <aside
      class="fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-page flex flex-col lg:hidden transition-transform duration-300"
      :class="mobileDrawerOpen ? 'translate-x-0' : 'translate-x-full'"
    >
      <!-- Drawer Header -->
      <div class="flex items-center justify-between px-5 py-4">
        <span class="text-lg font-semibold text-white">Filter</span>
        <button
          type="button"
          class="flex items-center justify-center size-8 rounded-full text-white/60 hover:text-white hover:bg-white/5 transition-colors"
          aria-label="Close filters"
          @click="closeMobileDrawer"
        >
          <svg class="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="border-t border-white/10" />

      <!-- Drawer Content (scrollable) — mirrors desktop sidebar -->
      <div class="flex-1 overflow-y-auto px-5 py-6 space-y-8">
        <!-- Top Creators link -->
        <div>
          <a href="/templates/creators/">
            <Button variant="pill-outline" size="pill" class="w-full justify-center">
              Top Creators
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
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Button>
          </a>
        </div>

        <!-- SORT section -->
        <div class="flex flex-col gap-3">
          <p class="text-hub-muted text-xs font-semibold uppercase">SORT</p>
          <div class="flex flex-wrap gap-2.5">
            <Button
              :variant="sortBy === 'popular' ? 'pill-active' : 'pill'"
              size="pill"
              class="w-fit"
              @click="sortBy = 'popular'"
            >
              Most Popular
            </Button>
            <Button
              :variant="sortBy === 'newest' ? 'pill-active' : 'pill'"
              size="pill"
              class="w-fit"
              @click="sortBy = 'newest'"
            >
              Newest
            </Button>
          </div>
        </div>

        <!-- CATEGORIES section -->
        <div class="flex flex-col gap-3">
          <p class="text-hub-muted text-xs font-semibold uppercase">POPULAR CATEGORIES</p>
          <div class="flex flex-wrap gap-2.5">
            <Button
              v-for="tag in topTags"
              :key="tag"
              :variant="isTagActive(tag) ? 'pill-active' : 'pill'"
              size="pill"
              class="w-fit"
              @click="toggleTagFilter(tag)"
            >
              {{ tag }}
            </Button>
          </div>
        </div>

        <!-- POPULAR MODELS section -->
        <div class="flex flex-col gap-3">
          <p class="text-hub-muted text-xs font-semibold uppercase">POPULAR MODELS</p>
          <div class="flex flex-wrap gap-2.5">
            <Button
              v-for="model in topModels"
              :key="model"
              :variant="isModelActive(model) ? 'pill-active' : 'pill'"
              size="pill"
              class="w-fit"
              @click="toggleModelFilter(model)"
            >
              {{ model }}
            </Button>
          </div>
        </div>
      </div>

      <!-- Drawer Footer (sticky) -->
      <div class="border-t border-white/10 px-5 py-4 grid grid-cols-2 gap-3">
        <Button
          variant="pill-outline"
          size="lg"
          class="rounded-full"
          @click="clearAllFilters"
        >
          Clear All
        </Button>
        <button
          type="button"
          class="h-10 rounded-full bg-brand text-page text-sm font-bold cursor-pointer hover:brightness-75 active:brightness-50 transition-all"
          @click="closeMobileDrawer"
        >
          Show Results
        </button>
      </div>
    </aside>
  </div>
</template>
