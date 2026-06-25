<script setup lang="ts">
/** Card tag row: as many whole tags as fit, then a "+N" chip (tooltip lists the rest). Falls back to one neutral chip when empty so cards stay equal. */
import { computed, ref, watch, nextTick } from 'vue';
import { useResizeObserver } from '@vueuse/core';
import { Badge } from '@/components/ui/badge';
import { Tooltip } from '@/components/ui/tooltip';
import { tagDisplayName } from '@/lib/tag-aliases';
import { tagPath } from '@/lib/routes';

const props = withDefaults(
  defineProps<{ tags: string[]; locale: string; fallbackLabel?: string }>(),
  { fallbackLabel: '' }
);

const allTags = computed(() =>
  props.tags.map((tag) => ({
    key: tag,
    label: tagDisplayName(tag),
    href: tagPath(tag, props.locale),
  }))
);

const row = ref<HTMLElement | null>(null);
const measure = ref<HTMLElement | null>(null);
const visibleCount = ref(allTags.value.length);

const OVERFLOW_RESERVE = 52;
const GAP = 6;

function recompute() {
  const available = row.value?.clientWidth ?? 0;
  const chips = Array.from(measure.value?.children ?? []) as HTMLElement[];
  if (!available || !chips.length) return;

  const total = chips.reduce((sum, c, i) => sum + c.offsetWidth + (i ? GAP : 0), 0);
  if (total <= available) {
    visibleCount.value = chips.length;
    return;
  }

  let used = 0;
  let count = 0;
  for (let i = 0; i < chips.length; i++) {
    const w = chips[i].offsetWidth + (i ? GAP : 0);
    if (used + w + GAP + OVERFLOW_RESERVE > available) break;
    used += w;
    count++;
  }
  // 0 allowed: a too-wide first tag collapses to just "+N", never a clipped chip.
  visibleCount.value = count;
}

useResizeObserver(row, recompute);
watch(allTags, () => nextTick(recompute), { immediate: true });

const visibleTags = computed(() => allTags.value.slice(0, visibleCount.value));
const hiddenTags = computed(() => allTags.value.slice(visibleCount.value));
const overflowText = computed(() => hiddenTags.value.map((t) => t.label).join(', '));
const overflowAriaLabel = computed(
  () => `Show ${hiddenTags.value.length} more tags: ${overflowText.value}`
);
</script>

<template>
  <div
    ref="row"
    data-testid="tag-row"
    class="relative flex h-6 min-w-0 items-center gap-1.5 overflow-hidden"
  >
    <Badge v-if="!allTags.length && fallbackLabel" variant="hub-pill" class="whitespace-nowrap">
      {{ fallbackLabel }}
    </Badge>

    <template v-else>
      <a
        v-for="tag in visibleTags"
        :key="tag.key"
        :href="tag.href"
        class="tag-link shrink-0"
        @click.stop
      >
        <Badge
          variant="hub-pill"
          class="whitespace-nowrap transition-colors hover:bg-hub-surface-hover"
        >
          {{ tag.label }}
        </Badge>
      </a>

      <Tooltip v-if="hiddenTags.length" :text="overflowText">
        <Badge
          as="button"
          type="button"
          variant="hub-pill"
          data-testid="tag-overflow"
          :aria-label="overflowAriaLabel"
          class="shrink-0 whitespace-nowrap tabular-nums focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          @click.stop
        >
          +{{ hiddenTags.length }}
        </Badge>
      </Tooltip>
    </template>

    <div
      ref="measure"
      aria-hidden="true"
      class="pointer-events-none invisible absolute flex items-center gap-1.5"
    >
      <Badge
        v-for="tag in allTags"
        :key="`m:${tag.key}`"
        variant="hub-pill"
        class="whitespace-nowrap"
      >
        {{ tag.label }}
      </Badge>
    </div>
  </div>
</template>
