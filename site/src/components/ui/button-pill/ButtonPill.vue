<script setup lang="ts">
/**
 * ButtonPill — the brand pill CTA (yellow "run" button used across the hub).
 *
 * A single `mode` selects how the label and chevron behave:
 * - `animated` (default) — label always shown; the chevron glides across on hover.
 * - `reveal` — chevron always shown; the label expands from zero width on hover.
 * - `plain` — label only, no chevron, no motion (still recolors on hover).
 * - `icon` — just the chevron circle, a compact "closed pill" for tight footers.
 *
 * Renders as a `<button>` by default; pass `as="a"` (+ `href`) for a link, or
 * `as-child` to merge props onto a custom child (reka-ui `Primitive`). Slot the
 * label as default content; override the icon via the `icon` slot.
 *
 * @example
 * <ButtonPill as="a" href="/run" mode="reveal">Try now</ButtonPill>
 * <ButtonPill mode="icon" aria-label="Open workflow" />
 */
import { computed } from 'vue';
import { ChevronRight } from 'lucide-vue-next';
import { Primitive } from 'reka-ui';
import type { PrimitiveProps } from 'reka-ui';
import type { HTMLAttributes } from 'vue';
import { cn } from '@/lib/utils';
import type { ButtonPillMode, ButtonPillVariants } from '.';
import { buttonPillBadgeVariants, buttonPillVariants } from '.';

const {
  as = 'button',
  asChild,
  variant,
  size,
  mode = 'animated',
  iconPosition = 'right',
  class: className,
  disabled,
  href,
  target,
  rel,
} = defineProps<
  PrimitiveProps & {
    variant?: ButtonPillVariants['variant'];
    size?: ButtonPillVariants['size'];
    mode?: ButtonPillMode;
    iconPosition?: ButtonPillVariants['iconPosition'];
    class?: HTMLAttributes['class'];
    disabled?: boolean;
    href?: string;
    target?: string;
    rel?: string;
  }
>();

// `reveal` keeps the chevron pinned at the leading edge, so it reads as left-placed.
const resolvedIconPosition = computed(() => (mode === 'reveal' ? 'left' : iconPosition));
const showLabel = computed(() => mode !== 'icon');
const showBadge = computed(() => mode === 'animated' || mode === 'reveal');
</script>

<template>
  <Primitive
    :as="as"
    :as-child="asChild"
    :disabled="disabled"
    :href="href"
    :target="target"
    :rel="rel"
    data-slot="button-pill"
    :data-variant="variant"
    :data-size="size"
    :data-mode="mode"
    :class="
      cn(buttonPillVariants({ variant, size, mode, iconPosition: resolvedIconPosition }), className)
    "
  >
    <template v-if="showLabel">
      <span
        v-if="mode === 'reveal'"
        class="grid grid-cols-[0fr] transition-[grid-template-columns] duration-500 group-hover/button-pill:grid-cols-[1fr] group-hover/pill-trigger:grid-cols-[1fr]"
      >
        <span class="overflow-hidden">
          <span class="ppformula-text-center relative leading-none"><slot /></span>
        </span>
      </span>
      <span
        v-else
        class="ppformula-text-center-sm relative leading-none transition-all duration-500"
      >
        <slot />
      </span>
    </template>

    <span
      v-if="showBadge"
      :class="buttonPillBadgeVariants({ variant, size, mode, iconPosition: resolvedIconPosition })"
      aria-hidden="true"
    >
      <span class="inline-flex transition-transform duration-500">
        <slot name="icon"><ChevronRight class="size-4" :stroke-width="2" /></slot>
      </span>
    </span>

    <slot v-if="mode === 'icon'" name="icon">
      <ChevronRight class="size-4" :stroke-width="2" />
    </slot>
  </Primitive>
</template>
