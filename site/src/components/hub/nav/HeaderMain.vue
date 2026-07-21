<script setup lang="ts">
import { Button } from '@/components/ui/button';
import { navRoutes } from '@/config/nav-routes';
import { getCloudLandingUrl } from '@/lib/urls';
import type { Locale } from '@/i18n/config';
import { t } from '@/i18n/ui';
import type { CreatorLink } from './types';
import GitHubStarBadge from './GitHubStarBadge.vue';
import HeaderMainDesktop from './HeaderMainDesktop.vue';
import HeaderMainMobile from './HeaderMainMobile.vue';

const {
  locale = 'en',
  githubStars = '',
  creators = [],
} = defineProps<{
  locale?: Locale;
  githubStars?: string;
  creators?: CreatorLink[];
}>();

/** Split "DOWNLOAD DESKTOP" → { prefix: "DOWNLOAD", core: "DESKTOP" } for the reveal animation. */
function splitLabel(label: string): { prefix: string; core: string } {
  const lastSpace = label.lastIndexOf(' ');
  if (lastSpace === -1) return { prefix: '', core: label };
  return { prefix: label.slice(0, lastSpace), core: label.slice(lastSpace + 1) };
}

const ctaButtons = [
  {
    ...splitLabel(t('nav.downloadLocal', locale)),
    ariaLabel: t('nav.downloadLocal', locale),
    href: navRoutes.download,
    primary: false,
  },
  {
    ...splitLabel(t('nav.launchCloud', locale)),
    ariaLabel: t('nav.launchCloud', locale),
    href: getCloudLandingUrl('site_button'),
    primary: true,
  },
];
</script>

<template>
  <nav
    class="flex items-center justify-between gap-4 lg:gap-4"
    :aria-label="t('nav.mainNavigation', locale)"
  >
    <a
      :href="navRoutes.home"
      class="inline-grid h-10 shrink-0 grid-cols-1 grid-rows-1 transition-[width]"
      :aria-label="t('nav.home', locale)"
    >
      <img src="/icons/logomark.svg" alt="Comfy" class="col-span-full row-span-full h-8" />
      <div
        class="relative col-span-full row-span-full h-10 max-w-0 overflow-clip transition-[max-width] duration-300 xl:max-w-56"
      >
        <img src="/icons/logo.svg" alt="Comfy" class="h-10 w-auto max-w-none object-left" />
      </div>
    </a>

    <HeaderMainDesktop :locale="locale" class="hidden lg:block" />
    <HeaderMainMobile :locale="locale" :creators="creators" class="lg:hidden" />

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
        :aria-label="cta.ariaLabel"
        :data-location="cta.primary ? 'navbar' : undefined"
        :class="cta.primary ? 'run-cloud-btn' : undefined"
      >
        <span class="ppformula-text-center">
          <span class="hidden xl:inline-block">{{ cta.prefix }}&nbsp;</span>{{ cta.core }}
        </span>
      </Button>
    </div>
  </nav>
</template>
