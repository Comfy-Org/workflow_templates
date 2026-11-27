<script setup lang="ts">
/**
 * AuthorLink - reusable author/creator attribution control.
 *
 * Pairs an `Avatar` with a display name behind one shared hover/focus
 * target: hovering or keyboard-focusing lifts a pill highlight behind the
 * pair, underlines the name, and rings the avatar, so the pair reads as a
 * single clickable "person" affordance rather than a caption. Padding is
 * cancelled by an equal negative margin, so the highlight never shifts
 * surrounding layout.
 *
 * The pill background is applied directly on the root via plain `hover:`/
 * `focus-visible:` (it's reacting to its own pointer/focus state), while the
 * name and avatar coordinate off that same state via a named Tailwind group
 * (`group/author` + `group-hover/author:`/`group-focus-visible/author:`) —
 * named so nesting `AuthorLink` inside another element's own `group` (e.g.
 * `HubWorkflowCard`'s card-hover group) never cross-triggers either one.
 *
 * Renders as an `<a>` when `href` is set, so the hover/focus treatment only
 * ever appears on something actually clickable; otherwise renders a plain
 * `<div>` wrapper with no interactive styling (e.g. a creator with no
 * profile page).
 */
import { computed } from 'vue';
import type { HTMLAttributes } from 'vue';
import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface Props {
  /** Display name shown next to the avatar. */
  name: string;
  /** Avatar image URL. When omitted (or it fails to load) `Avatar` falls back to the name's initial. */
  avatarUrl?: string | null;
  /** Renders as an `<a href>` when set; otherwise a non-interactive wrapper with no hover treatment. */
  href?: string | null;
  /**
   * Overrides the hover/focus pill background utility classes. Defaults to
   * the theme's hover-surface token; pass a different `hover:bg-*
   * focus-visible:bg-*` pair for contexts with a different backdrop (e.g.
   * the white-on-dark featured carousel).
   */
  highlightClass?: HTMLAttributes['class'];
  /** Extra classes for the avatar (size, responsive breakpoints, etc). */
  avatarClass?: HTMLAttributes['class'];
  /** Extra classes for the name text. */
  nameClass?: HTMLAttributes['class'];
  class?: HTMLAttributes['class'];
}

const props = withDefaults(defineProps<Props>(), {
  avatarClass: 'size-5',
  highlightClass: 'hover:bg-hub-surface-hover focus-visible:bg-hub-surface-hover',
});

const isLink = computed(() => Boolean(props.href));
const tag = computed(() => (isLink.value ? 'a' : 'div'));
</script>

<template>
  <component
    :is="tag"
    :href="href || undefined"
    data-testid="author-link"
    :class="
      cn(
        'flex items-center gap-2 min-w-0 w-fit',
        isLink && [
          'group/author cursor-pointer rounded-full -mx-1.5 -my-0.5 px-1.5 py-0.5',
          'transition-colors motion-reduce:transition-none',
          'outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current',
          highlightClass,
        ],
        props.class
      )
    "
  >
    <Avatar
      :src="avatarUrl"
      :name="name"
      :class="
        cn(
          'shrink-0',
          isLink && [
            'transition-shadow motion-reduce:transition-none',
            'group-hover/author:ring-2 group-hover/author:ring-current',
            'group-focus-visible/author:ring-2 group-focus-visible/author:ring-current',
          ],
          avatarClass
        )
      "
    />
    <span
      :class="
        cn(
          'truncate',
          isLink && [
            'underline decoration-transparent decoration-1 underline-offset-[3px]',
            'transition-colors motion-reduce:transition-none',
            'group-hover/author:decoration-current group-focus-visible/author:decoration-current',
          ],
          nameClass
        )
      "
    >
      {{ name }}
    </span>
  </component>
</template>
