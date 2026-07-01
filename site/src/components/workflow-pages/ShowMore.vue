<script setup lang="ts">
/** Reveals slotted overflow content behind a "Show more" toggle (reka-ui). */
import { ref } from 'vue';
import { CollapsibleRoot, CollapsibleContent, CollapsibleTrigger } from 'reka-ui';

defineProps<{ moreLabel: string; lessLabel: string }>();

const open = ref(false);
</script>

<template>
  <CollapsibleRoot v-model:open="open">
    <CollapsibleContent
      class="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down"
    >
      <div class="pt-6 lg:pt-8">
        <slot />
      </div>
    </CollapsibleContent>

    <div class="mt-8 flex justify-center">
      <CollapsibleTrigger
        class="flex h-11 items-center justify-center rounded-2xl border-2 border-brand px-6 font-display text-sm font-extrabold uppercase tracking-[0.05em] text-brand transition-colors hover:bg-brand/10"
      >
        <span class="ppformula-text-center-sm">{{ open ? lessLabel : moreLabel }}</span>
      </CollapsibleTrigger>
    </div>
  </CollapsibleRoot>
</template>
