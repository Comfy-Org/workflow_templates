<script setup lang="ts">
import { computed } from 'vue';

/**
 * Glass box of provider logos overlaid on a card image. Presentational and
 * SSR-safe (no client directive needed) so it renders to static HTML in Astro
 * and hydrates inside Vue islands alike. Shared by the workflow card and the
 * landing hero / cards.
 *
 * The box is a slim fixed-height glass pill. A single logo keeps it square (so
 * it never reads as an oval); several logos let it grow wider. The logo size is
 * the same compact size in every case.
 */
const props = withDefaults(
  defineProps<{
    logos: { src: string; name: string }[];
    /** Positioning classes for the root, e.g. "absolute top-4 right-4 z-10". */
    class?: string;
    max?: number;
  }>(),
  { max: 3 }
);

const shown = computed(() => props.logos.slice(0, props.max));
// Square for one logo, auto-width pill for several — same height either way.
const boxClass = computed(() => (shown.value.length > 1 ? 'h-10 w-auto px-2' : 'size-10'));
</script>

<template>
  <div
    v-if="shown.length"
    :class="[
      'flex items-center justify-center gap-1 rounded-3xl bg-transparency-white-t8 backdrop-blur-sm',
      boxClass,
      props.class,
    ]"
  >
    <img
      v-for="logo in shown"
      :key="logo.name"
      :src="logo.src"
      :alt="logo.name"
      :title="logo.name"
      class="size-7 rounded-full object-contain"
      loading="lazy"
    />
  </div>
</template>
