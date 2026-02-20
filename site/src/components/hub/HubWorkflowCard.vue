<script setup lang="ts">
/**
 * HubWorkflowCard - Vue equivalent of WorkflowCard.astro
 * Needed because Astro components can't render inside Vue islands.
 * Same visual structure: square thumbnail, logo overlay, title, author, tag pills.
 */
import { Badge } from '@/components/ui/badge'
import { computed } from 'vue'

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
}

interface Props {
  name: string
  title: string
  tags?: string[]
  logos?: { provider: string | string[] }[]
  thumbnails?: string[]
  locale?: string
}

const props = withDefaults(defineProps<Props>(), {
  tags: () => [],
  logos: () => [],
  thumbnails: () => [],
  locale: 'en',
})

function getLogoPath(name: string): string | null {
  const slug = MODEL_TO_LOGO[name]
  if (slug) return `/logos/${slug}.png`
  const lower = name.toLowerCase()
  for (const [key, val] of Object.entries(MODEL_TO_LOGO)) {
    if (lower.includes(key.toLowerCase())) return `/logos/${val}.png`
  }
  return null
}

const providerName = computed(() => {
  const p = props.logos?.[0]?.provider
  return Array.isArray(p) ? p[0] : p || null
})

const logoPath = computed(() =>
  providerName.value ? getLogoPath(providerName.value) : null,
)

const authorName = computed(() => providerName.value || 'ComfyUI')

const templateUrl = computed(() => {
  const base = `/templates/${props.name}/`
  return props.locale && props.locale !== 'en' ? `/${props.locale}${base}` : base
})

const primaryThumb = computed(() =>
  props.thumbnails.length > 0 ? `/templates/thumbnails/${props.thumbnails[0]}` : null,
)

const displayTags = computed(() => props.tags.slice(0, 3))
</script>

<template>
  <a :href="templateUrl" class="group block overflow-hidden transition-all duration-200">
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
        v-else
        class="w-full h-full flex items-center justify-center bg-gradient-to-br from-white/5 to-white/10"
      >
        <svg class="w-10 h-10 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
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

    <!-- Content -->
    <div class="pt-3 pb-1">
      <h3 class="font-semibold text-white text-base leading-tight line-clamp-1 group-hover:text-brand transition-colors">
        {{ title }}
      </h3>

      <!-- Author line -->
      <div class="flex items-center gap-2 mt-1.5">
        <div class="size-5 rounded-full shrink-0 flex items-center justify-center" :class="logoPath ? 'bg-white/20' : 'bg-blue-500'">
          <img v-if="logoPath" :src="logoPath" alt="" class="size-5 rounded-full object-contain" />
          <svg v-else class="size-3 text-white" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
          </svg>
        </div>
        <span class="text-white/50 text-sm truncate">{{ authorName }}</span>
      </div>

      <!-- Tag pills -->
      <div v-if="displayTags.length > 0" class="flex items-center gap-1.5 mt-2 overflow-hidden">
        <Badge
          v-for="tag in displayTags"
          :key="tag"
          variant="hub-tag"
        >
          {{ tag.toLowerCase().replace(/\s+/g, '-') }}
        </Badge>
      </div>
    </div>
  </a>
</template>
