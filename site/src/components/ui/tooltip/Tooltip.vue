<script setup lang="ts">
/** Minimal reka-ui tooltip. Shows `text` on hover/focus of the slotted trigger. */
import {
  TooltipRoot,
  TooltipTrigger,
  TooltipPortal,
  TooltipContent,
  TooltipProvider,
} from 'reka-ui';

withDefaults(defineProps<{ text: string; disabled?: boolean; delay?: number }>(), {
  disabled: false,
  delay: 200,
});
</script>

<template>
  <TooltipProvider :delay-duration="delay">
    <TooltipRoot :disabled="disabled">
      <TooltipTrigger as-child>
        <slot />
      </TooltipTrigger>
      <TooltipPortal>
        <TooltipContent
          :side-offset="6"
          class="z-50 max-w-xs rounded-lg border border-white/10 bg-site-dropdown px-2.5 py-1.5 text-xs text-content shadow-lg shadow-black/50"
        >
          {{ text }}
        </TooltipContent>
      </TooltipPortal>
    </TooltipRoot>
  </TooltipProvider>
</template>
