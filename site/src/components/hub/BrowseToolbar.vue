<script setup lang="ts">
/**
 * BrowseToolbar — the single filter/sort bar above the workflow grid.
 *
 * Layout (identical desktop + mobile):
 *   left  → segmented Tabs (All / Node graphs / Comfy Apps)
 *   right → Filter (popover with inner Models | Categories multi-select tabs)
 *           + Sort (cycle button: Most Popular ⇄ Newest)
 *
 * Tab + sort state lives in useHubStore so this island drives them while the
 * grid island reads them. Filter selections write to the same store badges the
 * navbar SearchPopover chips and the grid already read — one source of truth.

 */
import { computed, ref, type Component } from 'vue';
import {
  PopoverRoot,
  PopoverTrigger,
  PopoverPortal,
  PopoverContent,
  TabsRoot,
  TabsList,
  TabsTrigger,
  TabsContent,
} from 'reka-ui';
import { LayoutGrid, SlidersHorizontal, ArrowUpDown, ChevronDown, Check } from 'lucide-vue-next';
import { useHubStore, type FilterBadge, type HubTab } from '@/composables/useHubStore';
import { useFacets, type FacetTemplate, type FacetValue } from '@/composables/useFacets';
import { trackFilterApplied } from '@/lib/posthog';
import { IconApps, IconWorkflow } from '@/components/ui/icons';
import type { FacetGroupConfig, ToolbarLabels } from '@/lib/toolbar';

const {
  templates,
  facetsConfig = [],
  labels,
} = defineProps<{
  templates: FacetTemplate[];
  /** Filter facet groups; omit/empty to hide the Filter popover (tabs + sort only). */
  facetsConfig?: FacetGroupConfig[];
  labels: ToolbarLabels;
}>();

const store = useHubStore();

const facetInput = computed<FacetTemplate[]>(() => (facetsConfig.length ? templates : []));
const { facetsByType, isBadgeActive, activeCountForType } = useFacets(facetInput);

/** Show the search-within input only when a group has more values than this. */
const SEARCH_THRESHOLD = 12;

const TABS: { key: HubTab; labelKey: keyof ToolbarLabels; icon: Component }[] = [
  { key: 'all', labelKey: 'all', icon: LayoutGrid },
  { key: 'nodeGraphs', labelKey: 'nodeGraphs', icon: IconWorkflow },
  { key: 'comfyApps', labelKey: 'comfyApps', icon: IconApps },
];

const filterOpen = ref(false);
const activeFacetTab = ref(facetsConfig[0]?.key ?? '');
const facetSearch = ref<Record<string, string>>({});

const totalActiveFilters = computed(() =>
  facetsConfig.reduce((sum, cfg) => sum + activeCountForType(cfg.type), 0)
);

const groups = computed(() =>
  facetsConfig.map((cfg) => ({
    ...cfg,
    values: facetsByType.value[cfg.type]?.values ?? [],
  }))
);

function visibleValues(group: { key: string; values: FacetValue[] }): FacetValue[] {
  const q = (facetSearch.value[group.key] || '').trim().toLowerCase();
  if (!q) return group.values;
  return group.values.filter((v) => v.displayValue.toLowerCase().includes(q));
}

function toggleValue(type: FilterBadge['type'], value: string) {
  store.toggleBadge({ type, value });
  trackFilterApplied(type, value);
}

const sortLabel = computed(() =>
  store.sortBy.value === 'popular' ? labels.sortPopular : labels.sortNewest
);
</script>

<template>
  <!-- Single row at every width. On mobile, inactive tabs and the controls
       collapse to icon-only to save space; labels return at sm+. -->
  <div class="flex items-center justify-between gap-2">
    <TabsRoot
      :model-value="store.activeTab.value"
      class="flex min-w-0 overflow-x-auto scrollbar-hide"
      @update:model-value="store.setTab($event as HubTab)"
    >
      <TabsList
        class="inline-flex items-center gap-1 rounded-xl border border-white/15 bg-white/8 p-1"
      >
        <TabsTrigger
          v-for="tab in TABS"
          :key="tab.key"
          :value="tab.key"
          :aria-label="labels[tab.labelKey]"
          class="group inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold whitespace-nowrap text-content-secondary transition-colors outline-none hover:bg-white/8 hover:text-content data-[state=active]:bg-brand data-[state=active]:text-page data-[state=active]:hover:bg-brand focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1 focus-visible:ring-offset-page sm:px-3.5"
        >
          <component :is="tab.icon" class="size-3.5 shrink-0" aria-hidden="true" />
          <!-- Mobile: only the active tab shows its label (inactive = icon-only).
               sm+: every tab shows its label. -->
          <span
            class="ppformula-text-center-sm max-sm:hidden max-sm:group-data-[state=active]:inline-block"
            >{{ labels[tab.labelKey] }}</span
          >
        </TabsTrigger>
      </TabsList>
    </TabsRoot>

    <!-- Filter + Sort. Icon-only on mobile; labels at sm+. -->
    <div class="flex shrink-0 items-center gap-2">
      <!-- Filter popover — only when facet groups are configured (hub page). -->
      <PopoverRoot v-if="facetsConfig.length" v-model:open="filterOpen">
        <PopoverTrigger
          class="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand sm:px-3.5"
          :class="
            totalActiveFilters > 0
              ? 'bg-brand text-page hover:bg-brand/90'
              : 'border border-white/15 bg-white/8 text-content-secondary hover:bg-white/12 hover:text-content'
          "
          :aria-label="labels.filter"
        >
          <SlidersHorizontal class="size-3.5 shrink-0" aria-hidden="true" />
          <span class="ppformula-text-center-sm max-sm:hidden">{{ labels.filter }}</span>
          <span
            v-if="totalActiveFilters > 0"
            class="ml-0.5 inline-flex min-w-4 items-center justify-center rounded-full bg-page/15 px-1 text-2xs font-bold tabular-nums"
          >
            {{ totalActiveFilters }}
          </span>
          <ChevronDown
            class="size-3 transition-transform max-sm:hidden"
            :class="filterOpen ? 'rotate-180' : ''"
            aria-hidden="true"
          />
        </PopoverTrigger>

        <PopoverPortal>
          <PopoverContent
            align="end"
            :side-offset="8"
            class="z-50 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-white/10 bg-site-dropdown shadow-2xl shadow-black/50 outline-none"
          >
            <TabsRoot v-model="activeFacetTab" class="flex flex-col">
              <!-- Inner facet tabs (Models | Categories) -->
              <TabsList class="flex items-center gap-1 border-b border-white/10 p-2">
                <TabsTrigger
                  v-for="group in groups"
                  :key="group.key"
                  :value="group.key"
                  class="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap text-content-secondary transition-colors outline-none hover:bg-white/5 hover:text-content data-[state=active]:bg-white/8 data-[state=active]:text-content focus-visible:ring-2 focus-visible:ring-brand"
                >
                  {{ group.label }}
                  <span
                    v-if="activeCountForType(group.type) > 0"
                    class="inline-flex min-w-4 items-center justify-center rounded-full bg-brand px-1 text-2xs font-bold text-page tabular-nums"
                  >
                    {{ activeCountForType(group.type) }}
                  </span>
                </TabsTrigger>
              </TabsList>

              <TabsContent
                v-for="group in groups"
                :key="group.key"
                :value="group.key"
                class="flex flex-col outline-none"
              >
                <!-- Search-within (only when the list is long) -->
                <div
                  v-if="group.values.length > SEARCH_THRESHOLD"
                  class="border-b border-white/10 p-2"
                >
                  <input
                    v-model="facetSearch[group.key]"
                    type="search"
                    :placeholder="labels.searchPlaceholder"
                    class="w-full rounded-lg bg-white/5 px-3 py-2 text-xs text-content placeholder:text-content-muted outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  />
                </div>

                <ul
                  class="max-h-72 overflow-y-auto scrollbar-thin py-1"
                  role="listbox"
                  aria-multiselectable="true"
                >
                  <li v-for="val in visibleValues(group)" :key="val.value">
                    <button
                      type="button"
                      role="option"
                      :aria-selected="isBadgeActive(group.type, val.value)"
                      class="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs text-content-secondary transition-colors outline-none hover:bg-white/5 hover:text-content focus-visible:bg-white/5"
                      @click="toggleValue(group.type, val.value)"
                    >
                      <span
                        class="flex size-4 shrink-0 items-center justify-center rounded border transition-colors"
                        :class="
                          isBadgeActive(group.type, val.value)
                            ? 'border-brand bg-brand text-page'
                            : 'border-white/25'
                        "
                        aria-hidden="true"
                      >
                        <Check
                          v-if="isBadgeActive(group.type, val.value)"
                          class="size-3"
                          :stroke-width="3"
                        />
                      </span>
                      <span class="flex-1 truncate">{{ val.displayValue }}</span>
                      <span class="shrink-0 text-content/30 tabular-nums">{{ val.count }}</span>
                    </button>
                  </li>
                  <li
                    v-if="visibleValues(group).length === 0"
                    class="px-3 py-4 text-center text-xs text-content-muted"
                  >
                    {{ labels.noResults }}
                  </li>
                </ul>
              </TabsContent>

              <!-- Footer: clear all (only when filters active) -->
              <div v-if="totalActiveFilters > 0" class="border-t border-white/10 p-2">
                <button
                  type="button"
                  class="w-full rounded-lg px-3 py-2 text-xs font-semibold text-content-secondary transition-colors hover:bg-white/5 hover:text-content"
                  @click="store.clearBadges()"
                >
                  {{ labels.clearAll }}
                </button>
              </div>
            </TabsRoot>
          </PopoverContent>
        </PopoverPortal>
      </PopoverRoot>

      <!-- Sort cycle button -->
      <button
        type="button"
        :aria-label="sortLabel"
        class="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-white/15 bg-white/8 px-2.5 text-xs font-semibold whitespace-nowrap text-content-secondary transition-colors outline-none hover:bg-white/12 hover:text-content focus-visible:ring-2 focus-visible:ring-brand sm:px-3.5"
        @click="store.cycleSort()"
      >
        <ArrowUpDown class="size-3.5 shrink-0" aria-hidden="true" />
        <span class="ppformula-text-center-sm max-sm:hidden">{{ sortLabel }}</span>
      </button>
    </div>
  </div>
</template>
