<script setup lang="ts">
import { ref, computed, onMounted, useTemplateRef, nextTick } from 'vue';
import { badgeVariants } from '../ui/badge';

interface BadgeItem {
  label: string;
  href: string;
}

defineProps<{
  items: BadgeItem[];
}>();

const expanded = ref(false);
const needsCollapse = ref(false);
const hiddenCount = ref(0);
const fullHeight = ref(0);
const contentRef = useTemplateRef<HTMLElement>('content');

// ~2 rows of h-6 badges with gap-2 (8px): 24 + 8 + 24 = 56px
const COLLAPSED_HEIGHT = 56;

// Count how many pills fall below the collapsed fold so the toggle can read "+N more".
function measure() {
  const el = contentRef.value;
  if (!el) return;
  fullHeight.value = el.scrollHeight;
  needsCollapse.value = el.scrollHeight > COLLAPSED_HEIGHT + 4;
  if (!needsCollapse.value) {
    hiddenCount.value = 0;
    return;
  }
  const pills = Array.from(el.querySelectorAll<HTMLElement>('[data-pill]'));
  const foldBottom = el.getBoundingClientRect().top + COLLAPSED_HEIGHT;
  hiddenCount.value = pills.filter((p) => p.getBoundingClientRect().top >= foldBottom).length;
}

onMounted(async () => {
  await nextTick();
  measure();
  // Re-measure on width changes so the pixel target for the animation stays correct.
  if (contentRef.value && typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(() => measure()).observe(contentRef.value);
  }
});

// Animate to a pixel height (CSS can't transition to `max-height: none`); after
// expanding, allow it to grow freely so wrapping never clips.
const maxHeightStyle = computed(() => {
  if (!needsCollapse.value) return undefined;
  return expanded.value ? `${fullHeight.value}px` : `${COLLAPSED_HEIGHT}px`;
});

const toggleLabel = computed(() =>
  expanded.value ? 'Show less' : `${hiddenCount.value} more`
);
</script>

<template>
  <div class="flex flex-col gap-2">
    <div
      ref="content"
      class="flex flex-wrap gap-2 overflow-hidden motion-safe:transition-[max-height] motion-safe:duration-300 motion-safe:ease-out"
      :style="{ maxHeight: maxHeightStyle }"
    >
      <a
        v-for="item in items"
        :key="item.label"
        :href="item.href"
        data-pill
        :class="badgeVariants({ variant: 'hub-pill' })"
        data-astro-prefetch
      >
        {{ item.label }}
      </a>
    </div>
    <!-- Toggle is a compact pill left-aligned to the grid's edge (not a
         full-width row), so its icon lines up with the pills above it. -->
    <button
      v-if="needsCollapse"
      type="button"
      class="group inline-flex h-6 w-fit shrink-0 items-center gap-1 rounded-full border border-divider pl-2.5 pr-3 text-xs font-medium text-content-secondary hover:bg-hub-surface hover:text-content transition-colors"
      :aria-expanded="expanded"
      @click="expanded = !expanded"
    >
      <!-- Plus that morphs to minus when expanded: the vertical stroke collapses. -->
      <svg class="size-3.5 shrink-0" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M3.5 8h9" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
        <path
          class="origin-center transition-transform duration-200"
          :class="{ 'rotate-90 opacity-0': expanded }"
          d="M8 3.5v9"
          stroke="currentColor"
          stroke-width="1.4"
          stroke-linecap="round"
        />
      </svg>
      <span class="tabular-nums">{{ toggleLabel }}</span>
    </button>
  </div>
</template>
