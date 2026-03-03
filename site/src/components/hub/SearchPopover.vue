<script setup lang="ts">
/**
 * SearchPopover — Full-width search bar with discovery popover.
 * Shows popular workflows, top creators, filter-by-type tags, and popular models
 * when the search input is focused (initial state, before typing).
 */
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useHubStore } from '@/composables/useHubStore'

export interface SearchTemplate {
  name: string
  title: string
  description: string
  mediaType: 'image' | 'video' | 'audio' | '3d'
  tags: string[]
  models: string[]
  logos: { provider: string | string[] }[]
  usage: number
  date: string
  thumbnails: string[]
  username: string
  creatorDisplayName: string
}

const props = defineProps<{
  templates: SearchTemplate[]
  locale: string
}>()

const store = useHubStore()

const isOpen = ref(false)
const searchQuery = ref('')
const containerRef = ref<HTMLElement | null>(null)
const inputRef = ref<HTMLInputElement | null>(null)

// React to search focus requests from other components (e.g. HubBrowse sidebar)
watch(() => store.searchFocusTrigger.value, () => {
  isOpen.value = true
  inputRef.value?.focus()
})

// Popular workflows — top 4 by usage
const popularWorkflows = computed(() =>
  [...props.templates]
    .sort((a, b) => b.usage - a.usage)
    .slice(0, 4)
)

// Top creators — unique creators sorted by total usage, top 3
const topCreators = computed(() => {
  const creatorUsage = new Map<string, number>()
  for (const tmpl of props.templates) {
    const name = tmpl.creatorDisplayName || 'ComfyUI'
    creatorUsage.set(name, (creatorUsage.get(name) || 0) + tmpl.usage)
  }
  return Array.from(creatorUsage.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name]) => name)
})

// Popular models — top 10 by template count
const popularModels = computed(() => {
  const counts = new Map<string, number>()
  for (const tmpl of props.templates) {
    for (const m of tmpl.models) {
      counts.set(m, (counts.get(m) || 0) + 1)
    }
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name]) => name)
})

// Curated filter-by-type tags
const FILTER_TYPES = [
  'Image', 'Video', 'Audio', '3D',
  'Inpainting', 'Upscaling', 'Utility', 'Text-to-Image',
  'Image-to-Video', 'LoRA', 'ControlNet', 'Animation',
]

// Creator color palette
const CREATOR_COLORS = ['#c8ff00', '#ff4444', '#ff4444']

function getCreatorColor(index: number): string {
  return CREATOR_COLORS[index % CREATOR_COLORS.length]
}

function formatUsage(usage: number): string {
  if (usage >= 1000) {
    return `${(usage / 1000).toFixed(1).replace(/\.0$/, '')}K`
  }
  return String(usage)
}

function getPrimaryThumb(thumbnails: string[]): string | null {
  return thumbnails.length > 0 ? `/templates/thumbnails/${thumbnails[0]}` : null
}

function handleFocus() {
  isOpen.value = true
}

function handleClickOutside(e: MouseEvent) {
  if (containerRef.value && !containerRef.value.contains(e.target as Node)) {
    isOpen.value = false
  }
}

function handleEscape(e: KeyboardEvent) {
  if (e.key === 'Escape' && isOpen.value) {
    isOpen.value = false
    inputRef.value?.blur()
  }
}

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside)
  document.addEventListener('keydown', handleEscape)
})

onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutside)
  document.removeEventListener('keydown', handleEscape)
})
</script>

<template>
  <div ref="containerRef" class="flex-1">
    <!-- Search Input -->
    <div
      class="flex items-center gap-2 h-10 px-4 rounded-full mx-auto max-w-[700px] transition-colors"
      :class="[
        isOpen
          ? 'bg-hub-surface ring-1 ring-brand'
          : 'bg-hub-surface'
      ]"
    >
      <svg
        class="size-4 shrink-0 text-hub-muted"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <input
        ref="inputRef"
        v-model="searchQuery"
        type="text"
        placeholder="Search workflows, models, creators..."
        class="flex-1 bg-transparent text-white text-sm font-normal placeholder:text-hub-muted outline-none"
        @focus="handleFocus"
      />
    </div>

    <!-- Popover Panel -->
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 translate-y-1"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-1"
    >
      <div
        v-if="isOpen && !searchQuery.trim()"
        class="fixed left-0 lg:-left-4 right-0 top-16 z-50 mx-4 lg:mx-auto lg:max-w-[700px] mt-2 rounded-xl border border-white/10 bg-[#1e1f20] shadow-2xl overflow-y-auto"
      >
        <div class="p-6 space-y-6">
            <!-- Popular Workflows -->
            <section>
              <h3 class="text-xs font-semibold uppercase tracking-wide text-white/50 mb-4">
                Popular Workflows
                <span class="text-white/30 font-normal ml-1">({{ formatUsage(templates.length) }}+)</span>
              </h3>
              <div class="space-y-1">
                <a
                  v-for="wf in popularWorkflows"
                  :key="wf.name"
                  :href="locale && locale !== 'en' ? `/${locale}/templates/${wf.name}/` : `/templates/${wf.name}/`"
                  class="flex items-center gap-3 px-2 py-2.5 -mx-2 rounded-lg hover:bg-white/5 transition-colors group"
                >
                  <div class="size-12 rounded-lg bg-white/5 overflow-hidden shrink-0">
                    <img
                      v-if="getPrimaryThumb(wf.thumbnails)"
                      :src="getPrimaryThumb(wf.thumbnails)!"
                      :alt="wf.title"
                      loading="lazy"
                      class="w-full h-full object-cover"
                    />
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="text-sm font-medium text-white truncate group-hover:text-brand transition-colors">
                      {{ wf.title }}
                    </p>
                    <p class="text-xs text-white/40 truncate">
                      {{ wf.creatorDisplayName }} · {{ formatUsage(wf.usage) }} runs
                    </p>
                  </div>
                </a>
              </div>
            </section>

            <!-- Top Creators -->
            <section>
              <h3 class="text-xs font-semibold uppercase tracking-wide text-white/50 mb-3">
                Top Creators
                <span class="text-white/30 font-normal ml-1">(850+)</span>
              </h3>
              <div class="flex flex-wrap gap-2">
                <a
                  v-for="(creator, i) in topCreators"
                  :key="creator"
                  :href="locale && locale !== 'en' ? `/${locale}/templates/${creator.toLowerCase().replace(/\s+/g, '-')}/` : `/templates/${creator.toLowerCase().replace(/\s+/g, '-')}/`"
                  class="inline-flex items-center gap-2 h-8 px-3 rounded-full bg-hub-surface text-white/80 text-sm font-normal hover:brightness-125 transition-all"
                >
                  <span
                    class="size-5 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold text-black"
                    :style="{ backgroundColor: getCreatorColor(i) }"
                  >
                    {{ creator.charAt(0).toUpperCase() }}
                  </span>
                  {{ creator }}
                </a>
              </div>
            </section>

            <!-- Filter by Type -->
            <section>
              <h3 class="text-xs font-semibold uppercase tracking-wide text-white/50 mb-3">
                Filter by Type
                <span class="text-white/30 font-normal ml-1">(100+)</span>
              </h3>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="filterType in FILTER_TYPES"
                  :key="filterType"
                  class="inline-flex items-center justify-center h-8 px-4 rounded-full bg-hub-surface text-white/60 text-xs font-normal hover:brightness-125 transition-all cursor-pointer"
                >
                  {{ filterType }}
                </button>
              </div>
            </section>

            <!-- Popular Models -->
            <section>
              <h3 class="text-xs font-semibold uppercase tracking-wide text-white/50 mb-3">
                Popular Models
                <span class="text-white/30 font-normal ml-1">(150+)</span>
              </h3>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="model in popularModels"
                  :key="model"
                  class="inline-flex items-center justify-center h-8 px-4 rounded-full bg-hub-surface text-white/60 text-xs font-normal hover:brightness-125 transition-all cursor-pointer"
                >
                  {{ model }}
                </button>
              </div>
            </section>
          </div>

          <!-- Footer -->
          <div class="border-t border-white/10 px-6 py-3">
            <p class="text-xs text-white/30 text-center">
              Search across all filters, workflows, creators, and models
            </p>
          </div>
        </div>
      </Transition>
  </div>
</template>
