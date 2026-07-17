<script setup lang="ts">
/**
 * HubWorkflowCard - Unified workflow card component.
 * Used inside Vue islands (WorkflowGrid.vue) and SSR-rendered in Astro pages.
 * Visual structure: landscape thumbnail with the title and provider logo overlaid
 * on it; creator line + CTA and tag pills beneath.
 */
import { computed, ref, watch, onMounted, onUnmounted, nextTick } from 'vue';
import TagRow from '@/components/hub/TagRow.vue';
import type { ThumbnailVariant } from '@/lib/hub-api';
import { initCompareSlider } from '@/lib/initCompareSlider';
import { getVideoFrameUrl } from '@/lib/video-thumbnail';
import { isVideoFile, isAudioFile, isMediaFile } from '@/lib/media-utils';
import { workflowDetailPath, creatorPath, thumbnailPath } from '@/lib/routes';
import { resolveTemplateLogos } from '@/lib/model-logos';
import { ButtonPill } from '@/components/ui/button-pill';
import { Avatar } from '@/components/ui/avatar';

interface Props {
  name: string;
  title: string;
  shareId?: string;
  tags?: string[];
  logos?: { provider: string | string[] }[];
  /** Model names; badges fall back to these when `logos` is empty. */
  models?: string[];
  thumbnails?: string[];
  locale?: string;
  username?: string;
  creatorDisplayName?: string;
  creatorAvatarUrl?: string;
  isApp?: boolean;
  thumbnailVariant?: ThumbnailVariant;
  mediaType?: string;
  mediaSubtype?: string;
}

const props = withDefaults(defineProps<Props>(), {
  tags: () => [],
  logos: () => [],
  models: () => [],
  thumbnails: () => [],
  locale: 'en',
  username: '',
  creatorDisplayName: 'ComfyUI',
  creatorAvatarUrl: '',
  isApp: false,
  mediaType: '',
  mediaSubtype: '',
});

/** Neutral fallback chip when a card has no tags, derived from media type. */
const MEDIA_TYPE_LABELS: Record<string, string> = {
  image: 'Image',
  video: 'Video',
  audio: 'Audio',
  '3d': '3D',
};
const tagFallbackLabel = computed(() => MEDIA_TYPE_LABELS[props.mediaType] ?? '');

const modelLogos = computed(() =>
  resolveTemplateLogos({ logos: props.logos, models: props.models }).slice(0, 3)
);

const authorName = computed(() => props.creatorDisplayName || 'ComfyUI');

const templateUrl = computed(() => workflowDetailPath(props.name, props.shareId, props.locale));

const primaryFile = computed(() => props.thumbnails[0] ?? null);
const secondaryFile = computed(() => props.thumbnails[1] ?? null);

const isAudioThumb = computed(() => {
  const f = primaryFile.value;
  return Boolean(f && isAudioFile(f));
});

const isVideoPrimary = computed(() => {
  const f = primaryFile.value;
  return Boolean(f && isVideoFile(f));
});

const videoUrl = computed(() => {
  if (!isVideoPrimary.value) return null;
  return thumbnailPath(primaryFile.value!);
});

const posterUrl = computed(() => {
  if (!videoUrl.value) return null;
  return getVideoFrameUrl(videoUrl.value);
});

const videoFailed = ref(false);

function onVideoError() {
  videoFailed.value = true;
}

const primaryUrl = computed(() => {
  const f = primaryFile.value;
  if (!f || isMediaFile(f)) return null;
  return thumbnailPath(f);
});

const hasSecondImage = computed(() => {
  const f = secondaryFile.value;
  if (!f) return false;
  if (isMediaFile(f)) {
    return false;
  }
  return true;
});

const secondaryUrl = computed(() => {
  if (!hasSecondImage.value || !secondaryFile.value) return null;
  return thumbnailPath(secondaryFile.value);
});

const showCompare = computed(
  () =>
    props.thumbnailVariant === 'compareSlider' &&
    hasSecondImage.value &&
    Boolean(primaryUrl.value && secondaryUrl.value)
);

const showHoverDissolve = computed(
  () =>
    props.thumbnailVariant === 'hoverDissolve' &&
    hasSecondImage.value &&
    Boolean(primaryUrl.value && secondaryUrl.value)
);

const isAnimatedWebp = computed(
  () =>
    props.mediaSubtype === 'webp' &&
    Boolean(primaryUrl.value) &&
    !showCompare.value &&
    !showHoverDissolve.value
);

const showZoomHover = computed(() => {
  const v = props.thumbnailVariant;
  if (v !== 'zoomHover' && v !== 'hoverZoom') return false;
  if (!primaryUrl.value) return false;
  if (showCompare.value || showHoverDissolve.value) return false;
  return true;
});

const compareRoot = ref<HTMLElement | null>(null);
let removeCompareListeners: (() => void) | undefined;

function bindCompare() {
  removeCompareListeners?.();
  removeCompareListeners = undefined;
  if (props.thumbnailVariant !== 'compareSlider' || !hasSecondImage.value) return;
  const el = compareRoot.value;
  if (!el) return;
  removeCompareListeners = initCompareSlider(el);
}

watch(
  () => [props.thumbnailVariant, props.thumbnails, compareRoot.value] as const,
  () => {
    nextTick(bindCompare);
  },
  { flush: 'post', deep: true }
);

onMounted(() => {
  nextTick(bindCompare);
});

onUnmounted(() => {
  removeCompareListeners?.();
});

const creatorUrl = computed(() =>
  props.username ? creatorPath(props.username, props.locale) : null
);

function handleCardClick() {
  if (!templateUrl.value) return;
  window.location.href = templateUrl.value;
}
</script>

<template>
  <div
    class="group/pill-trigger group flex flex-col gap-4 rounded-4xl bg-hub-surface overflow-hidden pt-2 px-2 pb-6 transition-colors duration-200 content-auto hover:bg-hub-surface-hover"
    :class="templateUrl ? 'cursor-pointer' : ''"
    @click="handleCardClick"
  >
    <div class="aspect-4/3 bg-hub-surface rounded-[1.75rem] overflow-hidden relative">
      <div
        v-if="showCompare"
        ref="compareRoot"
        class="compare-slider relative h-full w-full overflow-hidden"
        data-compare-slider
      >
        <img
          :src="primaryUrl || ''"
          :alt="`${title} - After`"
          loading="lazy"
          decoding="async"
          draggable="false"
          class="w-full h-full object-cover select-none"
        />
        <div
          class="compare-overlay absolute inset-0 overflow-hidden"
          style="clip-path: inset(0 50% 0 0)"
        >
          <img
            :src="secondaryUrl || ''"
            :alt="`${title} - Before`"
            loading="lazy"
            decoding="async"
            draggable="false"
            class="w-full h-full object-cover select-none"
          />
        </div>
        <div
          class="compare-handle absolute top-0 bottom-0 w-1 bg-white shadow-lg cursor-ew-resize"
          style="left: 50%"
          aria-hidden="true"
        />
      </div>

      <div v-else-if="showHoverDissolve" class="group/thumb relative h-full w-full overflow-hidden">
        <img
          :src="primaryUrl || ''"
          :alt="`${title} - 1`"
          loading="lazy"
          decoding="async"
          draggable="false"
          class="w-full h-full object-cover transition-opacity duration-500 select-none"
        />
        <img
          :src="secondaryUrl || ''"
          :alt="`${title} - 2`"
          loading="lazy"
          decoding="async"
          draggable="false"
          class="absolute inset-0 w-full h-full object-cover opacity-0 group-hover/thumb:opacity-100 transition-opacity duration-500 select-none"
        />
      </div>

      <div
        v-else-if="isAudioThumb"
        class="w-full h-full flex items-center justify-center bg-linear-to-br from-white/5 to-white/10"
      >
        <svg
          class="w-16 h-16 text-content/20"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
          />
        </svg>
      </div>

      <img
        v-else-if="isVideoPrimary && videoUrl && videoFailed && posterUrl"
        :src="posterUrl"
        :alt="title"
        loading="lazy"
        decoding="async"
        draggable="false"
        class="w-full h-full object-cover select-none"
      />

      <video
        v-else-if="isVideoPrimary && videoUrl"
        :src="videoUrl"
        :poster="posterUrl || undefined"
        class="w-full h-full object-cover"
        preload="metadata"
        autoplay
        muted
        loop
        playsinline
        @error="onVideoError"
      />

      <img
        v-else-if="primaryUrl && isAnimatedWebp"
        :src="primaryUrl"
        :alt="title"
        loading="lazy"
        decoding="async"
        draggable="false"
        class="w-full h-full object-cover select-none"
      />

      <img
        v-else-if="primaryUrl && showZoomHover"
        :src="primaryUrl"
        :alt="title"
        loading="lazy"
        decoding="async"
        draggable="false"
        class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-125 select-none"
      />

      <img
        v-else-if="primaryUrl"
        :src="primaryUrl"
        :alt="title"
        loading="lazy"
        decoding="async"
        draggable="false"
        class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 select-none"
      />

      <div
        v-else
        class="w-full h-full flex items-center justify-center bg-linear-to-br from-white/5 to-white/10"
      >
        <svg
          class="w-10 h-10 text-content/20"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"
          />
        </svg>
      </div>

      <!-- Bottom-up scrim so the title overlaid at the bottom stays legible on
           bright thumbnails. pointer-events-none keeps the compare slider
           draggable underneath. -->
      <div
        class="absolute inset-x-0 bottom-0 h-2/3 pointer-events-none bg-linear-to-t from-black/70 via-black/30 to-transparent"
        aria-hidden="true"
      />

      <h3
        class="absolute bottom-5 left-5 right-5 z-10 font-medium text-content-bright text-base leading-[1.3] line-clamp-2 drop-shadow-md pointer-events-none sm:text-lg lg:text-xl"
      >
        <a
          v-if="templateUrl"
          :href="templateUrl"
          class="pointer-events-auto"
          data-testid="workflow-card-link"
          @click.stop
        >
          {{ title }}
        </a>
        <template v-else>{{ title }}</template>
      </h3>

      <!-- Glass model badges — mirrors ModelBadges.astro; keep the classes in sync. -->
      <div
        v-if="modelLogos.length"
        class="absolute top-4 right-4 z-10 flex items-center justify-center gap-1 rounded-2xl bg-transparency-white-t8 backdrop-blur-sm"
        :class="modelLogos.length > 1 ? 'h-10 w-auto px-2' : 'size-10'"
      >
        <img
          v-for="logo in modelLogos"
          :key="logo.name"
          :src="logo.src"
          :alt="logo.name"
          :title="logo.name"
          class="size-7 rounded-full object-contain"
          loading="lazy"
        />
      </div>
    </div>

    <div class="flex flex-col gap-4 px-4">
      <div class="flex items-center justify-between gap-2">
        <a
          v-if="creatorUrl"
          :href="creatorUrl"
          class="creator-link flex items-center gap-2 min-w-0 w-fit text-content-secondary hover:text-content transition-colors"
          @click.stop
        >
          <Avatar :src="creatorAvatarUrl" :name="authorName" class="size-5" />
          <span class="ppformula-text-center-sm text-base truncate">{{ authorName }}</span>
        </a>
        <div v-else class="flex items-center gap-2 min-w-0 text-content-secondary">
          <Avatar :src="creatorAvatarUrl" :name="authorName" class="size-5" />
          <span class="ppformula-text-center-sm text-base truncate">{{ authorName }}</span>
        </div>

        <ButtonPill
          v-if="templateUrl"
          as="a"
          :href="templateUrl"
          variant="solid"
          mode="reveal"
          class="shrink-0"
          :aria-label="title"
          @click.stop
        >
          Try now
        </ButtonPill>
      </div>

      <TagRow :tags="tags" :locale="locale" :fallback-label="tagFallbackLabel" />
    </div>
  </div>
</template>
