<script setup lang="ts">
/**
 * HubWorkflowCard - Vue equivalent of WorkflowCard.astro
 * Needed because Astro components can't render inside Vue islands.
 * Same visual structure: square thumbnail, logo overlay, title, author, tag pills.
 */
import { Badge } from '@/components/ui/badge';
import { IconApps, IconWorkflow } from '@/components/ui/icons';
import { computed } from 'vue';
import { tagSlug, tagDisplayName } from '@/lib/tag-aliases';

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
  tags?: string[];
  logos?: { provider: string | string[] }[];
  thumbnails?: string[];
  locale?: string;
  username?: string;
  creatorDisplayName?: string;
  creatorAvatarUrl?: string;
  isApp?: boolean;
  hideAuthor?: boolean;
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

const templateUrl = computed(() => {
  const base = `/workflows/${props.name}/`;
  return props.locale && props.locale !== 'en' ? `/${props.locale}${base}` : base;
});

const primaryThumb = computed(() => {
  if (props.thumbnails.length === 0) return null;
  const file = props.thumbnails[0];
  if (file.endsWith('.mp3') || file.endsWith('.webm') || file.endsWith('.mp4')) return null;
  return `/workflows/thumbnails/${file}`;
});

const isAudioThumb = computed(() => {
  if (props.thumbnails.length === 0) return false;
  const file = props.thumbnails[0];
  return file.endsWith('.mp3') || file.endsWith('.webm');
});

const displayTags = computed(() => props.tags.slice(0, 3));

function getTagUrl(tag: string): string {
  const base = `/workflows/tag/${tagSlug(tag)}/`;
  return props.locale && props.locale !== 'en' ? `/${props.locale}${base}` : base;
}

const creatorUrl = computed(() => {
  if (!props.username) return null;
  const base = `/workflows/${props.username}/`;
  return props.locale && props.locale !== 'en' ? `/${props.locale}${base}` : base;
});

function handleCardClick() {
  window.location.href = templateUrl.value;
}
</script>

<template>
  <div
    class="group transition-all duration-200 content-auto cursor-pointer"
    @click="handleCardClick"
  >
    <!-- Thumbnail -->
    <div class="aspect-square bg-white/5 rounded-xl overflow-hidden relative">
      <img
        v-if="primaryThumb"
        :src="primaryThumb"
        :alt="title"
        loading="lazy"
        decoding="async"
        class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
      />
      <div
        v-else-if="isAudioThumb"
        class="w-full h-full flex items-center justify-center bg-gradient-to-br from-white/5 to-white/10"
      >
        <svg
          class="w-16 h-16 text-white/20"
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
      <div
        v-else
        class="w-full h-full flex items-center justify-center bg-gradient-to-br from-white/5 to-white/10"
      >
        <svg
          class="w-10 h-10 text-white/20"
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
        <span class="text-white text-sm font-semibold drop-shadow-lg">
          {{ providerName }}
        </span>
      </div>
    </div>

    <!-- Title -->
    <div class="pt-3 pb-1">
      <h3
        class="font-semibold text-white text-base leading-tight line-clamp-1 group-hover:text-brand group-has-[.creator-link:hover]:text-white group-has-[.tag-link:hover]:text-white transition-colors"
      >
        {{ title }}
      </h3>
    </div>

    <!-- Author line -->
    <a
      v-if="!hideAuthor && creatorUrl"
      :href="creatorUrl"
      class="creator-link flex items-center gap-2 pt-2 w-fit text-white/50 hover:text-white transition-colors"
      @click.stop
    >
      <img
        v-if="creatorAvatarUrl"
        :src="creatorAvatarUrl"
        :alt="authorName"
        class="size-5 rounded-full shrink-0 object-cover"
      />
      <div
        v-else
        class="size-5 rounded-full shrink-0 flex items-center justify-center bg-gradient-to-br from-[#c8ff00] to-[#a0cc00]"
      >
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
      <div
        v-else
        class="size-5 rounded-full shrink-0 flex items-center justify-center bg-gradient-to-br from-[#c8ff00] to-[#a0cc00]"
      >
        <span class="text-black text-[10px] font-bold leading-none">{{
          authorName.charAt(0).toUpperCase()
        }}</span>
      </div>
      <span class="text-white/50 text-sm truncate">{{ authorName }}</span>
    </div>

    <!-- Tag pills -->
    <div class="flex items-center gap-1.5 pt-4 overflow-hidden">
      <a
        v-for="tag in displayTags"
        :key="tag"
        :href="getTagUrl(tag)"
        class="tag-link"
        @click.stop
      >
        <Badge variant="hub-pill" class="hover:bg-white/15 transition-colors truncate max-w-28">
          {{ tagDisplayName(tag).toLowerCase().replace(/\s+/g, '-') }}
        </Badge>
      </a>
    </div>
  </div>
</template>
