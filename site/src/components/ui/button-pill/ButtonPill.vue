<script setup lang="ts">
import { ChevronRight } from 'lucide-vue-next';
import { Primitive } from 'reka-ui';
import type { PrimitiveProps } from 'reka-ui';
import type { HTMLAttributes } from 'vue';
import { cn } from '@/lib/utils';
import type { ButtonPillVariants } from '.';
import { buttonPillBadgeVariants, buttonPillVariants } from '.';

interface Props extends PrimitiveProps {
  variant?: ButtonPillVariants['variant'];
  size?: ButtonPillVariants['size'];
  iconPosition?: ButtonPillVariants['iconPosition'];
  reveal?: boolean;
  class?: HTMLAttributes['class'];
  disabled?: boolean;
  href?: string;
  target?: string;
  rel?: string;
}

const {
  as = 'button',
  asChild,
  variant,
  size,
  iconPosition = 'right',
  reveal = false,
  class: className,
  disabled,
  href,
  target,
  rel,
} = defineProps<Props>();

// Reveal always pins the icon to the start, so it implies a left icon position.
const resolvedIconPosition = reveal ? 'left' : iconPosition;
</script>

<template>
  <Primitive
    data-slot="button-pill"
    :data-variant="variant"
    :data-size="size"
    :as="as"
    :as-child="asChild"
    :disabled="disabled"
    :href="href"
    :target="target"
    :rel="rel"
    :class="
      cn(
        buttonPillVariants({ variant, size, iconPosition: resolvedIconPosition, reveal }),
        className
      )
    "
  >
    <span
      v-if="reveal"
      class="grid grid-cols-[0fr] transition-[grid-template-columns] duration-500 group-hover/button-pill:grid-cols-[1fr] group-hover/pill-trigger:grid-cols-[1fr]"
    >
      <span class="overflow-hidden">
        <span class="ppformula-text-center relative leading-none">
          <slot />
        </span>
      </span>
    </span>
    <span v-else class="ppformula-text-center relative leading-none transition-all duration-500">
      <slot />
    </span>
    <span
      :class="
        buttonPillBadgeVariants({ variant, size, iconPosition: resolvedIconPosition, reveal })
      "
      aria-hidden="true"
    >
      <span class="inline-flex transition-transform duration-500">
        <slot name="icon">
          <ChevronRight class="size-4" :stroke-width="2" />
        </slot>
      </span>
    </span>
  </Primitive>
</template>
