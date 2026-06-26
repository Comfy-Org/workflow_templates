<script setup lang="ts">
import { navExternalLinks } from '@/config/nav-routes';
import NodeBadge from './NodeBadge.vue';

const { stars } = defineProps<{
  stars: string;
}>();
</script>

<template>
  <a
    :href="navExternalLinks.github"
    target="_blank"
    rel="noopener noreferrer"
    :aria-label="`ComfyUI on GitHub — ${stars} stars`"
    class="hidden shrink-0 items-center gap-1 lg:flex"
  >
    <NodeBadge
      :segments="[{ text: stars }]"
      segment-class="px-0.5 py-0 sm:py-0 lg:py-0"
      text-class="text-2xs translate-y-0 scale-x-90 tracking-tight"
      size-class="h-5 sm:h-5"
    />
    <span
      class="bg-brand block size-6 shrink-0"
      aria-hidden="true"
      style="mask: url('/icons/social/github.svg') center / contain no-repeat"
    />
  </a>
</template>
