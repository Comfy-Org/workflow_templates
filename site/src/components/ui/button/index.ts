import type { VariantProps } from 'class-variance-authority';
import { cva } from 'class-variance-authority';

export { default as Button } from './Button.vue';

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive:
          'bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60',
        outline:
          'border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50',
        link: 'text-primary underline-offset-4 hover:underline',
        pill: 'rounded-full bg-hub-surface text-content font-normal hover:bg-hub-surface-hover cursor-pointer',
        'pill-active': 'rounded-full bg-white text-page font-bold cursor-pointer',
        'pill-outline':
          'rounded-full border border-divider text-content font-normal hover:bg-hub-surface-hover cursor-pointer',
        'hub-secondary':
          'rounded-full bg-hub-surface text-content font-bold hover:bg-hub-surface-hover',
        'brand-solid':
          'rounded-2xl bg-brand text-page font-semibold tracking-wider hover:opacity-90',
        'brand-outline':
          'rounded-2xl border border-brand text-brand font-semibold tracking-wider hover:bg-brand hover:text-page',
        nav: 'text-primary-warm-white hover:text-primary-comfy-yellow h-auto justify-between px-0 py-1 text-start text-2xl font-medium',
        'nav-muted':
          'text-primary-comfy-canvas hover:text-primary-comfy-yellow h-auto w-full justify-between px-0 py-1 text-start text-2xl font-medium uppercase',
        'nav-link':
          "text-primary-comfy-yellow h-auto justify-start px-0 py-1 text-base uppercase hover:opacity-90 [&_svg:not([class*='size-'])]:size-6",
      },
      size: {
        default: 'h-9 px-4 py-2 has-[>svg]:px-3',
        sm: 'h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5',
        lg: 'h-10 rounded-md px-6 has-[>svg]:px-4',
        icon: 'size-9',
        'icon-sm': 'size-8',
        'icon-lg': 'size-10',
        pill: 'h-8 px-4 py-2 text-xs',
        'pill-icon': 'h-8 pl-3 pr-4 py-2 text-xs gap-1.5',
        nav: 'px-6 py-2.5 text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);
export type ButtonVariants = VariantProps<typeof buttonVariants>;
