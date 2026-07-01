<script setup lang="ts">
/**
 * FeaturedCarousel - Full-width cinematic hero carousel for the hub landing page.
 * Auto-rotates the most-used templates, pauses on hover, loops, and is fully
 * click-through to each template's workflow page. Renders one hero card per view.
 */
import { computed, onUnmounted, ref } from 'vue';
import emblaCarouselVue from 'embla-carousel-vue';
import Autoplay from 'embla-carousel-autoplay';
import { usePreferredReducedMotion } from '@vueuse/core';
import type { SerializedTemplate } from '@/lib/hub-api';
import { getLogoPath, providerName } from '@/lib/model-logos';
import { workflowDetailPath, tagPath, creatorPath, thumbnailPath } from '@/lib/routes';
import { tagDisplayName } from '@/lib/tag-aliases';
import { isVideoFile } from '@/lib/media-utils';
import { getVideoFrameUrl } from '@/lib/video-thumbnail';
import { cn } from '@/lib/utils';

interface Props {
  templates: SerializedTemplate[];
  locale: string;
  isRtl: boolean;
  featuredLabel: string;
  prevLabel: string;
  nextLabel: string;
}

const props = withDefaults(defineProps<Props>(), {
  locale: 'en',
  isRtl: false,
});

const AUTOPLAY_DELAY = 5000;

// Sampled once at setup: autoplay is decided when the embla instance is created
// and isn't reconfigured if the OS preference changes mid-session (acceptable —
// the carousel stays fully usable via the manual prev/next controls).
const reducedMotion = usePreferredReducedMotion();
const autoplayEnabled = reducedMotion.value !== 'reduce';

const [emblaRef, emblaApi] = emblaCarouselVue(
  {
    loop: true,
    align: 'center',
    direction: props.isRtl ? 'rtl' : 'ltr',
  },
  autoplayEnabled
    ? [Autoplay({ delay: AUTOPLAY_DELAY, stopOnMouseEnter: true, stopOnInteraction: false })]
    : []
);

function scrollPrev() {
  emblaApi.value?.scrollPrev();
}
function scrollNext() {
  emblaApi.value?.scrollNext();
}

/**
 * Per-slide view model. Resolves provider logo, media (image / animated webp /
 * video+poster) and the locale-aware destination URL once, up front.
 */
interface FeaturedSlide {
  key: string;
  title: string;
  href: string | null;
  providerName: string | null;
  logoPath: string | null;
  imageUrl: string | null;
  videoUrl: string | null;
  posterUrl: string | null;
  creatorName: string;
  creatorAvatarUrl: string;
  creatorUrl: string | null;
  tags: { label: string; href: string }[];
}

const slides = computed<FeaturedSlide[]>(() =>
  props.templates.map((t) => {
    const primary = t.thumbnails?.[0] ?? null;
    const isVideo = Boolean(primary && isVideoFile(primary));
    const mediaUrl = primary ? thumbnailPath(primary) : null;
    const provider = providerName(t.logos);
    return {
      key: t.shareId || t.name,
      title: t.title,
      href: workflowDetailPath(t.name, t.shareId, props.locale),
      providerName: provider,
      logoPath: provider ? getLogoPath(provider) : null,
      imageUrl: isVideo ? null : mediaUrl,
      videoUrl: isVideo ? mediaUrl : null,
      posterUrl: isVideo && mediaUrl ? getVideoFrameUrl(mediaUrl) : null,
      creatorName: t.creatorDisplayName || 'ComfyUI',
      creatorAvatarUrl: t.creatorAvatarUrl,
      creatorUrl: t.username ? creatorPath(t.username, props.locale) : null,
      tags: t.tags.slice(0, 3).map((tag) => ({
        label: tagDisplayName(tag),
        href: tagPath(tag, props.locale),
      })),
    };
  })
);

// Video first-slides can fall back to their poster image if playback fails.
const videoFailed = ref<Record<string, boolean>>({});
function onVideoError(key: string) {
  videoFailed.value[key] = true;
}

onUnmounted(() => {
  emblaApi.value?.destroy();
});
</script>

<template>
  <section
    v-if="slides.length"
    class="relative h-[clamp(300px,60vw,520px)] rounded-[2.5rem] border-[1.5px] border-border-strong bg-page mt-3"
    :aria-roledescription="'carousel'"
    :aria-label="featuredLabel"
  >
    <!-- Embla viewport: only the media slides; the bordered frame above stays static. -->
    <div ref="emblaRef" class="absolute inset-[3px] overflow-hidden rounded-[calc(2.5rem-4px)]">
      <div class="flex h-full">
        <div
          v-for="(slide, index) in slides"
          :key="slide.key"
          class="relative h-full min-w-0 flex-[0_0_100%]"
        >
          <video
            v-if="slide.videoUrl && !videoFailed[slide.key]"
            :src="slide.videoUrl"
            :poster="slide.posterUrl || undefined"
            class="h-full w-full object-cover"
            :preload="index === 0 ? 'auto' : 'metadata'"
            :autoplay="autoplayEnabled"
            muted
            loop
            playsinline
            @error="onVideoError(slide.key)"
          />
          <img
            v-else-if="slide.videoUrl && slide.posterUrl"
            :src="slide.posterUrl"
            :alt="slide.title"
            class="h-full w-full object-cover"
            :loading="index === 0 ? 'eager' : 'lazy'"
            :fetchpriority="index === 0 ? 'high' : 'auto'"
            decoding="async"
          />
          <img
            v-else-if="slide.imageUrl"
            :src="slide.imageUrl"
            :alt="slide.title"
            class="h-full w-full object-cover"
            :loading="index === 0 ? 'eager' : 'lazy'"
            :fetchpriority="index === 0 ? 'high' : 'auto'"
            decoding="async"
          />
          <div
            class="pointer-events-none absolute inset-0 bg-linear-to-b from-transparent to-black/70"
            aria-hidden="true"
          />

          <!-- Whole-card link (keyboard accessible). Sits above media, below controls. -->
          <a
            v-if="slide.href"
            :href="slide.href"
            :aria-label="slide.title"
            class="absolute inset-0 z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand"
          />

          <div
            class="absolute left-2 top-2 z-20 rounded-lg bg-black/10 px-2.5 py-1 backdrop-blur-xs sm:left-3 sm:top-3 sm:rounded-[12px] sm:px-3.5 sm:py-1.5"
          >
            <span class="text-2xs font-extrabold tracking-wide text-white sm:text-xs">{{
              featuredLabel
            }}</span>
          </div>

          <div
            v-if="slide.logoPath"
            class="absolute right-2 top-2 z-20 flex size-10 items-center justify-center rounded-xl bg-black/10 p-2 backdrop-blur-xs sm:right-3 sm:top-3 sm:size-12 sm:rounded-2xl"
          >
            <img
              :src="slide.logoPath"
              :alt="slide.providerName || ''"
              class="h-full w-full rounded-lg object-contain sm:rounded-2xl"
            />
          </div>

          <div
            class="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col gap-2 p-4 pr-24 sm:gap-3 sm:p-6 sm:pr-32 lg:p-8 lg:pr-40"
          >
            <h2
              class="max-w-3xl text-[clamp(1.25rem,5vw,3rem)] font-normal leading-tight tracking-[-0.03em] text-white"
            >
              {{ slide.title }}
            </h2>
            <div class="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
              <a
                v-if="slide.creatorUrl"
                :href="slide.creatorUrl"
                class="pointer-events-auto relative z-20 flex min-w-0 items-center gap-2 text-white/95 transition-colors hover:text-white"
                @click.stop
              >
                <img
                  v-if="slide.creatorAvatarUrl"
                  :src="slide.creatorAvatarUrl"
                  :alt="slide.creatorName"
                  class="size-5 shrink-0 rounded-full object-cover sm:size-6"
                />
                <span
                  v-else
                  class="flex size-5 shrink-0 items-center justify-center rounded-full bg-brand text-2xs font-bold leading-none text-page sm:size-6"
                  aria-hidden="true"
                >
                  {{ slide.creatorName.charAt(0).toUpperCase() }}
                </span>
                <span class="ppformula-text-center-sm truncate text-sm sm:text-base">{{
                  slide.creatorName
                }}</span>
              </a>
              <div v-else class="flex min-w-0 items-center gap-2 text-white/95">
                <span
                  class="flex size-5 shrink-0 items-center justify-center rounded-full bg-brand text-2xs font-bold leading-none text-page sm:size-6"
                  aria-hidden="true"
                >
                  {{ slide.creatorName.charAt(0).toUpperCase() }}
                </span>
                <span class="ppformula-text-center-sm truncate text-sm sm:text-base">{{
                  slide.creatorName
                }}</span>
              </div>

              <!-- Tags: only the first shows on the smallest screens; more reveal as width grows. -->
              <a
                v-for="(tag, tagIndex) in slide.tags"
                :key="tag.href"
                :href="tag.href"
                :class="
                  cn(
                    'pointer-events-auto relative z-20 inline-flex h-6 shrink-0 items-center rounded-full bg-hub-surface px-3 text-xs text-content transition-colors hover:bg-hub-surface-hover sm:px-4',
                    tagIndex >= 1 && 'hidden sm:inline-flex',
                    tagIndex >= 2 && 'lg:inline-flex'
                  )
                "
                @click.stop
              >
                {{ tag.label }}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div
      class="absolute bottom-3 right-3 z-30 flex gap-2 sm:bottom-4 sm:right-4 lg:bottom-6 lg:right-6"
    >
      <button
        type="button"
        :aria-label="prevLabel"
        class="flex size-10 items-center justify-center rounded-lg bg-white/8 text-content backdrop-blur-xs transition-colors hover:bg-brand hover:text-page focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand sm:size-12 sm:rounded-[12px]"
        @click="scrollPrev"
      >
        <svg
          class="size-5 rtl:-scale-x-100 sm:size-6"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <button
        type="button"
        :aria-label="nextLabel"
        class="flex size-10 items-center justify-center rounded-lg bg-white/8 text-content backdrop-blur-xs transition-colors hover:bg-brand hover:text-page focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand sm:size-12 sm:rounded-[12px]"
        @click="scrollNext"
      >
        <svg
          class="size-5 rtl:-scale-x-100 sm:size-6"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>
    </div>
  </section>
</template>
