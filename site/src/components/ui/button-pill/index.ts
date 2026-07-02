import type { VariantProps } from 'class-variance-authority';
import { cva } from 'class-variance-authority';

export { default as ButtonPill } from './ButtonPill.vue';

/**
 * Render modes for {@link ButtonPill}. Exactly one is active at a time.
 *
 * - `animated` — label always visible; the chevron slides across on hover.
 * - `reveal`   — chevron always visible; the label expands from zero width on hover.
 * - `plain`    — label only, no chevron, no motion (still recolors on hover).
 * - `icon`     — the chevron circle only, a compact "closed pill".
 */
export type ButtonPillMode = 'animated' | 'reveal' | 'plain' | 'icon';

/**
 * Shared hover recolor: fill with brand yellow when the pill itself or an
 * ancestor card (`group/pill-trigger`) is hovered. Reused by every yellow surface.
 */
const HOVER_FILL =
  'group-hover/button-pill:bg-primary-comfy-yellow group-hover/button-pill:text-primary-comfy-ink group-hover/pill-trigger:bg-primary-comfy-yellow group-hover/pill-trigger:text-primary-comfy-ink';

export const buttonPillVariants = cva(
  'group/button-pill isolate relative inline-flex w-fit cursor-pointer items-center overflow-hidden rounded-2xl text-sm font-bold uppercase tracking-wider text-nowrap transition-all duration-500 disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        solid: 'bg-primary-comfy-yellow text-primary-comfy-ink',
        ghost: 'bg-transparent text-primary-comfy-yellow',
      },
      size: {
        default: 'h-10 py-2.5',
        lg: 'h-14 py-4',
      },
      mode: {
        animated: '',
        reveal: '',
        plain: 'px-5',
        icon: 'shrink-0 justify-center rounded-xl py-0 transition-colors duration-300',
      },
      iconPosition: { right: '', left: '' },
    },
    compoundVariants: [
      {
        mode: 'animated',
        size: 'default',
        iconPosition: 'right',
        class:
          'ps-6 pe-14 group-hover/pill-trigger:ps-14 group-hover/pill-trigger:pe-6 hover:ps-14 hover:pe-6',
      },
      {
        mode: 'animated',
        size: 'default',
        iconPosition: 'left',
        class:
          'ps-14 pe-6 group-hover/pill-trigger:ps-6 group-hover/pill-trigger:pe-14 hover:ps-6 hover:pe-14',
      },
      {
        mode: 'animated',
        size: 'lg',
        iconPosition: 'right',
        class:
          'ps-8 pe-16 group-hover/pill-trigger:ps-16 group-hover/pill-trigger:pe-8 hover:ps-16 hover:pe-8',
      },
      {
        mode: 'animated',
        size: 'lg',
        iconPosition: 'left',
        class:
          'ps-16 pe-8 group-hover/pill-trigger:ps-8 group-hover/pill-trigger:pe-16 hover:ps-8 hover:pe-16',
      },
      {
        mode: 'reveal',
        size: 'default',
        class: 'ps-9 pe-0 group-hover/button-pill:pe-5 group-hover/pill-trigger:pe-5',
      },
      { mode: 'reveal', variant: 'solid', class: `bg-transparent text-content ${HOVER_FILL}` },
      { mode: 'icon', size: 'default', class: 'size-8' },
      { mode: 'icon', size: 'lg', class: 'size-12' },
      { mode: 'icon', variant: 'solid', class: `bg-white/20 text-white ${HOVER_FILL}` },
    ],
    defaultVariants: {
      variant: 'solid',
      size: 'default',
      mode: 'animated',
      iconPosition: 'right',
    },
  }
);

/**
 * The absolutely-positioned chevron badge used by the `animated` and `reveal`
 * modes. In `animated` it glides to the opposite edge on hover; in `reveal` it
 * stays pinned at the leading edge.
 */
export const buttonPillBadgeVariants = cva(
  'absolute z-10 flex items-center justify-center rounded-xl transition-all duration-500',
  {
    variants: {
      variant: {
        solid: `bg-white/20 text-white ${HOVER_FILL}`,
        ghost: 'bg-primary-comfy-yellow text-primary-comfy-ink',
      },
      size: {
        default: 'size-8',
        lg: 'size-12',
      },
      mode: { animated: '', reveal: '', plain: '', icon: '' },
      iconPosition: { right: '', left: '' },
    },
    compoundVariants: [
      {
        mode: 'animated',
        size: 'default',
        iconPosition: 'right',
        class:
          'right-1 group-hover/button-pill:right-[calc(100%-36px)] group-hover/pill-trigger:right-[calc(100%-36px)]',
      },
      {
        mode: 'animated',
        size: 'default',
        iconPosition: 'left',
        class:
          'left-1 group-hover/button-pill:left-[calc(100%-36px)] group-hover/pill-trigger:left-[calc(100%-36px)]',
      },
      {
        mode: 'animated',
        size: 'lg',
        iconPosition: 'right',
        class:
          'right-1 group-hover/button-pill:right-[calc(100%-52px)] group-hover/pill-trigger:right-[calc(100%-52px)]',
      },
      {
        mode: 'animated',
        size: 'lg',
        iconPosition: 'left',
        class:
          'left-1 group-hover/button-pill:left-[calc(100%-52px)] group-hover/pill-trigger:left-[calc(100%-52px)]',
      },
      { mode: 'reveal', class: 'left-1 top-1/2 -translate-y-1/2' },
    ],
    defaultVariants: {
      variant: 'solid',
      size: 'default',
      mode: 'animated',
      iconPosition: 'right',
    },
  }
);

export type ButtonPillVariants = VariantProps<typeof buttonPillVariants>;
