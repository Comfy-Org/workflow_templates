<script setup lang="ts">
import { cn } from '@/lib/utils';

type NavDropdownItem = {
  label: string;
  href: string;
  badge?: string;
  external?: boolean;
};

export type NavLink = {
  label: string;
  href?: string;
  items?: NavDropdownItem[];
};

const {
  link,
  currentPath,
  isOpen = false,
} = defineProps<{
  link: NavLink;
  currentPath: string;
  isOpen?: boolean;
}>();

const emit = defineEmits<{
  (e: 'open', label: string): void;
  (e: 'close'): void;
  (e: 'toggle', label: string): void;
}>();

function normalizePath(value?: string): string {
  if (!value) return '';
  const pathname = new URL(value, 'https://comfy.org').pathname;
  return pathname.replace(/\/+$/, '') || '/';
}

function isActive(href?: string): boolean {
  return normalizePath(currentPath) === normalizePath(href);
}

function isDropdownActive(items?: NavDropdownItem[]): boolean {
  return !!items?.some((item) => isActive(item.href));
}
</script>

<template>
  <div
    class="relative"
    @mouseenter="link.items?.length && emit('open', link.label)"
    @mouseleave="emit('close')"
    @focusin="link.items?.length && emit('open', link.label)"
    @focusout="emit('close')"
  >
    <button
      v-if="link.items?.length"
      type="button"
      :class="
        cn(
          'group flex cursor-pointer items-center gap-1.5 py-3 text-sm font-bold tracking-wide uppercase transition-colors',
          isDropdownActive(link.items) ? 'text-brand' : 'text-nav-fg hover:text-nav-fg-hover'
        )
      "
      aria-haspopup="true"
      :aria-expanded="isOpen"
      @click="emit('toggle', link.label)"
    >
      {{ link.label }}
      <!-- Filled down-triangle (matches frontend's ▾ glyph regardless of font fallback) -->
      <svg
        aria-hidden="true"
        viewBox="0 0 10 6"
        fill="currentColor"
        :class="
          cn(
            'h-[5px] w-2.5 transition-colors',
            isDropdownActive(link.items)
              ? 'text-brand'
              : 'text-nav-fg group-hover:text-nav-fg-hover'
          )
        "
      >
        <path d="M0 0h10L5 6z" />
      </svg>
    </button>

    <a
      v-else
      :href="link.href"
      :aria-current="isActive(link.href) ? 'page' : undefined"
      :class="
        cn(
          'flex items-center gap-1.5 py-3 text-sm font-bold tracking-wide uppercase transition-colors',
          isActive(link.href) ? 'text-brand' : 'text-nav-fg hover:text-nav-fg-hover'
        )
      "
    >
      {{ link.label }}
    </a>

    <div
      v-if="link.items?.length"
      v-show="isOpen"
      data-testid="nav-dropdown"
      class="absolute top-full left-0 z-50 w-max pt-2"
    >
      <div class="bg-nav-dropdown flex flex-col rounded-xl p-2 shadow-lg">
        <a
          v-for="item in link.items"
          :key="item.href"
          :href="item.href"
          :aria-current="isActive(item.href) ? 'page' : undefined"
          :class="
            cn(
              'flex items-center gap-2 rounded-sm p-2 text-xs font-medium tracking-wide transition-colors',
              isActive(item.href)
                ? 'text-brand'
                : 'text-nav-fg hover:bg-hub-surface hover:text-white'
            )
          "
          @click="emit('close')"
        >
          {{ item.label }}
          <span
            v-if="item.badge"
            class="bg-brand text-page -skew-x-12 rounded-sm px-1 py-0.5 text-[9px]/3 leading-none font-bold"
          >
            <span class="ppformula-optical-center inline-block skew-x-12">{{ item.badge }}</span>
          </span>
          <img
            v-if="item.external"
            src="/icons/arrow-up-right.svg"
            alt=""
            class="ml-auto size-4"
            aria-hidden="true"
          />
        </a>
      </div>
    </div>
  </div>
</template>
