<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from 'vue';

import type { Locale } from '@/i18n/config';
import { t } from '@/i18n/ui';
import { lockScroll, unlockScroll } from '@/composables/scrollLock';
import { Button } from '@/components/ui/button';
import type { NavLink } from './NavDesktopLink.vue';

interface CtaLink {
  label: string;
  href: string;
  primary: boolean;
}

interface CreatorLink {
  username: string;
  displayName: string;
  href: string;
}

const {
  open = false,
  navigating = false,
  links = [],
  ctaLinks = [],
  creators = [],
  creatorsHref = '/workflows/creators/',
  locale = 'en',
} = defineProps<{
  open?: boolean;
  navigating?: boolean;
  links?: NavLink[];
  ctaLinks?: CtaLink[];
  creators?: CreatorLink[];
  creatorsHref?: string;
  locale?: Locale;
}>();

const emit = defineEmits<{
  close: [];
}>();

const menuRef = ref<HTMLElement | null>(null);
const activeSection = ref<string | null>(null);

const activeSectionItems = computed(
  () => links.find((l) => l.label === activeSection.value)?.items
);

function onNavigate() {
  activeSection.value = null;
  emit('close');
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

function trapFocus(e: KeyboardEvent) {
  if (e.key !== 'Tab') return;
  const menu = menuRef.value;
  if (!menu) return;
  const focusable = [...menu.querySelectorAll<HTMLElement>(FOCUSABLE)];
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

watch(
  () => open,
  async (isOpen, _prev, onCleanup) => {
    let canceled = false;
    onCleanup(() => {
      canceled = true;
    });

    if (isOpen) {
      lockScroll();
      await nextTick();
      if (canceled || !open) return;
      const menu = menuRef.value;
      const firstFocusable = menu?.querySelector<HTMLElement>(FOCUSABLE);
      firstFocusable?.focus();
      menu?.addEventListener('keydown', trapFocus);
    } else {
      menuRef.value?.removeEventListener('keydown', trapFocus);
      unlockScroll({ skipRestore: navigating });
    }
  }
);

onUnmounted(() => {
  menuRef.value?.removeEventListener('keydown', trapFocus);
  if (open) unlockScroll({ skipRestore: true });
});
</script>

<template>
  <div
    v-show="open"
    id="site-mobile-menu"
    ref="menuRef"
    role="dialog"
    aria-modal="true"
    :inert="!open"
    :aria-label="t('nav.menu', locale)"
    class="bg-page fixed inset-0 z-40 flex flex-col px-6 pt-5 pb-8 lg:hidden"
  >
    <div class="mb-8 flex h-10 items-center justify-between">
      <img src="/brand/comfy-c-yellow.svg" alt="Comfy" class="h-7 w-auto" />
      <button
        type="button"
        class="border-brand flex size-10 items-center justify-center rounded-xl border-2"
        :aria-label="t('nav.toggleMenu', locale)"
        @click="emit('close')"
      >
        <img src="/icons/close.svg" alt="" class="size-5" aria-hidden="true" />
      </button>
    </div>

    <!-- Main list -->
    <template v-if="!activeSection">
      <div class="flex flex-1 flex-col gap-6 overflow-y-auto">
        <template v-for="link in links" :key="link.label">
          <button
            v-if="link.items"
            class="text-nav-fg flex items-center justify-between text-left text-2xl font-medium"
            @click="activeSection = link.label"
          >
            {{ link.label }}
            <svg
              class="size-4 -rotate-90"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2.5"
                d="m6 9 6 6 6-6"
              />
            </svg>
          </button>
          <a v-else :href="link.href" class="text-nav-fg text-2xl font-medium" @click="onNavigate">
            {{ link.label }}
          </a>
        </template>

        <!-- Top Creators section -->
        <div v-if="creators.length" class="flex flex-col gap-4">
          <a
            :href="creatorsHref"
            class="text-nav-fg-hover flex items-center gap-2 text-sm font-bold uppercase tracking-wide"
            @click="onNavigate"
          >
            {{ t('hub.topCreators', locale) }}
            <svg
              class="size-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2.5"
                d="m9 18 6-6-6-6"
              />
            </svg>
          </a>
          <a
            v-for="creator in creators"
            :key="creator.username"
            :href="creator.href"
            class="text-nav-fg text-xl font-medium"
            @click="onNavigate"
          >
            {{ creator.displayName }}
          </a>
        </div>
      </div>

      <div class="flex flex-col gap-3 pt-6">
        <Button
          v-for="cta in ctaLinks"
          :key="cta.href"
          as="a"
          :href="cta.href"
          target="_blank"
          rel="noopener noreferrer"
          :variant="cta.primary ? 'brand-solid' : 'brand-outline'"
          size="lg"
          class="w-full"
        >
          <span class="ppformula-optical-center">{{ cta.label }}</span>
        </Button>
      </div>
    </template>

    <!-- Drill-down sub-menu -->
    <template v-else>
      <div class="flex flex-1 flex-col overflow-y-auto">
        <button
          class="text-brand mb-6 flex items-center gap-2 text-sm font-bold tracking-wide uppercase"
          @click="activeSection = null"
        >
          <svg
            class="size-3.5 rotate-180"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2.5"
              d="m9 18 6-6-6-6"
            />
          </svg>
          {{ t('nav.backShort', locale) }}
        </button>

        <p class="text-nav-fg-hover mb-8 text-sm font-bold uppercase">
          {{ activeSection }}
        </p>

        <div class="flex flex-col gap-6 pl-2">
          <a
            v-for="item in activeSectionItems"
            :key="item.href"
            :href="item.href"
            class="text-nav-fg flex items-center gap-3 text-2xl font-medium"
            @click="onNavigate"
          >
            {{ item.label }}
            <span
              v-if="item.badge"
              class="bg-brand text-page -skew-x-12 rounded-sm px-1 py-0.5 text-xs font-semibold"
            >
              <span class="ppformula-optical-center inline-block skew-x-12">{{ item.badge }}</span>
            </span>
            <img
              v-if="item.external"
              src="/icons/arrow-up-right.svg"
              alt=""
              class="size-5"
              aria-hidden="true"
            />
          </a>
        </div>
      </div>
    </template>
  </div>
</template>
