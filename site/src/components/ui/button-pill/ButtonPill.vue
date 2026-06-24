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
  class?: HTMLAttributes['class'];
  disabled?: boolean;
}

const {
  as = 'button',
  asChild,
  variant,
  size,
  iconPosition,
  class: className,
  disabled,
} = defineProps<Props>();
</script>

<template>
  <Primitive
    data-slot="button-pill"
    :data-variant="variant"
    :data-size="size"
    :as="as"
    :as-child="asChild"
    :disabled="disabled"
    :class="cn(buttonPillVariants({ variant, size, iconPosition }), className)"
  >
    <span class="ppformula-text-center relative leading-none transition-all duration-500">
      <slot />
    </span>
    <span :class="buttonPillBadgeVariants({ variant, size, iconPosition })" aria-hidden="true">
      <span class="inline-flex transition-transform duration-500">
        <slot name="icon">
          <ChevronRight class="size-4" :stroke-width="2" />
        </slot>
      </span>
    </span>
  </Primitive>
</template>
