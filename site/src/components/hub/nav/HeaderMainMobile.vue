<script setup lang="ts">
import { ChevronLeft, ChevronRight } from 'lucide-vue-next';
import { computed, onUnmounted, ref, watch } from 'vue';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { BreadthumbIcon } from '@/components/ui/icons';
import { getMainNavigation } from '@/config/main-navigation';
import { navRoutes } from '@/config/nav-routes';
import { lockScroll, unlockScroll } from '@/composables/scrollLock';
import { localizeUrl } from '@/i18n/utils';
import type { Locale } from '@/i18n/config';
import { t } from '@/i18n/ui';
import type { CreatorLink } from './types';
import { Badge } from '@/components/ui/badge';
import NavLinkContent from './NavLinkContent.vue';

const { locale = 'en', creators = [] } = defineProps<{
  locale?: Locale;
  creators?: CreatorLink[];
}>();

const mainNavigation = getMainNavigation(locale);
const creatorsHref = localizeUrl('/workflows/creators/', locale);

const isOpen = ref(false);
const activeSection = ref<string | null>(null);

const activeItem = computed(() =>
  mainNavigation.find((item) => item.label === activeSection.value && item.columns)
);

watch(isOpen, (open) => {
  if (open) {
    lockScroll();
  } else {
    unlockScroll();
    activeSection.value = null;
  }
});

onUnmounted(() => {
  if (isOpen.value) unlockScroll({ skipRestore: true });
});
</script>

<template>
  <div>
    <Sheet v-model:open="isOpen">
      <SheetTrigger
        :aria-label="t('nav.toggleMenu', locale)"
        class="bg-primary-comfy-yellow grid size-10 shrink-0 cursor-pointer place-items-center rounded-xl text-primary-comfy-ink hover:opacity-90"
      >
        <BreadthumbIcon class="h-3 w-5 text-primary-comfy-ink" />
      </SheetTrigger>
      <SheetContent
        side="right"
        class="flex size-full flex-col px-6 py-5 sm:max-w-none"
        :close-label="t('nav.close', locale)"
      >
        <SheetHeader class="sr-only">
          <SheetTitle>{{ t('nav.menu', locale) }}</SheetTitle>
          <SheetDescription>{{ t('nav.mobileMenuDescription', locale) }}</SheetDescription>
        </SheetHeader>

        <a
          :href="navRoutes.home"
          class="focus-visible:border-primary-comfy-yellow focus-visible:ring-primary-comfy-yellow/50 inline-flex w-auto shrink-0 focus-visible:ring-3"
        >
          <img src="/icons/logomark.svg" alt="" class="h-11 w-auto" />
          <span class="sr-only">{{ t('nav.home', locale) }}</span>
        </a>

        <div class="relative mt-4 flex-1 overflow-hidden">
          <nav
            class="absolute inset-0 overflow-y-auto p-1"
            :class="activeItem ? 'opacity-0' : ''"
            :aria-label="t('nav.menu', locale)"
            :inert="activeItem ? true : undefined"
          >
            <ul class="flex flex-col gap-y-8">
              <li v-for="item in mainNavigation" :key="item.label">
                <Button
                  :as="item.columns ? 'button' : 'a'"
                  variant="nav-muted"
                  :type="item.columns ? 'button' : undefined"
                  :href="item.columns ? undefined : item.href"
                  @click="item.columns && (activeSection = item.label)"
                >
                  <span class="inline-flex items-center gap-2">
                    <span class="ppformula-text-center">{{ item.label }}</span>
                    <Badge v-if="item.badge" size="xxs" variant="accent">
                      <span class="ppformula-text-center">{{ t('nav.badgeNew', locale) }}</span>
                    </Badge>
                  </span>
                  <ChevronRight class="size-7" />
                </Button>
              </li>
            </ul>

            <div v-if="creators.length" class="mt-12 flex flex-col gap-y-4">
              <a
                :href="creatorsHref"
                class="text-primary-warm-gray flex items-center gap-2 text-sm font-bold uppercase tracking-wider"
              >
                {{ t('hub.topCreators', locale) }}
                <ChevronRight class="size-3.5" />
              </a>
              <a
                v-for="creator in creators"
                :key="creator.username"
                :href="creator.href"
                class="text-primary-comfy-canvas text-xl font-medium"
              >
                {{ creator.displayName }}
              </a>
            </div>
          </nav>

          <div
            class="absolute inset-0 bg-primary-comfy-ink transition-transform duration-300 ease-out"
            :class="activeItem ? 'translate-x-0' : 'pointer-events-none translate-x-full'"
            :inert="activeItem ? undefined : true"
            :aria-hidden="!activeItem"
          >
            <div class="size-full overflow-y-auto py-8">
              <Button type="button" variant="nav-link" @click="activeSection = null">
                <ChevronLeft />
                {{ t('nav.back', locale) }}
              </Button>

              <div v-if="activeItem" class="mt-6 flex flex-col gap-y-12">
                <div
                  v-for="column in activeItem.columns"
                  :key="column.header"
                  class="flex flex-col gap-y-3"
                >
                  <p class="text-primary-warm-gray text-base font-bold tracking-wider uppercase">
                    {{ column.header }}
                  </p>
                  <Button
                    v-for="link in column.items"
                    :key="link.label"
                    :href="link.href"
                    variant="nav"
                    as="a"
                    :target="link.external ? '_blank' : undefined"
                    :rel="link.external ? 'noopener noreferrer' : undefined"
                  >
                    <NavLinkContent :item="link" :locale="locale" />
                  </Button>
                </div>
              </div>
            </div>
            <div
              class="pointer-events-none absolute inset-x-0 top-0 h-8 bg-linear-to-b from-primary-comfy-ink to-transparent"
            />
            <div
              class="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-linear-to-t from-primary-comfy-ink to-transparent"
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  </div>
</template>
