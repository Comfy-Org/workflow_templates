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
 * Renders as an `<a>` when `href` is set, so the hover/focus treatment only
 * ever appears on something actually clickable; otherwise renders a plain
 * `<div>` wrapper with no interactive styling (e.g. a creator with no
 * profile page).
 */
import { computed } from 'vue';
import type { HTMLAttributes, StyleValue } from 'vue';
import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface Props {
  /** Display name shown next to the avatar. */
  name: string;
  /** Avatar image URL. When omitted (or it fails to load) `Avatar` falls back to the name's initial. */
  avatarUrl?: string | null;
  /** Renders as an `<a href>` when set; otherwise a non-interactive wrapper with no hover treatment. */
  href?: string | null;
  /** Overrides the hover/focus pill color. Any valid CSS color; defaults to a subtle theme-aware overlay. */
  highlight?: string | null;
  /** Extra classes for the avatar (size, responsive breakpoints, etc). */
  avatarClass?: HTMLAttributes['class'];
  /** Extra classes for the name text. */
  nameClass?: HTMLAttributes['class'];
  class?: HTMLAttributes['class'];
}

const props = withDefaults(defineProps<Props>(), {
  avatarClass: 'size-5',
});

const isLink = computed(() => Boolean(props.href));
const tag = computed(() => (isLink.value ? 'a' : 'div'));
const rootStyle = computed<StyleValue | undefined>(() =>
  props.highlight ? { '--author-link-highlight': props.highlight } : undefined
);
</script>

<template>
  <component
    :is="tag"
    :href="href || undefined"
    :style="rootStyle"
    data-testid="author-link"
    :class="cn('flex items-center gap-2 min-w-0 w-fit', isLink && 'author-link', props.class)"
  >
    <Avatar
      :src="avatarUrl"
      :name="name"
      :class="cn('shrink-0', isLink && 'author-link-avatar', avatarClass)"
    />
    <span :class="cn('truncate', isLink && 'author-link-name', nameClass)">{{ name }}</span>
  </component>
</template>

<style scoped>
/* Coordinated hover/focus affordance — see the component doc comment above.
   Only applied when rendering as a link (`.author-link` is added conditionally
   in the template), so a non-interactive attribution never paints as clickable. */
.author-link {
  --author-link-highlight: var(--color-transparency-white-t8);
  --author-link-ring: currentColor;
  padding: 0.125rem 0.375rem;
  margin: -0.125rem -0.375rem;
  border-radius: 9999px;
  cursor: pointer;
  transition:
    background-color 150ms ease,
    color 150ms ease;
}

.author-link:hover,
.author-link:focus-visible {
  background-color: var(--author-link-highlight);
}

.author-link:focus-visible {
  outline: 2px solid var(--author-link-ring);
  outline-offset: 2px;
}

.author-link-name {
  text-decoration: underline;
  text-decoration-color: transparent;
  text-decoration-thickness: 1px;
  text-underline-offset: 3px;
  transition: text-decoration-color 150ms ease;
}

.author-link:hover .author-link-name,
.author-link:focus-visible .author-link-name {
  text-decoration-color: currentColor;
}

.author-link-avatar {
  transition: box-shadow 150ms ease;
}

.author-link:hover .author-link-avatar,
.author-link:focus-visible .author-link-avatar {
  box-shadow: 0 0 0 2px var(--author-link-ring);
}

@media (prefers-reduced-motion: reduce) {
  .author-link,
  .author-link-name,
  .author-link-avatar {
    transition: none;
  }
}
</style>
