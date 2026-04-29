<script setup lang="ts">
/**
 * HubWorkflowCard - Unified workflow card component.
 * Used inside Vue islands (WorkflowGrid.vue) and SSR-rendered in Astro pages.
 * Visual structure: square thumbnail, logo overlay, title, author, tag pills.
 */
import { Badge } from '@/components/ui/badge';
import { computed, ref, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { tagSlug, tagDisplayName } from '@/lib/tag-aliases';
import { slugify } from '@/lib/slugify';
import type { ThumbnailVariant } from '@/lib/hub-api';
import { initCompareSlider } from '@/lib/initCompareSlider';
import { getVideoFrameUrl } from '@/lib/video-thumbnail';
import { isVideoFile, isAudioFile, isMediaFile } from '@/lib/media-utils';
import { workflowDetailPath } from '@/lib/routes';

const MODEL_TO_LOGO: Record<string, string> = {
  Grok: 'grok',
  OpenAI: 'openai',
  Stability: 'stability',
  'Stable Diffusion': 'stability',
  SDXL: 'stability',
  Wan: 'wan',
  Flux: 'bfl',
  Google: 'google',
  Runway: 'runway',
  Luma: 'luma',
  Kling: 'kling',
  Hunyuan: 'hunyuan',
  ByteDance: 'bytedance',
  HitPaw: 'hitpaw',
  Recraft: 'recraft',
  Topaz: 'topaz',
  Vidu: 'vidu',
  WaveSpeed: 'wavespeed',
  Mochi: 'mochi',
  Pika: 'pika',
  Sora: 'sora',
  Minimax: 'minimax',
  Lightricks: 'lightricks',
  Ideogram: 'ideogram',
  Magnific: 'magnific',
  Rodin: 'rodin',
  Tripo: 'tripo',
  PixVerse: 'pixverse',
  Bria: 'bria',
};

interface Props {
  name: string;
  title: string;
  shareId?: string;
  tags?: string[];
  logos?: { provider: string | string[] }[];
  thumbnails?: string[];
  locale?: string;
  username?: string;
  creatorDisplayName?: string;
  creatorAvatarUrl?: string;
  isApp?: boolean;
  hideAuthor?: boolean;
  thumbnailVariant?: ThumbnailVariant;
  mediaSubtype?: string;
}

const props = withDefaults(defineProps<Props>(), {
  tags: () => [],
  logos: () => [],
  thumbnails: () => [],
  locale: 'en',
  username: '',
  creatorDisplayName: 'ComfyUI',
  creatorAvatarUrl: '',
  isApp: false,
  hideAuthor: false,
  mediaSubtype: '',
});

function getLogoPath(name: string): string | null {
  const slug = MODEL_TO_LOGO[name];
  if (slug) return `/logos/${slug}.png`;
  const lower = name.toLowerCase();
  for (const [key, val] of Object.entries(MODEL_TO_LOGO)) {
    if (lower.includes(key.toLowerCase())) return `/logos/${val}.png`;
  }
  return null;
}

const providerName = computed(() => {
  const p = props.logos?.[0]?.provider;
  return Array.isArray(p) ? p[0] : p || null;
});

const logoPath = computed(() => (providerName.value ? getLogoPath(providerName.value) : null));

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
  const f = primaryFile.value!;
  if (f.startsWith('http://') || f.startsWith('https://')) return f;
  return `/workflows/thumbnails/${f}`;
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
  if (!f) return null;
  if (isMediaFile(f)) {
    return null;
  }
  if (f.startsWith('http://') || f.startsWith('https://')) return f;
  return `/workflows/thumbnails/${f}`;
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
  const f = secondaryFile.value;
  if (f.startsWith('http://') || f.startsWith('https://')) return f;
  return `/workflows/thumbnails/${f}`;
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

const displayTags = computed(() => props.tags.slice(0, 3));

function getTagUrl(tag: string): string {
  const base = `/workflows/tag/${tagSlug(tag)}/`;
  return props.locale && props.locale !== 'en' ? `/${props.locale}${base}` : base;
}

const creatorUrl = computed(() => {
  if (!props.username) return null;
  const base = `/workflows/${slugify(props.username)}/`;
  return props.locale && props.locale !== 'en' ? `/${props.locale}${base}` : base;
});

function handleCardClick() {
  if (!templateUrl.value) return;
  window.location.href = templateUrl.value;
}
</script>

<template>
  <div
    class="group transition-all duration-200 content-auto"
    :class="templateUrl ? 'cursor-pointer' : ''"
    @click="handleCardClick"
  >
    <!-- Thumbnail -->
    <div class="aspect-square bg-hub-surface rounded-xl overflow-hidden relative">
      <!-- Compare slider -->
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
        >
          <div
            class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center"
          >
            <svg
              class="w-4 h-4 text-gray-600"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              aria-hidden="true"
            >
              <path d="M8 12H16M8 12L11 9M8 12L11 15M16 12L13 9M16 12L13 15" />
            </svg>
          </div>
        </div>
      </div>

      <!-- Hover crossfade -->
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
        class="w-full h-full flex items-center justify-center bg-gradient-to-br from-white/5 to-white/10"
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
        class="w-full h-full flex items-center justify-center bg-gradient-to-br from-white/5 to-white/10"
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

      <!-- Logo overlay -->
      <div v-if="logoPath" class="absolute top-3 left-3 flex items-center gap-2 z-10">
        <img
          :src="logoPath"
          :alt="providerName || ''"
          class="size-7 rounded-full object-contain bg-black/40 backdrop-blur-sm p-0.5"
        />
        <span class="text-content text-sm font-semibold drop-shadow-lg">
          {{ providerName }}
        </span>
      </div>
    </div>

    <!-- Title -->
    <div class="pt-3 pb-1">
      <h3
        class="font-semibold text-content text-base leading-tight line-clamp-1 group-hover:text-brand group-has-[.creator-link:hover]:text-content group-has-[.tag-link:hover]:text-content transition-colors"
      >
        {{ title }}
      </h3>
    </div>

    <!-- Author line -->
    <a
      v-if="!hideAuthor && creatorUrl"
      :href="creatorUrl"
      class="creator-link flex items-center gap-2 pt-2 w-fit text-content-muted hover:text-content transition-colors"
      @click.stop
    >
      <img
        v-if="creatorAvatarUrl"
        :src="creatorAvatarUrl"
        :alt="authorName"
        class="size-5 rounded-full shrink-0 object-cover"
      />
      <div v-else class="size-5 rounded-full shrink-0 flex items-center justify-center bg-brand">
        <span class="text-black text-[10px] font-bold leading-none">{{
          authorName.charAt(0).toUpperCase()
        }}</span>
      </div>
      <span class="text-sm truncate">{{ authorName }}</span>
    </a>
    <div v-else-if="!hideAuthor" class="flex items-center gap-2 pt-2">
      <img
        v-if="creatorAvatarUrl"
        :src="creatorAvatarUrl"
        :alt="authorName"
        class="size-5 rounded-full shrink-0 object-cover"
      />
      <div v-else class="size-5 rounded-full shrink-0 flex items-center justify-center bg-brand">
        <span class="text-black text-[10px] font-bold leading-none">{{
          authorName.charAt(0).toUpperCase()
        }}</span>
      </div>
      <span class="text-content-muted text-sm truncate">{{ authorName }}</span>
    </div>

    <!-- Tag pills -->
    <div
      data-testid="tag-pills"
      class="flex items-center gap-1.5 pt-4 overflow-x-auto scrollbar-hide"
    >
      <a v-for="tag in displayTags" :key="tag" :href="getTagUrl(tag)" class="tag-link" @click.stop>
        <Badge
          variant="hub-pill"
          class="hover:bg-hub-surface transition-colors shrink-0 whitespace-nowrap"
        >
          {{ tagDisplayName(tag).toLowerCase().replace(/\s+/g, '-') }}
        </Badge>
      </a>
    </div>
  </div>
</template>
