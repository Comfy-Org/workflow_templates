<script setup lang="ts">
import { cn } from '@/lib/utils';
import { breakpointsTailwind, useBreakpoints, useEventListener, whenever } from '@vueuse/core';
import { nextTick, onMounted, ref } from 'vue';

import type { Locale } from '@/i18n/config';
import { t } from '@/i18n/ui';
import { localizeUrl } from '@/i18n/utils';
import { navRoutes, navExternalLinks } from '@/config/nav-routes';
import { getCloudLandingUrl } from '@/lib/urls';
import { Button } from '@/components/ui/button';
import MobileMenu from './MobileMenu.vue';
import NavDesktopLink from './NavDesktopLink.vue';
import GitHubStarBadge from './GitHubStarBadge.vue';
import type { NavLink } from './NavDesktopLink.vue';

interface Creator {
  username: string;
  displayName: string;
}

const {
  locale = 'en',
  creators = [],
  githubStars = '',
} = defineProps<{
  locale?: Locale;
  creators?: Creator[];
  githubStars?: string;
}>();

const navLinks: NavLink[] = [
  {
    label: t('nav.products', locale),
    items: [
      { label: t('nav.comfyLocal', locale), href: navRoutes.download },
      { label: t('nav.comfyCloud', locale), href: navRoutes.cloud },
      {
        label: t('nav.comfyApi', locale),
        href: navRoutes.api,
        badge: t('nav.badgeNew', locale),
      },
      { label: t('nav.comfyEnterprise', locale), href: navRoutes.cloudEnterprise },
    ],
  },
  { label: t('nav.pricing', locale), href: navRoutes.cloudPricing },
  {
    label: t('nav.community', locale),
    items: [
      {
        label: t('nav.comfyHub', locale),
        href: navExternalLinks.workflows,
        badge: t('nav.badgeNew', locale),
      },
      { label: t('nav.gallery', locale), href: navRoutes.gallery },
    ],
  },
  {
    label: t('nav.resources', locale),
    items: [
      { label: t('nav.learning', locale), href: navRoutes.learning },
      { label: t('nav.blogs', locale), href: navExternalLinks.blog, external: true },
      { label: t('nav.github', locale), href: navExternalLinks.github, external: true },
      { label: t('nav.discord', locale), href: navExternalLinks.discord, external: true },
      { label: t('nav.docs', locale), href: navExternalLinks.docs, external: true },
      { label: t('nav.youtube', locale), href: navExternalLinks.youtube, external: true },
    ],
  },
  {
    label: t('nav.company', locale),
    items: [
      { label: t('nav.aboutUs', locale), href: navRoutes.about },
      { label: t('nav.careers', locale), href: navRoutes.careers },
      { label: t('nav.customerStories', locale), href: navRoutes.customers },
    ],
  },
];

function splitCtaLabel(label: string): { prefix: string; core: string } {
  const lastSpace = label.lastIndexOf(' ');
  if (lastSpace === -1) return { prefix: '', core: label };
  return { prefix: label.slice(0, lastSpace), core: label.slice(lastSpace + 1) };
}

const ctaButtons = [
  {
    label: t('nav.downloadLocal', locale),
    ...splitCtaLabel(t('nav.downloadLocal', locale)),
    href: navRoutes.download,
    primary: false,
  },
  {
    label: t('nav.launchCloud', locale),
    ...splitCtaLabel(t('nav.launchCloud', locale)),
    href: getCloudLandingUrl('site_button'),
    primary: true,
  },
];

// Top creators for the mobile drawer (links built with the site's locale-aware URL).
const creatorLinks = creators.slice(0, 5).map((c) => ({
  username: c.username,
  displayName: c.displayName,
  href: localizeUrl(`/workflows/creators/${c.username}/`, locale),
}));
const creatorsHref = localizeUrl('/workflows/creators/', locale);

const currentPath = ref('');
const openDesktopDropdown = ref<string | null>(null);
const mobileMenuOpen = ref(false);
const isNavigating = ref(false);
const hamburgerRef = ref<HTMLButtonElement | null>(null);

function closeMobileMenu({ restoreFocus = true }: { restoreFocus?: boolean } = {}) {
  const wasOpen = mobileMenuOpen.value;
  mobileMenuOpen.value = false;
  if (restoreFocus && wasOpen) {
    hamburgerRef.value?.focus();
  }
}

function toggleDesktopDropdown(label: string) {
  openDesktopDropdown.value = openDesktopDropdown.value === label ? null : label;
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    closeMobileMenu();
    openDesktopDropdown.value = null;
  }
}

async function onNavigate() {
  isNavigating.value = true;
  closeMobileMenu({ restoreFocus: false });
  openDesktopDropdown.value = null;
  currentPath.value = window.location.pathname;
  await nextTick();
  isNavigating.value = false;
}

const breakpoints = useBreakpoints(breakpointsTailwind);
const isDesktop = breakpoints.greaterOrEqual('lg');

whenever(isDesktop, () => {
  mobileMenuOpen.value = false;
});

onMounted(() => {
  currentPath.value = window.location.pathname;
  useEventListener(document, 'keydown', onKeydown);
  useEventListener(document, 'astro:after-swap', onNavigate);
});
</script>

<template>
  <MobileMenu
    :open="mobileMenuOpen"
    :navigating="isNavigating"
    :links="navLinks"
    :cta-links="ctaButtons"
    :creators="creatorLinks"
    :creators-href="creatorsHref"
    :locale="locale"
    @close="closeMobileMenu"
  />

  <nav class="flex w-full items-center justify-between gap-4" aria-label="Main navigation">
    <a
      :href="localizeUrl('/workflows/', locale)"
      class="inline-grid h-10 shrink-0 grid-cols-1 grid-rows-1 transition-[width]"
      aria-label="ComfyHub home"
    >
      <img
        src="/brand/comfy-c-yellow.svg"
        alt="Comfy"
        class="col-span-full row-span-full h-9 w-auto"
      />
      <div
        class="relative col-span-full row-span-full h-10 w-0 overflow-clip transition-[width] xl:w-44"
      >
        <img
          src="/brand/comfy-hub-logo.svg"
          alt="ComfyHub"
          class="absolute top-0 left-0 h-10 w-44 max-w-none object-contain object-left"
        />
      </div>
    </a>

    <!-- Desktop nav links -->
    <div
      data-testid="desktop-nav-links"
      class="hidden items-center gap-[clamp(1rem,2.5vw,2.5rem)] lg:flex"
    >
      <NavDesktopLink
        v-for="link in navLinks"
        :key="link.label"
        :link="link"
        :current-path="currentPath"
        :is-open="openDesktopDropdown === link.label"
        @open="openDesktopDropdown = $event"
        @close="openDesktopDropdown = null"
        @toggle="toggleDesktopDropdown"
      />
    </div>

    <!-- Desktop CTA buttons -->
    <div data-testid="desktop-nav-cta" class="hidden shrink-0 items-center gap-2 lg:flex">
      <GitHubStarBadge v-if="githubStars" :stars="githubStars" />
      <Button
        v-for="cta in ctaButtons"
        :key="cta.href"
        as="a"
        :href="cta.href"
        target="_blank"
        rel="noopener noreferrer"
        :variant="cta.primary ? 'brand-solid' : 'brand-outline'"
        size="nav"
        :aria-label="cta.label"
        :data-location="cta.primary ? 'navbar' : undefined"
        :class="cta.primary ? 'run-cloud-btn' : undefined"
      >
        <span class="ppformula-optical-center">
          <span
            v-if="cta.prefix"
            class="inline-block max-w-0 overflow-hidden align-bottom transition-[max-width] duration-300 ease-in-out xl:max-w-28"
            aria-hidden="true"
            >{{ cta.prefix }}&nbsp;</span
          >{{ cta.core }}
        </span>
      </Button>
    </div>

    <!-- Mobile hamburger -->
    <button
      ref="hamburgerRef"
      :class="
        cn(
          'flex size-10 items-center justify-center rounded-xl lg:hidden',
          mobileMenuOpen ? 'border-brand border-2 bg-transparent' : 'bg-brand'
        )
      "
      :aria-label="t('nav.toggleMenu', locale)"
      aria-controls="site-mobile-menu"
      :aria-expanded="mobileMenuOpen"
      @click="mobileMenuOpen = !mobileMenuOpen"
    >
      <img
        v-if="!mobileMenuOpen"
        src="/icons/breadthumb.svg"
        alt=""
        class="h-3"
        aria-hidden="true"
      />
      <img v-else src="/icons/close.svg" alt="" class="size-5" aria-hidden="true" />
    </button>
  </nav>
</template>
