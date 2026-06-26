import { ref } from 'vue';

/**
 * Shared reactive store for cross-island communication on the hub page.
 * Module-level refs are singletons — all Vue islands that import this
 * composable share the same reactive state.
 */

export interface FilterBadge {
  type: 'tag' | 'model' | 'mode';
  value: string;
}

export type HubTab = 'all' | 'nodeGraphs' | 'comfyApps';
export type HubSort = 'popular' | 'newest';

const mobileDrawerOpen = ref(false);
const searchFocusTrigger = ref(0);
const filterBadges = ref<FilterBadge[]>([]);

const activeTab = ref<HubTab>('all');
const sortBy = ref<HubSort>('popular');

export function useHubStore() {
  return {
    mobileDrawerOpen,
    searchFocusTrigger,
    filterBadges,
    activeTab,
    sortBy,

    setTab(tab: HubTab) {
      activeTab.value = tab;
    },

    cycleSort() {
      sortBy.value = sortBy.value === 'popular' ? 'newest' : 'popular';
    },

    toggleMobileDrawer() {
      mobileDrawerOpen.value = !mobileDrawerOpen.value;
    },

    closeMobileDrawer() {
      mobileDrawerOpen.value = false;
    },

    requestSearchFocus() {
      searchFocusTrigger.value++;
    },

    addBadge(badge: FilterBadge) {
      const exists = filterBadges.value.some(
        (b) => b.type === badge.type && b.value === badge.value
      );
      if (!exists) {
        filterBadges.value.push(badge);
      }
    },

    removeBadge(badge: FilterBadge) {
      filterBadges.value = filterBadges.value.filter(
        (b) => !(b.type === badge.type && b.value === badge.value)
      );
    },

    toggleBadge(badge: FilterBadge) {
      const exists = filterBadges.value.some(
        (b) => b.type === badge.type && b.value === badge.value
      );
      if (exists) {
        filterBadges.value = filterBadges.value.filter(
          (b) => !(b.type === badge.type && b.value === badge.value)
        );
      } else {
        filterBadges.value.push(badge);
      }
    },

    clearBadges() {
      filterBadges.value = [];
    },
  };
}
