<script setup lang="ts">
/**
 * SearchPopover — Full-width search bar with inline filter badges and discovery popover.
 *
 * Three states:
 * 1. Discovery (open, no badges, no text) — shows popular workflows, creators, categories, models
 * 2. Active results (has badges and/or text) — shows filter suggestions + filtered workflows
 * 3. Closed — nothing visible
 *
 * Badges scope results: clicking a category/model adds a badge that filters templates.
 * Text search uses MiniSearch within the badge-scoped set.
 * Badge-only (no text) shows ALL matching templates sorted by usage.
 */
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { watchDebounced } from '@vueuse/core';
import { useHubStore, type FilterBadge } from '@/composables/useHubStore';
import { search as searchIndex, type SearchResults } from '@/lib/search';
import { Badge } from '@/components/ui/badge';
import { IconApps, IconWorkflow } from '@/components/ui/icons';
import { tagDisplayName } from '@/lib/tag-aliases';
import { slugify } from '@/lib/slugify';
import { trackSearchPerformed, trackFilterApplied } from '@/lib/posthog';
import type { MediaType, CreatorEntry } from '@/lib/hub-api';
import { isAudioFile, isVideoFile } from '@/lib/media-utils';
import { getVideoFrameUrl } from '@/lib/video-thumbnail';
import { workflowDetailPath, workflowDetailSlug, thumbnailPath } from '@/lib/routes';
import { cn } from '@/lib/utils';

export interface SearchTemplate {
  name: string;
  shareId: string;
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
  creatorAvatarUrl: string;
  isApp: boolean;
}

const props = defineProps<{
  templates: SearchTemplate[];
  creators: CreatorEntry[];
  locale: string;
}>();

const store = useHubStore();

const isOpen = ref(false);
const searchQuery = ref('');
const containerRef = ref<HTMLElement | null>(null);
const inputRef = ref<HTMLInputElement | null>(null);

const searchResults = ref<SearchResults | null>(null);
const isSearching = ref(false);
const hasSearched = ref(false);
const activeIndex = ref(-1);

const hasQuery = computed(() => searchQuery.value.trim().length > 0);
const hasBadges = computed(() => store.filterBadges.value.length > 0);
const hasActiveFilters = computed(() => hasQuery.value || hasBadges.value);

const MAX_BADGES_DESKTOP = 4;
const visibleBadgesDesktop = computed(() => store.filterBadges.value.slice(0, MAX_BADGES_DESKTOP));
const overflowCountDesktop = computed(() =>
  Math.max(0, store.filterBadges.value.length - MAX_BADGES_DESKTOP)
);

function serializeFilters(badges: FilterBadge[]): string[] {
  return badges.map((badge) => `${badge.type}:${badge.value}`);
}

const allTags = computed(() => {
  const counts = new Map<string, number>();
  for (const tmpl of props.templates) {
    for (const tag of tmpl.tags) {
      counts.set(tag, (counts.get(tag) || 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));
});

const allModels = computed(() => {
  const counts = new Map<string, number>();
  for (const tmpl of props.templates) {
    for (const m of tmpl.models) {
      counts.set(m, (counts.get(m) || 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));
});

const filterSuggestions = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return { tags: [], models: [] };

  // Already-active badge values to exclude from suggestions
  const activeTags = new Set(
    store.filterBadges.value.filter((b) => b.type === 'tag').map((b) => b.value)
  );
  const activeModels = new Set(
    store.filterBadges.value.filter((b) => b.type === 'model').map((b) => b.value)
  );

  const matchingTags = allTags.value
    .filter(
      (t) =>
        !activeTags.has(t.name) &&
        (t.name.toLowerCase().includes(q) || tagDisplayName(t.name).toLowerCase().includes(q))
    )
    .slice(0, 5);

  const matchingModels = allModels.value
    .filter((m) => !activeModels.has(m.name) && m.name.toLowerCase().includes(q))
    .slice(0, 5);

  return { tags: matchingTags, models: matchingModels };
});

const hasFilterSuggestions = computed(() => {
  return filterSuggestions.value.tags.length > 0 || filterSuggestions.value.models.length > 0;
});

const badgeFilteredTemplates = computed(() => {
  if (!hasBadges.value) return props.templates;

  const tagBadges = store.filterBadges.value.filter((b) => b.type === 'tag').map((b) => b.value);
  const modelBadges = store.filterBadges.value
    .filter((b) => b.type === 'model')
    .map((b) => b.value);
  const modeBadges = store.filterBadges.value.filter((b) => b.type === 'mode').map((b) => b.value);

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

// Set of allowed names for scoping MiniSearch when badges are active
const badgeFilteredNames = computed(() => {
  if (!hasBadges.value) return null;
  return new Set(badgeFilteredTemplates.value.map((t) => t.name));
});

// Badge-only results (no text query): all matching templates sorted by usage
const badgeOnlyResults = computed(() => {
  if (!hasBadges.value) return [];
  return [...badgeFilteredTemplates.value].sort((a, b) => b.usage - a.usage);
});

watchDebounced(
  [searchQuery, () => store.filterBadges.value],
  async ([query]) => {
    const trimmed = (query as string).trim();
    if (!trimmed) {
      searchResults.value = null;
      hasSearched.value = false;
      return;
    }
    isSearching.value = true;
    const filtersApplied = serializeFilters(store.filterBadges.value);
    const creatorResultCount = matchedCreators.value.length;
    try {
      const results = await searchIndex(trimmed, {
        allowedNames: badgeFilteredNames.value ?? undefined,
      });
      searchResults.value = results;
      trackSearchPerformed({
        query: trimmed,
        workflowResultCount: results.workflows.length,
        creatorResultCount,
        filtersApplied,
      });
    } catch (err) {
      console.error('Search failed:', err);
      searchResults.value = { workflows: [], creators: [] };
    } finally {
      isSearching.value = false;
      hasSearched.value = true;
    }
  },
  { debounce: 200 }
);

const displayedWorkflows = computed(() => {
  // Text query active → show search results
  if (hasQuery.value && searchResults.value) {
    return searchResults.value.workflows;
  }
  // Badge-only → show all filtered templates as workflow-like items.
  // Populate `slug` so the click target is a real workflow URL, never
  // `/workflows/undefined/` (FE-223 root cause was this field being absent).
  if (hasBadges.value) {
    return badgeOnlyResults.value.map((t) => ({
      id: t.name,
      slug: workflowDetailSlug(t.name, t.shareId) ?? '',
      title: t.title,
      mediaType: t.mediaType,
      mediaTypeLabel: MEDIA_TYPE_LABELS[t.mediaType] || t.mediaType,
      thumbnail: t.thumbnails[0] || '',
      username: t.username,
      creatorName: t.creatorDisplayName,
      usage: t.usage,
      tags: t.tags,
      score: 0,
    }));
  }
  return [];
});

// Creator search — matches against the creators list from hub API profiles
const matchedCreators = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return [];
  // Build a usage map from templates for sorting + workflow count
  const usageMap = new Map<string, { count: number; usage: number }>();
  for (const tmpl of props.templates) {
    if (!tmpl.username) continue;
    const existing = usageMap.get(tmpl.username);
    if (existing) {
      existing.count++;
      existing.usage += tmpl.usage;
    } else {
      usageMap.set(tmpl.username, { count: 1, usage: tmpl.usage });
    }
  }
  return props.creators
    .filter((c) => c.displayName.toLowerCase().includes(q) || c.username.toLowerCase().includes(q))
    .map((c) => ({
      username: c.username,
      displayName: c.displayName,
      avatarUrl: c.avatarUrl || '',
      workflowCount: usageMap.get(c.username)?.count || 0,
    }))
    .sort((a, b) => b.workflowCount - a.workflowCount)
    .slice(0, 5);
});

// Screen-reader announcement for the live result count while searching.
const resultAnnouncement = computed(() => {
  if (!isOpen.value || !hasQuery.value) return '';
  if (isSearching.value) return 'Searching…';
  if (!hasSearched.value) return '';
  const count = displayedWorkflows.value.length + matchedCreators.value.length;
  return count === 0 ? 'No results found' : `${count} result${count === 1 ? '' : 's'} found`;
});

const MEDIA_TYPE_LABELS: Record<string, string> = {
  image: 'Image',
  video: 'Video',
  audio: 'Audio',
  '3d': '3D',
};

// Build a workflow detail URL from a pre-computed slug (search-index `slug`
// field). Returns null when the slug is empty/undefined so callers can avoid
// rendering /workflows/undefined/ links when the search index is malformed.
function getTemplateUrl(slug: string | null | undefined): string | null {
  if (!slug) return null;
  return props.locale && props.locale !== 'en'
    ? `/${props.locale}/workflows/${slug}/`
    : `/workflows/${slug}/`;
}

function getCreatorUrl(username: string): string {
  return props.locale && props.locale !== 'en'
    ? `/${props.locale}/workflows/${slugify(username)}/`
    : `/workflows/${slugify(username)}/`;
}

// React to search focus requests from other components (e.g. HubBrowse sidebar)
watch(
  () => store.searchFocusTrigger.value,
  () => {
    isOpen.value = true;
    inputRef.value?.focus();
  }
);

const popularWorkflows = computed(() =>
  [...props.templates].sort((a, b) => b.usage - a.usage).slice(0, 4)
);

// Top creators from hub API profiles, enriched with workflow count + total usage
const topCreators = computed(() => {
  const usageMap = new Map<string, { count: number; usage: number }>();
  for (const tmpl of props.templates) {
    if (!tmpl.username) continue;
    const existing = usageMap.get(tmpl.username);
    if (existing) {
      existing.count++;
      existing.usage += tmpl.usage;
    } else {
      usageMap.set(tmpl.username, { count: 1, usage: tmpl.usage });
    }
  }
  return props.creators
    .filter((c) => usageMap.has(c.username))
    .map((c) => ({ ...c, ...(usageMap.get(c.username) || { count: 0, usage: 0 }) }))
    .sort((a, b) => b.usage - a.usage)
    .slice(0, 3);
});

const uniqueCreatorCount = computed(() => props.creators.length);

// Discovery preview — top 5 of each (matching sidebar) with remaining counts
const DISCOVERY_PREVIEW_COUNT = 5;

const DISCOVERY_TAG_COUNT = 4;
const showAllTags = ref(false);
const showAllModels = ref(false);
const previewTags = computed(() =>
  showAllTags.value ? allTags.value : allTags.value.slice(0, DISCOVERY_TAG_COUNT)
);
const remainingTagCount = computed(() => Math.max(0, allTags.value.length - DISCOVERY_TAG_COUNT));

const previewModels = computed(() =>
  showAllModels.value ? allModels.value : allModels.value.slice(0, DISCOVERY_PREVIEW_COUNT)
);
const remainingModelCount = computed(() =>
  Math.max(0, allModels.value.length - DISCOVERY_PREVIEW_COUNT)
);

const modeItems = [
  { name: 'Apps', value: 'app' },
  { name: 'Node Graphs', value: 'nodeGraph' },
];

function addFilterBadge(type: 'tag' | 'model' | 'mode', value: string) {
  store.addBadge({ type, value });
  trackFilterApplied(type, value);
  searchQuery.value = '';
  inputRef.value?.focus();
}

function removeLastBadge() {
  if (store.filterBadges.value.length > 0) {
    const last = store.filterBadges.value[store.filterBadges.value.length - 1];
    store.removeBadge(last);
  }
}

const discCreatorOffset = computed(() => popularWorkflows.value.length);
const discTagOffset = computed(() => discCreatorOffset.value + topCreators.value.length);
const discModelOffset = computed(() => discTagOffset.value + previewTags.value.length);
const discModeOffset = computed(() => discModelOffset.value + previewModels.value.length);

// Active results panel offsets — order: suggestions → creators → workflows
const activeSugModelOffset = computed(() => filterSuggestions.value.tags.length);
const activeCreatorOffset = computed(() => {
  let offset = 0;
  if (hasQuery.value && hasFilterSuggestions.value) {
    offset += filterSuggestions.value.tags.length + filterSuggestions.value.models.length;
  }
  return offset;
});
const activeWorkflowOffset = computed(
  () => activeCreatorOffset.value + matchedCreators.value.length
);

const totalNavigable = computed(() => {
  if (!isOpen.value) return 0;
  if (hasActiveFilters.value) {
    let total = displayedWorkflows.value.length;
    if (hasQuery.value && hasFilterSuggestions.value) {
      total += filterSuggestions.value.tags.length + filterSuggestions.value.models.length;
    }
    if (hasQuery.value) {
      total += matchedCreators.value.length;
    }
    return total;
  }
  return (
    popularWorkflows.value.length +
    topCreators.value.length +
    previewTags.value.length +
    previewModels.value.length +
    modeItems.length
  );
});

function activateItem(index: number) {
  if (hasActiveFilters.value) {
    const sugTagCount =
      hasQuery.value && hasFilterSuggestions.value ? filterSuggestions.value.tags.length : 0;
    const sugModelCount =
      hasQuery.value && hasFilterSuggestions.value ? filterSuggestions.value.models.length : 0;
    const sugTotal = sugTagCount + sugModelCount;

    if (index < sugTagCount) {
      addFilterBadge('tag', filterSuggestions.value.tags[index].name);
    } else if (index < sugTotal) {
      addFilterBadge('model', filterSuggestions.value.models[index - sugTagCount].name);
    } else if (index < sugTotal + matchedCreators.value.length) {
      const creator = matchedCreators.value[index - sugTotal];
      if (creator) window.location.href = getCreatorUrl(creator.username);
    } else {
      const wf = displayedWorkflows.value[index - sugTotal - matchedCreators.value.length];
      const url = wf ? getTemplateUrl(wf.slug) : null;
      if (url) window.location.href = url;
    }
  } else {
    const popCount = popularWorkflows.value.length;
    const creatorCount = topCreators.value.length;
    const tagCount = previewTags.value.length;

    if (index < popCount) {
      const wf = popularWorkflows.value[index];
      const url = wf ? workflowDetailPath(wf.name, wf.shareId, props.locale) : null;
      if (url) window.location.href = url;
    } else if (index < popCount + creatorCount) {
      const creator = topCreators.value[index - popCount];
      if (creator) window.location.href = getCreatorUrl(creator.username);
    } else if (index < popCount + creatorCount + tagCount) {
      const tag = previewTags.value[index - popCount - creatorCount];
      if (tag) addFilterBadge('tag', tag.name);
    } else if (index < popCount + creatorCount + tagCount + previewModels.value.length) {
      const model = previewModels.value[index - popCount - creatorCount - tagCount];
      if (model) addFilterBadge('model', model.name);
    } else {
      const mode =
        modeItems[index - popCount - creatorCount - tagCount - previewModels.value.length];
      if (mode) addFilterBadge('mode', mode.value);
    }
  }
}

function handleKeydown(e: KeyboardEvent) {
  // Backspace on empty input removes last badge
  if (e.key === 'Backspace' && searchQuery.value === '' && hasBadges.value) {
    e.preventDefault();
    removeLastBadge();
    return;
  }

  if (!isOpen.value) return;

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (activeIndex.value < totalNavigable.value - 1) {
      activeIndex.value++;
    }
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (activeIndex.value > 0) {
      activeIndex.value--;
    } else {
      activeIndex.value = -1;
    }
  } else if (e.key === 'Enter' && activeIndex.value >= 0) {
    e.preventDefault();
    activateItem(activeIndex.value);
  }
}

// Native form submit (Enter). Activate the highlighted item, else the first
// result if one exists. `@submit.prevent` stops the default page reload.
function onSubmit() {
  if (!isOpen.value) return;
  if (activeIndex.value >= 0) {
    activateItem(activeIndex.value);
  } else if (totalNavigable.value > 0) {
    activateItem(0);
  }
}

function clearSearch() {
  searchQuery.value = '';
  inputRef.value?.focus();
}

function clearAll() {
  searchQuery.value = '';
  store.clearBadges();
  inputRef.value?.focus();
}

const CREATOR_COLORS = ['#f2ff59', '#ff4444', '#ff4444'];

function getCreatorColor(index: number): string {
  return CREATOR_COLORS[index % CREATOR_COLORS.length];
}

const MODE_LABELS: Record<string, string> = {
  app: 'Apps',
  nodeGraph: 'Node Graphs',
};

function badgeLabel(badge: { type: string; value: string }): string {
  if (badge.type === 'mode') return MODE_LABELS[badge.value] || badge.value;
  if (badge.type === 'tag') return tagDisplayName(badge.value);
  return badge.value;
}

function formatUsage(usage: number): string {
  if (usage >= 1000) {
    return `${(usage / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  }
  return String(usage);
}

/**
 * Returns an <img> src for image thumbnails, or a Cloudflare poster-frame URL
 * for CDN-hosted videos. Returns null when the file has no static preview
 * (audio, or a video that isn't on the Cloudflare CDN) — callers should then
 * render a <video> element (see videoThumbUrl) or an icon placeholder.
 */
function getImageThumb(file: string | undefined | null): string | null {
  if (!file) return null;
  if (isAudioFile(file)) return null;
  if (isVideoFile(file)) return getVideoFrameUrl(thumbnailPath(file));
  return thumbnailPath(file);
}

/**
 * Returns the full video URL when the thumbnail is a video file, otherwise null.
 * Used to drive a <video> fallback for non-CDN videos where the browser
 * renders the first frame for free via preload="metadata".
 */
function videoThumbUrl(file: string | undefined | null): string | null {
  if (!file || !isVideoFile(file)) return null;
  return thumbnailPath(file);
}

function handleFocus() {
  isOpen.value = true;
}

function handleClickOutside(e: MouseEvent) {
  if (containerRef.value && !containerRef.value.contains(e.target as Node)) {
    isOpen.value = false;
  }
}

function handleEscape(e: KeyboardEvent) {
  if (e.key === 'Escape' && isOpen.value) {
    isOpen.value = false;
    inputRef.value?.blur();
  }
}

function handleGlobalSlash(e: KeyboardEvent) {
  if (e.key !== '/') return;
  const tag = (e.target as HTMLElement)?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return;
  e.preventDefault();
  isOpen.value = true;
  inputRef.value?.focus();
}

watch([searchQuery, () => store.filterBadges.value.length, isOpen, searchResults], () => {
  activeIndex.value = -1;
});

watch(activeIndex, (idx) => {
  if (idx < 0) return;
  nextTick(() => {
    const el = containerRef.value?.querySelector(`[data-nav-index="${idx}"]`) as HTMLElement | null;
    el?.scrollIntoView({ block: 'nearest' });
  });
});

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside);
  document.addEventListener('keydown', handleEscape);
  document.addEventListener('keydown', handleGlobalSlash);
});

onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutside);
  document.removeEventListener('keydown', handleEscape);
  document.removeEventListener('keydown', handleGlobalSlash);
});
</script>

<template>
  <div ref="containerRef" role="search" class="w-full min-w-0">
    <div class="lg:relative min-w-0">
      <form
        :class="
          cn(
            'flex items-center gap-2 w-full h-12 px-4 rounded-2xl bg-hub-surface-hover transition-colors focus-within:ring-1 focus-within:ring-brand',
            isOpen && 'ring-1 ring-brand'
          )
        "
        role="search"
        @click="inputRef?.focus()"
        @submit.prevent="onSubmit"
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

        <!-- Inline filter badges — desktop only (max 4) -->
        <template v-if="hasBadges">
          <div class="hidden lg:contents">
            <Badge
              v-for="badge in visibleBadgesDesktop"
              :key="`d:${badge.type}:${badge.value}`"
              variant="hub-filter"
              as="button"
              type="button"
              class="h-6 px-2.5 text-xs gap-1"
              @click.stop="store.removeBadge(badge)"
            >
              <span class="ppformula-text-center-sm">{{ badgeLabel(badge) }}</span>
              <svg
                class="size-3 opacity-60"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </Badge>
            <Badge v-if="overflowCountDesktop > 0" variant="hub-filter" class="h-6 px-2.5 text-xs">
              +{{ overflowCountDesktop }} more
            </Badge>
          </div>
        </template>

        <input
          ref="inputRef"
          v-model="searchQuery"
          type="search"
          aria-label="Search workflows, models, and creators"
          :placeholder="hasBadges ? 'Search...' : 'Search workflows, models, creators...'"
          class="flex-1 min-w-0 h-full bg-transparent text-content text-sm font-normal leading-none placeholder:text-hub-muted outline-none relative top-[0.09em] [&::-webkit-search-cancel-button]:hidden"
          @focus="handleFocus"
          @keydown="handleKeydown"
        />

        <button
          v-if="hasQuery || hasBadges"
          type="button"
          class="shrink-0 size-5 flex items-center justify-center rounded-full text-content-muted hover:text-content hover:bg-hub-surface transition-colors"
          aria-label="Clear all"
          @click.stop="clearAll"
        >
          <svg
            class="size-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <kbd
          v-if="!isOpen && !hasQuery && !hasBadges"
          class="hidden lg:inline-flex items-center justify-center shrink-0 size-6 rounded-full bg-hub-surface text-content/30 text-xs font-mono leading-none"
          aria-hidden="true"
          >/</kbd
        >
      </form>

      <!-- Live region: announces result counts to screen readers -->
      <p class="sr-only" aria-live="polite" role="status">{{ resultAnnouncement }}</p>

      <!-- Discovery Panel (no badges, no text query) -->
      <Transition
        enter-active-class="transition duration-150 ease-out"
        enter-from-class="opacity-0 translate-y-1"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition duration-100 ease-in"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 translate-y-1"
      >
        <div
          v-if="isOpen && !hasActiveFilters"
          class="absolute left-4 right-4 lg:left-0 lg:right-0 z-50 top-full mt-2 rounded-lg lg:rounded-xl border border-white/10 bg-page shadow-2xl flex flex-col max-h-[70vh] lg:max-h-[700px] lg:min-w-[600px]"
        >
          <div
            v-if="hasBadges"
            class="lg:hidden flex flex-wrap items-center gap-1.5 px-4 pt-3 pb-1"
          >
            <Badge
              v-for="badge in store.filterBadges.value"
              :key="`mp:${badge.type}:${badge.value}`"
              variant="hub-filter"
              as="button"
              type="button"
              class="h-6 px-2.5 text-xs gap-1"
              @click.stop="store.removeBadge(badge)"
            >
              <span class="ppformula-text-center-sm">{{ badgeLabel(badge) }}</span>
              <svg
                class="size-3 opacity-60"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </Badge>
          </div>

          <div class="flex-1 overflow-y-auto min-h-0 scrollbar-thin p-6 space-y-6">
            <section>
              <h3 class="text-xs font-semibold uppercase tracking-wide text-content-muted mb-3">
                Popular Workflows
                <span class="text-content/30 font-normal ml-1"
                  >({{ formatUsage(templates.length) }}+)</span
                >
              </h3>
              <div class="space-y-1">
                <a
                  v-for="(wf, i) in popularWorkflows"
                  :key="wf.name"
                  :href="workflowDetailPath(wf.name, wf.shareId, props.locale) ?? '/workflows/'"
                  :data-nav-index="i"
                  class="flex items-center gap-3 px-2 py-2.5 -mx-2 rounded-lg hover:bg-hub-surface transition-colors group"
                  :class="{ 'bg-hub-surface': activeIndex === i }"
                >
                  <div class="size-12 rounded-lg bg-hub-surface overflow-hidden shrink-0">
                    <img
                      v-if="getImageThumb(wf.thumbnails[0])"
                      :src="getImageThumb(wf.thumbnails[0])!"
                      :alt="wf.title"
                      loading="lazy"
                      class="w-full h-full object-cover"
                    />
                    <video
                      v-else-if="videoThumbUrl(wf.thumbnails[0])"
                      :src="videoThumbUrl(wf.thumbnails[0])!"
                      class="w-full h-full object-cover"
                      muted
                      playsinline
                      preload="metadata"
                    />
                    <div
                      v-else-if="wf.thumbnails.length > 0 && isAudioFile(wf.thumbnails[0])"
                      class="w-full h-full flex items-center justify-center"
                    >
                      <svg
                        class="w-5 h-5 text-content/20"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="1.5"
                          d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                        />
                      </svg>
                    </div>
                  </div>
                  <div class="min-w-0 flex-1">
                    <p
                      class="text-sm font-medium text-content truncate group-hover:text-brand transition-colors"
                    >
                      {{ wf.title }}
                    </p>
                    <p class="text-xs text-content-muted truncate">
                      {{ wf.creatorDisplayName }} · {{ formatUsage(wf.usage) }} runs
                    </p>
                  </div>
                </a>
              </div>
            </section>

            <section>
              <h3 class="text-xs font-semibold uppercase tracking-wide text-content-muted mb-3">
                Top Creators
                <span class="text-content/30 font-normal ml-1">({{ uniqueCreatorCount }})</span>
              </h3>
              <div class="flex flex-wrap gap-2">
                <a
                  v-for="(creator, i) in topCreators"
                  :key="creator.username"
                  :href="getCreatorUrl(creator.username)"
                  :data-nav-index="discCreatorOffset + i"
                  class="inline-flex items-center gap-2 h-8 px-3 rounded-full bg-hub-surface text-content-secondary text-sm font-normal hover:brightness-125 transition-all"
                  :class="{ 'ring-1 ring-brand': activeIndex === discCreatorOffset + i }"
                >
                  <img
                    v-if="creator.avatarUrl"
                    :src="creator.avatarUrl"
                    :alt="creator.displayName"
                    class="size-5 rounded-full shrink-0 object-cover"
                  />
                  <span
                    v-else
                    class="size-5 rounded-full shrink-0 flex items-center justify-center text-2xs font-bold text-page bg-brand"
                  >
                    {{ creator.displayName.charAt(0).toUpperCase() }}
                  </span>
                  <span class="ppformula-text-center-sm">{{ creator.displayName }}</span>
                </a>
              </div>
            </section>

            <!-- Filter by — two labeled rows with "+ N more" -->
            <section class="space-y-3">
              <h3 class="text-xs font-semibold uppercase tracking-wide text-content-muted">
                Filter by
              </h3>
              <div data-testid="filter-row-categories" class="flex items-center gap-2 flex-wrap">
                <span class="text-xs text-content/30 uppercase tracking-wide w-20 shrink-0"
                  >Categories</span
                >
                <Badge
                  v-for="(tag, i) in previewTags"
                  :key="`tag:${tag.name}`"
                  variant="hub-filter"
                  as="button"
                  class="h-6 px-2.5"
                  :class="{ 'ring-1 ring-brand': activeIndex === discTagOffset + i }"
                  :data-nav-index="discTagOffset + i"
                  @click="addFilterBadge('tag', tag.name)"
                >
                  <span class="ppformula-text-center-sm">{{ tagDisplayName(tag.name) }}</span>
                </Badge>
                <button
                  v-if="!showAllTags && remainingTagCount > 0"
                  data-testid="show-more-tags"
                  class="text-xs text-content/30 hover:text-content-secondary transition-colors"
                  @click="showAllTags = true"
                >
                  + {{ remainingTagCount }} more
                </button>
              </div>
              <div data-testid="filter-row-models" class="flex items-center gap-2 flex-wrap">
                <span class="text-xs text-content/30 uppercase tracking-wide w-20 shrink-0"
                  >Models</span
                >
                <Badge
                  v-for="(model, i) in previewModels"
                  :key="`model:${model.name}`"
                  variant="hub-filter"
                  as="button"
                  class="h-6 px-2.5"
                  :class="{ 'ring-1 ring-brand': activeIndex === discModelOffset + i }"
                  :data-nav-index="discModelOffset + i"
                  @click="addFilterBadge('model', model.name)"
                >
                  <span class="ppformula-text-center-sm">{{ model.name }}</span>
                </Badge>
                <button
                  v-if="!showAllModels && remainingModelCount > 0"
                  data-testid="show-more-models"
                  class="text-xs text-content/30 hover:text-content-secondary transition-colors"
                  @click="showAllModels = true"
                >
                  + {{ remainingModelCount }} more
                </button>
              </div>
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-xs text-content/30 uppercase tracking-wide w-20 shrink-0"
                  >Modes</span
                >
                <Badge
                  variant="hub-filter"
                  as="button"
                  class="h-6 px-2.5 inline-flex items-center gap-1"
                  :class="{ 'ring-1 ring-brand': activeIndex === discModeOffset }"
                  :data-nav-index="discModeOffset"
                  @click="addFilterBadge('mode', 'nodeGraph')"
                >
                  <IconWorkflow class="size-3" />
                  Node Graphs
                </Badge>
                <Badge
                  variant="hub-filter"
                  as="button"
                  class="h-6 px-2.5 inline-flex items-center gap-1"
                  :class="{ 'ring-1 ring-brand': activeIndex === discModeOffset + 1 }"
                  :data-nav-index="discModeOffset + 1"
                  @click="addFilterBadge('mode', 'app')"
                >
                  <IconApps class="size-3" />
                  Apps
                </Badge>
              </div>
            </section>
          </div>
        </div>
      </Transition>

      <!-- Active Results Panel (has badges and/or text query) -->
      <Transition
        enter-active-class="transition duration-150 ease-out"
        enter-from-class="opacity-0 translate-y-1"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition duration-100 ease-in"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 translate-y-1"
      >
        <div
          v-if="isOpen && hasActiveFilters"
          class="absolute left-4 right-4 lg:left-0 lg:right-0 z-50 top-full mt-2 rounded-lg lg:rounded-xl border border-white/10 bg-page shadow-2xl flex flex-col max-h-[70vh] lg:max-h-[700px] lg:min-w-[600px]"
        >
          <div
            v-if="hasBadges"
            class="lg:hidden flex flex-wrap items-center gap-1.5 px-4 pt-3 pb-1"
          >
            <Badge
              v-for="badge in store.filterBadges.value"
              :key="`mp2:${badge.type}:${badge.value}`"
              variant="hub-filter"
              as="button"
              type="button"
              class="h-6 px-2.5 text-xs gap-1"
              @click.stop="store.removeBadge(badge)"
            >
              <span class="ppformula-text-center-sm">{{ badgeLabel(badge) }}</span>
              <svg
                class="size-3 opacity-60"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </Badge>
          </div>

          <div v-if="isSearching && !searchResults && hasQuery" class="p-6">
            <div class="flex items-center gap-3 text-content-muted">
              <svg class="size-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                />
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              <span class="text-sm">Searching...</span>
            </div>
          </div>

          <div v-else class="flex-1 overflow-y-auto min-h-0 scrollbar-thin p-6 space-y-5">
            <!-- Filter suggestions (shown while typing) -->
            <section v-if="hasQuery && hasFilterSuggestions">
              <h3 class="text-2xs font-semibold uppercase tracking-wide text-content-muted mb-2.5">
                Narrow by
              </h3>
              <div class="flex flex-wrap gap-1.5">
                <Badge
                  v-for="(tag, i) in filterSuggestions.tags"
                  :key="`tag:${tag.name}`"
                  variant="hub-filter"
                  as="button"
                  class="h-6 px-2.5"
                  :class="{ 'ring-1 ring-brand': activeIndex === i }"
                  :data-nav-index="i"
                  @click="addFilterBadge('tag', tag.name)"
                >
                  <span class="ppformula-text-center-sm">{{ tagDisplayName(tag.name) }}</span>
                  <span class="text-content/30 text-2xs">{{ tag.count }}</span>
                </Badge>
                <Badge
                  v-for="(model, i) in filterSuggestions.models"
                  :key="`model:${model.name}`"
                  variant="hub-filter"
                  as="button"
                  class="h-6 px-2.5"
                  :class="{ 'ring-1 ring-brand': activeIndex === activeSugModelOffset + i }"
                  :data-nav-index="activeSugModelOffset + i"
                  @click="addFilterBadge('model', model.name)"
                >
                  <span class="ppformula-text-center-sm">{{ model.name }}</span>
                  <span class="text-content/30 text-2xs">{{ model.count }}</span>
                </Badge>
              </div>
            </section>

            <div
              v-if="hasQuery && hasFilterSuggestions && displayedWorkflows.length > 0"
              class="border-t border-white/5"
            />

            <!-- Creator results (only when text searching) -->
            <section v-if="hasQuery && matchedCreators.length > 0">
              <h3 class="text-xs font-semibold uppercase tracking-wide text-content-muted mb-3">
                Creators
              </h3>
              <div class="flex flex-wrap gap-2">
                <a
                  v-for="(creator, i) in matchedCreators"
                  :key="creator.username"
                  :href="getCreatorUrl(creator.username)"
                  :data-nav-index="activeCreatorOffset + i"
                  class="inline-flex items-center gap-2 h-8 px-3 rounded-full bg-hub-surface text-content-secondary text-sm font-normal hover:brightness-125 transition-all"
                  :class="{ 'ring-1 ring-brand': activeIndex === activeCreatorOffset + i }"
                >
                  <img
                    v-if="creator.avatarUrl"
                    :src="creator.avatarUrl"
                    :alt="creator.displayName"
                    class="size-5 rounded-full shrink-0 object-cover"
                  />
                  <span
                    v-else
                    class="size-5 rounded-full shrink-0 flex items-center justify-center text-2xs font-bold text-page bg-brand"
                  >
                    {{ creator.displayName.charAt(0).toUpperCase() }}
                  </span>
                  <span class="ppformula-text-center-sm">{{ creator.displayName }}</span>
                  <span class="text-content/30 text-xs">{{ creator.workflowCount }}</span>
                </a>
              </div>
            </section>

            <div
              v-if="
                hasQuery &&
                hasSearched &&
                searchResults &&
                searchResults.workflows.length === 0 &&
                matchedCreators.length === 0
              "
              class="text-center py-4"
            >
              <p class="text-sm text-content-muted">
                No results for "<span class="text-content-secondary">{{ searchQuery.trim() }}</span
                >"
                <template v-if="hasBadges"> within active filters</template>
              </p>
              <p class="text-xs text-content/30 mt-1">
                Try a different search term or remove a filter
              </p>
            </div>

            <div
              v-else-if="!hasQuery && hasBadges && badgeOnlyResults.length === 0"
              class="text-center py-4"
            >
              <p class="text-sm text-content-muted">No workflows match the selected filters</p>
              <p class="text-xs text-content/30 mt-1">Try removing a filter</p>
            </div>

            <section v-if="displayedWorkflows.length > 0">
              <h3 class="text-xs font-semibold uppercase tracking-wide text-content-muted mb-3">
                Workflows
                <span class="text-content/30 font-normal ml-1"
                  >({{ displayedWorkflows.length }})</span
                >
              </h3>
              <div class="space-y-1">
                <a
                  v-for="(hit, i) in displayedWorkflows"
                  :key="hit.id"
                  :href="getTemplateUrl(hit.slug) ?? '/workflows/'"
                  :data-nav-index="activeWorkflowOffset + i"
                  class="flex items-center gap-3 px-2 py-2.5 -mx-2 rounded-lg hover:bg-hub-surface transition-colors group"
                  :class="{ 'bg-hub-surface': activeIndex === activeWorkflowOffset + i }"
                >
                  <div class="size-12 rounded-lg bg-hub-surface overflow-hidden shrink-0">
                    <img
                      v-if="getImageThumb(hit.thumbnail)"
                      :src="getImageThumb(hit.thumbnail)!"
                      :alt="hit.title"
                      loading="lazy"
                      class="w-full h-full object-cover"
                    />
                    <video
                      v-else-if="videoThumbUrl(hit.thumbnail)"
                      :src="videoThumbUrl(hit.thumbnail)!"
                      class="w-full h-full object-cover"
                      muted
                      playsinline
                      preload="metadata"
                    />
                    <div
                      v-else-if="hit.thumbnail && isAudioFile(hit.thumbnail)"
                      class="w-full h-full flex items-center justify-center"
                    >
                      <svg
                        class="w-5 h-5 text-content/20"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="1.5"
                          d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                        />
                      </svg>
                    </div>
                  </div>
                  <div class="min-w-0 flex-1">
                    <p
                      class="text-sm font-medium text-content truncate group-hover:text-brand transition-colors"
                    >
                      {{ hit.title }}
                    </p>
                    <p class="text-xs text-content-muted truncate">
                      {{ hit.creatorName }} · {{ formatUsage(hit.usage) }} runs
                    </p>
                  </div>
                  <span class="text-2xs uppercase tracking-wide text-content/30 shrink-0">
                    {{ hit.mediaTypeLabel }}
                  </span>
                </a>
              </div>
            </section>
          </div>

          <div class="shrink-0 border-t border-white/10 px-6 py-3">
            <p class="text-xs text-content/30 text-center">
              <template v-if="hasBadges && !hasQuery">
                {{ displayedWorkflows.length }} workflow{{
                  displayedWorkflows.length !== 1 ? 's' : ''
                }}
                matching {{ store.filterBadges.value.length }} filter{{
                  store.filterBadges.value.length !== 1 ? 's' : ''
                }}
                ·
                <button
                  class="text-content-muted hover:text-content-secondary underline cursor-pointer"
                  @click="clearAll"
                >
                  Clear all
                </button>
              </template>
              <template v-else>
                <span class="hidden sm:inline"
                  >↑↓ to navigate · Enter to select · Esc to close</span
                >
                <span class="sm:hidden">Esc to close</span>
              </template>
            </p>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>
