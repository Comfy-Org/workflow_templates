<script setup lang="ts">
/**
 * HubBrowse - Main interactive Vue island for the hub page.
 * Owns sidebar filters (media type, tags, models) and delegates
 * tab/sort/grid rendering to WorkflowGrid.
 */
import { ref, computed } from 'vue';
import { Button } from '@/components/ui/button';
import WorkflowGrid from './WorkflowGrid.vue';

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
  creatorDisplayName: string;
}

const props = defineProps<{
  templates: SerializedTemplate[];
  locale: string;
  mediaTypes: string[];
}>();

// Sidebar filter state
const activeMediaFilters = ref<string[]>([]);
const activeTagFilters = ref<string[]>([]);
const activeModelFilters = ref<string[]>([]);
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
}

function toggleTagFilter(tag: string) {
  const idx = activeTagFilters.value.indexOf(tag);
  if (idx >= 0) activeTagFilters.value.splice(idx, 1);
  else activeTagFilters.value.push(tag);
}

function toggleModelFilter(model: string) {
  const idx = activeModelFilters.value.indexOf(model);
  if (idx >= 0) activeModelFilters.value.splice(idx, 1);
  else activeModelFilters.value.push(model);
}

// Filtered templates (sorting handled by WorkflowGrid)
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

  return result;
});

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
    <div class="flex items-start justify-between gap-16">
      <!-- Sidebar -->
      <aside
        class="hidden lg:flex flex-col gap-12 shrink-0 sticky top-16 bg-page pt-24"
        style="width: var(--hub-sidebar-width)"
      >
        <!-- Top Creators link -->
        <div class="">
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

      <!-- Grid (delegated to WorkflowGrid) -->
      <WorkflowGrid
        :templates="filteredTemplates"
        :locale="locale"
        grid-class="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        :sticky-toolbar="true"
      />
    </div>
  </div>
</template>
