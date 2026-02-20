<script setup lang="ts">
/**
 * HubBrowse - Main interactive Vue island for the hub page.
 * Matches Figma: pill tabs, vertical sidebar filters, 3-column grid.
 */
import { ref, computed } from 'vue';
import { Button } from '@/components/ui/button';
import { IconApps, IconWorkflow } from '@/components/ui/icons';
import HubWorkflowCard from './HubWorkflowCard.vue';

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
}

const props = defineProps<{
  templates: SerializedTemplate[];
  locale: string;
  mediaTypes: string[];
}>();

// Reactive state
const activeTab = ref<'all' | 'nodeGraphs' | 'comfyApps'>('all');
const activeMediaFilters = ref<string[]>([]);
const activeTagFilters = ref<string[]>([]);
const activeModelFilters = ref<string[]>([]);
const sortBy = ref<'popular' | 'newest'>('popular');
const displayCount = ref(30);
const showAllModels = ref(false);

// Curated sidebar tags (from Figma)
const CURATED_TAGS = ['Inpainting', 'Upscaling', 'Utility'];

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
    .map(([name]) => name);
});

const visibleModels = computed(() =>
  showAllModels.value ? topModels.value : topModels.value.slice(0, 3)
);

// Toggle helpers
function toggleMediaFilter(type: string) {
  const idx = activeMediaFilters.value.indexOf(type);
  if (idx >= 0) activeMediaFilters.value.splice(idx, 1);
  else activeMediaFilters.value.push(type);
  displayCount.value = 30;
}

function toggleTagFilter(tag: string) {
  const idx = activeTagFilters.value.indexOf(tag);
  if (idx >= 0) activeTagFilters.value.splice(idx, 1);
  else activeTagFilters.value.push(tag);
  displayCount.value = 30;
}

function toggleModelFilter(model: string) {
  const idx = activeModelFilters.value.indexOf(model);
  if (idx >= 0) activeModelFilters.value.splice(idx, 1);
  else activeModelFilters.value.push(model);
  displayCount.value = 30;
}

function toggleSort() {
  sortBy.value = sortBy.value === 'popular' ? 'newest' : 'popular';
  displayCount.value = 30;
}

// Filtered and sorted templates
const filteredTemplates = computed(() => {
  let result = [...props.templates];

  if (activeMediaFilters.value.length > 0) {
    result = result.filter((t) => activeMediaFilters.value.includes(t.mediaType));
  }

  if (activeTagFilters.value.length > 0) {
    result = result.filter((t) => activeTagFilters.value.some((tag) => t.tags.includes(tag)));
  }

  if (activeModelFilters.value.length > 0) {
    result = result.filter((t) =>
      activeModelFilters.value.some((model) => t.models.includes(model))
    );
  }

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

const displayedTemplates = computed(() => filteredTemplates.value.slice(0, displayCount.value));

const hasMore = computed(() => displayCount.value < filteredTemplates.value.length);

function loadMore() {
  displayCount.value += 30;
}

const mediaTypeLabels: Record<string, string> = {
  image: 'Image',
  video: 'Video',
  audio: 'Audio',
  '3d': '3D',
};
</script>

<template>
  <div>
    <!-- Sidebar + Grid -->
    <div class="flex items-start justify-between mt-14 gap-16">
      <!-- Sidebar -->
      <aside
        class="hidden lg:flex flex-col gap-12 shrink-0 sticky top-16 bg-page pt-28"
        style="width: var(--hub-sidebar-width)"
      >
        <!-- Top Creators link -->
        <div class="">
          <a href="#creators">
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

        <!-- FILTERS section -->
        <div class="flex flex-col gap-4">
          <p class="text-hub-muted text-xs font-semibold uppercase">FILTERS</p>
          <div class="flex flex-col gap-4">
            <Button
              v-for="type in mediaTypes"
              :key="type"
              :variant="activeMediaFilters.includes(type) ? 'pill-active' : 'pill'"
              size="pill"
              class="w-fit"
              @click="toggleMediaFilter(type)"
            >
              {{ mediaTypeLabels[type] || type }}
            </Button>
            <Button
              v-for="tag in CURATED_TAGS"
              :key="tag"
              :variant="activeTagFilters.includes(tag) ? 'pill-active' : 'pill'"
              size="pill"
              class="w-fit"
              @click="toggleTagFilter(tag)"
            >
              {{ tag }}
            </Button>
          </div>
        </div>

        <!-- MODELS section -->
        <div class="flex flex-col gap-4">
          <p class="text-hub-muted text-xs font-semibold uppercase">MODELS</p>
          <div class="flex flex-col gap-4">
            <Button
              v-for="model in visibleModels"
              :key="model"
              :variant="activeModelFilters.includes(model) ? 'pill-active' : 'pill'"
              size="pill"
              class="w-fit"
              @click="toggleModelFilter(model)"
            >
              {{ model }}
            </Button>
            <button
              v-if="!showAllModels && topModels.length > 3"
              class="text-hub-muted text-sm font-normal text-left hover:text-white/60 transition-colors"
              @click="showAllModels = true"
            >
              Show more...
            </button>
          </div>
        </div>
      </aside>

      <!-- Grid -->
      <div class="flex-1 w-full ">
        <!-- Tabs + Sort bar -->
        <div class="flex items-center justify-between pb-8 sticky top-16 bg-page z-50 pt-12">
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
              Node Graph
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
          <Button variant="pill" size="pill" @click="toggleSort">
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
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 relative z-10">
          <HubWorkflowCard
            v-for="tmpl in displayedTemplates"
            :key="tmpl.name"
            :name="tmpl.name"
            :title="tmpl.title"
            :tags="tmpl.tags"
            :logos="tmpl.logos"
            :thumbnails="tmpl.thumbnails"
            :locale="locale"
          />
        </div>

        <!-- Empty state -->
        <div v-if="displayedTemplates.length === 0" class="text-center py-20 text-white/40">
          <p class="text-lg">No templates match your filters</p>
          <p class="text-sm mt-2">Try removing some filters</p>
        </div>

        <!-- Load more -->
        <div v-if="hasMore" class="flex justify-center pt-10 pb-4">
          <Button variant="pill" size="pill" @click="loadMore"> Load more </Button>
        </div>

        <!-- Count indicator -->
        <div class="text-center text-hub-muted text-sm pb-4 pt-2">
          Showing {{ displayedTemplates.length }} of {{ filteredTemplates.length }} templates
        </div>
      </div>
    </div>
  </div>
</template>
