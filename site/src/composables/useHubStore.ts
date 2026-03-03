import { ref } from 'vue';

/**
 * Shared reactive store for cross-island communication on the hub page.
 * Module-level refs are singletons — all Vue islands that import this
 * composable share the same reactive state.
 */
const mobileDrawerOpen = ref(false);
const searchFocusTrigger = ref(0);

export function useHubStore() {
  return {
    mobileDrawerOpen,
    searchFocusTrigger,

    toggleMobileDrawer() {
      mobileDrawerOpen.value = !mobileDrawerOpen.value;
    },

    closeMobileDrawer() {
      mobileDrawerOpen.value = false;
    },

    requestSearchFocus() {
      searchFocusTrigger.value++;
    },
  };
}
