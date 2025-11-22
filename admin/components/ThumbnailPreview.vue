<template>
  <!-- BaseThumbnail equivalent -->
  <div 
    ref="containerRef"
    class="relative aspect-square w-full overflow-hidden rounded-lg border bg-muted select-none"
    :class="className"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
  >
    <!-- Default/No Effect -->
    <div v-if="variant === 'none' || variant === '' || !variant" class="h-full w-full">
      <img 
        v-if="images.length > 0 && images[0].type.startsWith('image/')"
        :src="getFileUrl(images[0])" 
        :alt="'Thumbnail preview'"
        class="transform-gpu transition-transform duration-300 ease-out w-full h-full object-cover"
        :style="isHovered ? { transform: `scale(${1 + hoverZoom / 100})` } : undefined"
        draggable="false"
      />
      <div v-else class="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
        No Preview
      </div>
    </div>

    <!-- Hover Dissolve Effect -->
    <div v-else-if="variant === 'hoverDissolve' && images.length >= 2" class="relative h-full w-full">
      <div class="absolute inset-0">
        <img 
          v-if="images[0] && images[0].type.startsWith('image/')"
          :src="getFileUrl(images[0])" 
          :alt="'Base image'"
          class="size-full object-cover"
          draggable="false"
        />
      </div>
      <div class="absolute inset-0 z-10">
        <img 
          v-if="images[1] && images[1].type.startsWith('image/')"
          :src="getFileUrl(images[1])" 
          :alt="'Hover image'"
          class="size-full transition-opacity duration-300 object-cover"
          :class="isHovered ? 'opacity-100' : 'opacity-0'"
          draggable="false"
        />
      </div>
    </div>

    <!-- Compare Slider Effect -->
    <div v-else-if="variant === 'compareSlider' && images.length >= 2" class="h-full w-full relative">
      <!-- Base image -->
      <img 
        v-if="images[0] && images[0].type.startsWith('image/')"
        :src="getFileUrl(images[0])" 
        :alt="'Before image'"
        class="w-full h-full object-cover"
        draggable="false"
      />
      
      <!-- Overlay container -->
      <div class="absolute inset-0">
        <img 
          v-if="images[1] && images[1].type.startsWith('image/')"
          :src="getFileUrl(images[1])" 
          :alt="'After image'"
          class="w-full h-full object-cover"
          :style="{
            clipPath: `inset(0 ${100 - sliderPosition}% 0 0)`
          }"
          draggable="false"
        />
      </div>
      
      <!-- Slider line -->
      <div
        class="pointer-events-none absolute inset-y-0 z-10 w-0.5 bg-white/30 backdrop-blur-sm"
        :style="{
          left: `${sliderPosition}%`
        }"
      />
    </div>

    <!-- Zoom Hover Effect -->
    <div v-else-if="variant === 'zoomHover'" class="h-full w-full">
      <img 
        v-if="images.length > 0 && images[0].type.startsWith('image/')"
        :src="getFileUrl(images[0])" 
        :alt="'Thumbnail preview'"
        class="transform-gpu transition-transform duration-300 ease-out w-full h-full object-cover"
        :style="isHovered ? { transform: `scale(${1 + hoverZoom / 100})` } : undefined"
        draggable="false"
      />
      <div v-else class="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
        No Preview
      </div>
    </div>

    <!-- Audio thumbnail -->
    <div v-else-if="images.length > 0 && images[0].type.startsWith('audio/')" class="h-full w-full">
      <div
        class="flex h-full w-full items-center justify-center p-4"
        :style="{
          backgroundImage: 'url(/assets/images/default-template.png)',
          backgroundRepeat: 'round'
        }"
      >
        <audio controls class="relative w-full" :src="getFileUrl(images[0])" @click.stop />
      </div>
    </div>

    <!-- Fallback for insufficient images -->
    <div v-else-if="images.length < 2 && (variant === 'hoverDissolve' || variant === 'compareSlider')" 
         class="w-full h-full flex items-center justify-center text-xs text-muted-foreground bg-muted">
      <div class="text-center">
        <div>{{ variant === 'hoverDissolve' ? 'Hover Dissolve' : 'Compare Slider' }}</div>
        <div class="text-[10px] mt-1">Needs 2+ images</div>
      </div>
    </div>

    <!-- Unknown variant fallback -->
    <div v-else class="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
      {{ variant || 'No Effect' }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { useMouseInElement } from '@vueuse/core'

interface Props {
  variant: string
  images: File[]
  className?: string
  hoverZoom?: number
}

const props = withDefaults(defineProps<Props>(), {
  className: '',
  hoverZoom: 10
})

const isHovered = ref(false)
const sliderPosition = ref(50)
const containerRef = ref<HTMLElement | null>(null)

const { elementX, elementWidth, isOutside } = useMouseInElement(containerRef)

// Update slider position for compare slider
watch(
  [() => isHovered.value, elementX, elementWidth, isOutside],
  ([isHovered, x, width, outside]) => {
    if (!isHovered || props.variant !== 'compareSlider') return
    if (!outside) {
      sliderPosition.value = (x / width) * 100
    }
  }
)

const getFileUrl = (file: File): string => {
  return URL.createObjectURL(file)
}

// Cleanup object URLs when component unmounts
onUnmounted(() => {
  props.images.forEach(file => {
    if (file instanceof File) {
      URL.revokeObjectURL(getFileUrl(file))
    }
  })
})
</script>