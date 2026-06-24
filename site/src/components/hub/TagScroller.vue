<script setup lang="ts">
import { ref, useTemplateRef } from 'vue';
import { useResizeObserver, useEventListener } from '@vueuse/core';
import { ChevronLeft, ChevronRight } from 'lucide-vue-next';
import { Badge } from '@/components/ui/badge';
import { tagDisplayName } from '@/lib/tag-aliases';
import { tagPath } from '@/lib/routes';

withDefaults(
  defineProps<{
    tags: string[];
    locale: string;
    prevLabel?: string;
    nextLabel?: string;
  }>(),
  { prevLabel: 'Scroll tags left', nextLabel: 'Scroll tags right' }
);

const scroller = useTemplateRef<HTMLElement>('scroller');
const canPrev = ref(false);
const canNext = ref(false);

// In RTL, scrollLeft starts at 0 and runs negative, so normalize to a 0..max
// "distance from start" before the edge math — keeps prev/next correct either way.
function syncEdges() {
  const el = scroller.value;
  if (!el) return;
  const start = Math.abs(el.scrollLeft);
  canPrev.value = start > 1;
  canNext.value = start < el.scrollWidth - el.clientWidth - 1;
}

function scroll(direction: 1 | -1) {
  const el = scroller.value;
  if (!el) return;
  const sign = getComputedStyle(el).direction === 'rtl' ? -1 : 1;
  el.scrollBy({ left: sign * direction * el.clientWidth * 0.8, behavior: 'smooth' });
}

useEventListener(scroller, 'scroll', syncEdges, { passive: true });
useResizeObserver(scroller, syncEdges);

const tagLabel = (tag: string) => tagDisplayName(tag).toLowerCase().replace(/\s+/g, '-');
</script>

<template>
  <div class="flex items-center gap-1.5">
    <button
      v-if="canPrev"
      type="button"
      class="flex size-6 shrink-0 items-center justify-center rounded-full border border-divider bg-page text-content-secondary transition-colors hover:text-content focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      :aria-label="prevLabel"
      @click.stop="scroll(-1)"
    >
      <ChevronLeft class="size-4" aria-hidden="true" />
    </button>

    <div
      ref="scroller"
      data-testid="tag-pills"
      class="flex min-w-0 flex-1 snap-x snap-proximity items-center gap-1.5 overflow-x-auto scrollbar-hide scroll-smooth"
    >
      <a
        v-for="tag in tags"
        :key="tag"
        :href="tagPath(tag, locale)"
        class="tag-link shrink-0 snap-start"
        @click.stop
      >
        <Badge
          variant="hub-pill"
          class="whitespace-nowrap transition-colors hover:bg-hub-surface-hover"
        >
          {{ tagLabel(tag) }}
        </Badge>
      </a>
    </div>

    <button
      v-if="canNext"
      type="button"
      class="flex size-6 shrink-0 items-center justify-center rounded-full border border-divider bg-page text-content-secondary transition-colors hover:text-content focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      :aria-label="nextLabel"
      @click.stop="scroll(1)"
    >
      <ChevronRight class="size-4" aria-hidden="true" />
    </button>
  </div>
</template>
