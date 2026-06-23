<script setup lang="ts">
import { ref, useTemplateRef } from 'vue';
import { useResizeObserver, useEventListener } from '@vueuse/core';
import { ChevronLeft, ChevronRight } from 'lucide-vue-next';
import { Badge } from '@/components/ui/badge';
import { tagDisplayName } from '@/lib/tag-aliases';
import { tagPath } from '@/lib/routes';

defineProps<{
  tags: string[];
  locale: string;
}>();

const scroller = useTemplateRef<HTMLElement>('scroller');
const canPrev = ref(false);
const canNext = ref(false);

function syncEdges() {
  const el = scroller.value;
  if (!el) return;
  canPrev.value = el.scrollLeft > 1;
  canNext.value = el.scrollLeft < el.scrollWidth - el.clientWidth - 1;
}

function scroll(direction: 1 | -1) {
  scroller.value?.scrollBy({
    left: direction * scroller.value.clientWidth * 0.8,
    behavior: 'smooth',
  });
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
      aria-label="Scroll tags left"
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
      aria-label="Scroll tags right"
      @click.stop="scroll(1)"
    >
      <ChevronRight class="size-4" aria-hidden="true" />
    </button>
  </div>
</template>
