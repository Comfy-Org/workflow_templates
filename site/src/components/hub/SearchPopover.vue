<script setup lang="ts">
/**
 * SearchPopover — Full-width search bar with discovery popover.
 * Shows popular workflows, top creators, filter-by-type tags, and popular models
 * when the search input is focused (initial state, before typing).
 */
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { watchDebounced } from '@vueuse/core'
import { useHubStore } from '@/composables/useHubStore'
import { search as searchIndex, type SearchResults } from '@/lib/search'

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

// Search state
const searchResults = ref<SearchResults | null>(null)
const isSearching = ref(false)
const hasSearched = ref(false)

const hasQuery = computed(() => searchQuery.value.trim().length > 0)

watchDebounced(
  searchQuery,
  async (query) => {
    const trimmed = query.trim()
    if (!trimmed) {
      searchResults.value = null
      hasSearched.value = false
      return
    }
    isSearching.value = true
    try {
      searchResults.value = await searchIndex(trimmed)
    } finally {
      isSearching.value = false
      hasSearched.value = true
    }
  },
  { debounce: 200 },
)

function getTemplateUrl(name: string): string {
  return props.locale && props.locale !== 'en'
    ? `/${props.locale}/templates/${name}/`
    : `/templates/${name}/`
}

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
  const creatorMap = new Map<string, { username: string; displayName: string; usage: number }>()
  for (const tmpl of props.templates) {
    const displayName = tmpl.creatorDisplayName || 'ComfyUI'
    const key = tmpl.username || displayName
    const existing = creatorMap.get(key)
    if (existing) {
      existing.usage += tmpl.usage
    } else {
      creatorMap.set(key, { username: tmpl.username, displayName, usage: tmpl.usage })
    }
  }
  return Array.from(creatorMap.values())
    .sort((a, b) => b.usage - a.usage)
    .slice(0, 3)
})

// Unique creator count for the discovery panel header
const uniqueCreatorCount = computed(() => {
  const creators = new Set<string>()
  for (const tmpl of props.templates) {
    creators.add(tmpl.username || tmpl.creatorDisplayName || 'ComfyUI')
  }
  return creators.size
})

// Popular models — top 5 by template count (aligned with sidebar)
const popularModels = computed(() => {
  const counts = new Map<string, number>()
  for (const tmpl of props.templates) {
    for (const m of tmpl.models) {
      counts.set(m, (counts.get(m) || 0) + 1)
    }
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name]) => name)
})

// Unique model count for the discovery panel header
const uniqueModelCount = computed(() => {
  const models = new Set<string>()
  for (const tmpl of props.templates) {
    for (const m of tmpl.models) {
      models.add(m)
    }
  }
  return models.size
})

// Filter types — media types first, then popular tags derived from data
const MEDIA_TYPE_LABELS: Record<string, string> = {
  image: 'Image',
  video: 'Video',
  audio: 'Audio',
  '3d': '3D',
}

const filterTypes = computed(() => {
  // Get media types that actually exist
  const mediaTypes = new Set<string>()
  const tagCounts = new Map<string, number>()
  for (const tmpl of props.templates) {
    mediaTypes.add(tmpl.mediaType)
    for (const tag of tmpl.tags) {
      // Skip tags that duplicate media type labels (e.g. "Image", "Video")
      const isMediaLabel = Object.values(MEDIA_TYPE_LABELS).includes(tag)
      if (!isMediaLabel) {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
      }
    }
  }
  const mediaTypeFilters = ['image', 'video', 'audio', '3d']
    .filter((mt) => mediaTypes.has(mt))
    .map((mt) => MEDIA_TYPE_LABELS[mt])
  const topTags = Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name]) => name)
  return [...mediaTypeFilters, ...topTags]
})

// Total unique tags+mediaTypes count for the header
const uniqueFilterCount = computed(() => {
  const all = new Set<string>()
  for (const tmpl of props.templates) {
    all.add(MEDIA_TYPE_LABELS[tmpl.mediaType] || tmpl.mediaType)
    for (const tag of tmpl.tags) {
      all.add(tag)
    }
  }
  return all.size
})

// Active media type filter within search results (null = show all)
const activeResultFilter = ref<string | null>(null)

// Unique media types present in current search results
const resultMediaTypes = computed(() => {
  if (!searchResults.value) return []
  const types = new Map<string, string>()
  for (const wf of searchResults.value.workflows) {
    if (!types.has(wf.mediaType)) {
      types.set(wf.mediaType, wf.mediaTypeLabel)
    }
  }
  return Array.from(types.entries()).map(([value, label]) => ({ value, label }))
})

// Filtered search results based on active media type chip
const filteredWorkflows = computed(() => {
  if (!searchResults.value) return []
  if (!activeResultFilter.value) return searchResults.value.workflows
  return searchResults.value.workflows.filter((wf) => wf.mediaType === activeResultFilter.value)
})

function toggleResultFilter(type: string) {
  activeResultFilter.value = activeResultFilter.value === type ? null : type
}

// Reset the result filter when query changes
watch(searchQuery, () => {
  activeResultFilter.value = null
})

// Fill search query when user clicks a discovery item
function searchFor(term: string) {
  searchQuery.value = term
  inputRef.value?.focus()
}

function clearSearch() {
  searchQuery.value = ''
  inputRef.value?.focus()
}

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
      <button
        v-if="hasQuery"
        type="button"
        class="shrink-0 size-5 flex items-center justify-center rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-colors"
        aria-label="Clear search"
        @click="clearSearch"
      >
        <svg class="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Discovery Panel (empty query) -->
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 translate-y-1"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-1"
    >
      <div
        v-if="isOpen && !hasQuery"
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
                  :href="getTemplateUrl(wf.name)"
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
                <span class="text-white/30 font-normal ml-1">({{ uniqueCreatorCount }})</span>
              </h3>
              <div class="flex flex-wrap gap-2">
                <a
                  v-for="(creator, i) in topCreators"
                  :key="creator.username"
                  :href="locale && locale !== 'en' ? `/${locale}/templates/${creator.username}/` : `/templates/${creator.username}/`"
                  class="inline-flex items-center gap-2 h-8 px-3 rounded-full bg-hub-surface text-white/80 text-sm font-normal hover:brightness-125 transition-all"
                >
                  <span
                    class="size-5 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold text-black"
                    :style="{ backgroundColor: getCreatorColor(i) }"
                  >
                    {{ creator.displayName.charAt(0).toUpperCase() }}
                  </span>
                  {{ creator.displayName }}
                </a>
              </div>
            </section>

            <!-- Categories -->
            <section>
              <h3 class="text-xs font-semibold uppercase tracking-wide text-white/50 mb-3">
                Categories
                <span class="text-white/30 font-normal ml-1">({{ uniqueFilterCount }})</span>
              </h3>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="filterType in filterTypes"
                  :key="filterType"
                  class="inline-flex items-center justify-center h-8 px-4 rounded-full bg-hub-surface text-white/60 text-xs font-normal hover:brightness-125 transition-all cursor-pointer"
                  @click="searchFor(filterType)"
                >
                  {{ filterType }}
                </button>
                <button
                  class="inline-flex items-center gap-1.5 h-8 px-4 rounded-full border border-dashed border-white/15 text-white/40 text-xs font-normal hover:text-white/60 hover:border-white/25 transition-all cursor-pointer"
                  @click="inputRef?.focus()"
                >
                  <svg class="size-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Search all
                </button>
              </div>
            </section>

            <!-- Popular Models -->
            <section>
              <h3 class="text-xs font-semibold uppercase tracking-wide text-white/50 mb-3">
                Popular Models
                <span class="text-white/30 font-normal ml-1">({{ uniqueModelCount }})</span>
              </h3>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="model in popularModels"
                  :key="model"
                  class="inline-flex items-center justify-center h-8 px-4 rounded-full bg-hub-surface text-white/60 text-xs font-normal hover:brightness-125 transition-all cursor-pointer"
                  @click="searchFor(model)"
                >
                  {{ model }}
                </button>
                <button
                  class="inline-flex items-center gap-1.5 h-8 px-4 rounded-full border border-dashed border-white/15 text-white/40 text-xs font-normal hover:text-white/60 hover:border-white/25 transition-all cursor-pointer"
                  @click="inputRef?.focus()"
                >
                  <svg class="size-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Search all
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

    <!-- Search Results Panel (has query) -->
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 translate-y-1"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-1"
    >
      <div
        v-if="isOpen && hasQuery"
        class="fixed left-0 lg:-left-4 right-0 top-16 z-50 mx-4 lg:mx-auto lg:max-w-[700px] mt-2 rounded-xl border border-white/10 bg-[#1e1f20] shadow-2xl overflow-y-auto max-h-[70vh]"
      >
        <!-- Loading state -->
        <div v-if="isSearching && !searchResults" class="p-6">
          <div class="flex items-center gap-3 text-white/50">
            <svg class="size-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span class="text-sm">Searching...</span>
          </div>
        </div>

        <!-- Results -->
        <div v-else-if="searchResults" class="p-6 space-y-6">
          <!-- No results -->
          <div v-if="searchResults.workflows.length === 0" class="text-center py-4">
            <p class="text-sm text-white/50">
              No results for "<span class="text-white/70">{{ searchQuery.trim() }}</span>"
            </p>
            <p class="text-xs text-white/30 mt-1">Try a different search term</p>
          </div>

          <template v-else>
            <!-- Media type filter chips (only when multiple types in results) -->
            <div v-if="resultMediaTypes.length > 1" class="flex flex-wrap gap-1.5">
              <button
                class="h-6 px-2.5 rounded-full text-[11px] font-medium transition-colors cursor-pointer"
                :class="activeResultFilter === null
                  ? 'bg-white/15 text-white'
                  : 'bg-white/5 text-white/40 hover:text-white/60'"
                @click="activeResultFilter = null"
              >
                All ({{ searchResults.workflows.length }})
              </button>
              <button
                v-for="mt in resultMediaTypes"
                :key="mt.value"
                class="h-6 px-2.5 rounded-full text-[11px] font-medium transition-colors cursor-pointer"
                :class="activeResultFilter === mt.value
                  ? 'bg-white/15 text-white'
                  : 'bg-white/5 text-white/40 hover:text-white/60'"
                @click="toggleResultFilter(mt.value)"
              >
                {{ mt.label }}
              </button>
            </div>

            <!-- Workflow results -->
            <section>
              <h3 class="text-xs font-semibold uppercase tracking-wide text-white/50 mb-4">
                Workflows
                <span class="text-white/30 font-normal ml-1">({{ filteredWorkflows.length }})</span>
              </h3>
              <div class="space-y-1">
                <a
                  v-for="hit in filteredWorkflows.slice(0, 8)"
                  :key="hit.id"
                  :href="getTemplateUrl(hit.id)"
                  class="flex items-center gap-3 px-2 py-2.5 -mx-2 rounded-lg hover:bg-white/5 transition-colors group"
                >
                  <div class="size-12 rounded-lg bg-white/5 overflow-hidden shrink-0">
                    <img
                      v-if="hit.thumbnail"
                      :src="`/templates/thumbnails/${hit.thumbnail}`"
                      :alt="hit.title"
                      loading="lazy"
                      class="w-full h-full object-cover"
                    />
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="text-sm font-medium text-white truncate group-hover:text-brand transition-colors">
                      {{ hit.title }}
                    </p>
                    <p class="text-xs text-white/40 truncate">
                      {{ hit.creatorName }} · {{ formatUsage(hit.usage) }} runs
                    </p>
                  </div>
                  <span class="text-[10px] uppercase tracking-wide text-white/30 shrink-0">
                    {{ hit.mediaTypeLabel }}
                  </span>
                </a>
              </div>
            </section>

            <!-- Creator results -->
            <section v-if="searchResults.creators.length > 0">
              <h3 class="text-xs font-semibold uppercase tracking-wide text-white/50 mb-3">
                Creators
              </h3>
              <div class="flex flex-wrap gap-2">
                <a
                  v-for="(creator, i) in searchResults.creators.slice(0, 5)"
                  :key="creator.username"
                  :href="getTemplateUrl(creator.username)"
                  class="inline-flex items-center gap-2 h-8 px-3 rounded-full bg-hub-surface text-white/80 text-sm font-normal hover:brightness-125 transition-all"
                >
                  <span
                    class="size-5 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold text-black"
                    :style="{ backgroundColor: getCreatorColor(i) }"
                  >
                    {{ creator.displayName.charAt(0).toUpperCase() }}
                  </span>
                  {{ creator.displayName }}
                  <span class="text-white/30 text-xs">{{ creator.workflowCount }}</span>
                </a>
              </div>
            </section>
          </template>
        </div>

        <!-- Footer -->
        <div class="border-t border-white/10 px-6 py-3">
          <p class="text-xs text-white/30 text-center">
            <template v-if="searchResults && filteredWorkflows.length > 8">
              Showing 8 of {{ filteredWorkflows.length }} results
            </template>
            <template v-else>
              Press Enter to search or Escape to close
            </template>
          </p>
        </div>
      </div>
    </Transition>
  </div>
</template>
