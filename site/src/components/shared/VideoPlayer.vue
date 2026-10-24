<script setup lang="ts">
import {
  refAutoReset,
  useElementHover,
  useEventListener,
  useFullscreen,
  useMediaControls,
  useMouseInElement,
  whenever,
} from '@vueuse/core';
import { computed, shallowRef, useTemplateRef, watch } from 'vue';
import type { HTMLAttributes } from 'vue';
import { cn } from '@/lib/utils';

const {
  src,
  ariaLabel,
  class: className,
} = defineProps<{
  src?: string;
  ariaLabel?: string;
  class?: HTMLAttributes['class'];
}>();

const playerEl = useTemplateRef<HTMLDivElement>('playerEl');
const videoEl = useTemplateRef<HTMLVideoElement>('videoEl');
const scrubberEl = useTemplateRef<HTMLDivElement>('scrubberEl');

const { playing, currentTime, duration, muted } = useMediaControls(videoEl);
const { isSupported: fullscreenSupported, toggle: toggleFs } = useFullscreen(playerEl);

watch(
  videoEl,
  (element) => {
    if (!element) return;
    playing.value = !element.paused;
    muted.value = element.muted;
  },
  { flush: 'post' }
);

const hovering = useElementHover(playerEl);
const recentActivity = refAutoReset(false, 800);
const controlsVisible = computed(() => !playing.value || hovering.value || recentActivity.value);

function showControls() {
  recentActivity.value = true;
}

whenever(playing, showControls);

const nativeDuration = shallowRef(0);

function syncNativeDuration() {
  const elementDuration = videoEl.value?.duration;
  nativeDuration.value = elementDuration && Number.isFinite(elementDuration) ? elementDuration : 0;
}

watch(videoEl, syncNativeDuration);
useEventListener(videoEl, 'loadedmetadata', syncNativeDuration);
useEventListener(videoEl, 'durationchange', syncNativeDuration);

const effectiveDuration = computed(() => duration.value || nativeDuration.value);
const scrubbing = shallowRef(false);
const pendingTime = shallowRef(0);
const { elementX, elementWidth } = useMouseInElement(scrubberEl);

function stopScrubbing() {
  scrubbing.value = false;
}

useEventListener('mouseup', stopScrubbing, { passive: true });
useEventListener('touchend', stopScrubbing, { passive: true });
useEventListener('touchcancel', stopScrubbing, { passive: true });

watch([scrubbing, elementX], () => {
  if (!elementWidth.value || !effectiveDuration.value) return;

  const nextTime =
    Math.max(0, Math.min(1, elementX.value / elementWidth.value)) * effectiveDuration.value;

  pendingTime.value = nextTime;
  if (scrubbing.value) currentTime.value = nextTime;
});

const progress = computed(() =>
  effectiveDuration.value ? currentTime.value / effectiveDuration.value : 0
);
const displayTime = computed(() => (scrubbing.value ? pendingTime.value : currentTime.value));
const timestamp = computed(() => {
  const seconds = Math.floor(displayTime.value);
  const minutes = String(Math.floor(seconds / 60)).padStart(2, '0');
  const remainder = String(seconds % 60).padStart(2, '0');
  return `${minutes}:${remainder}`;
});

function handleScrubberKeydown(event: KeyboardEvent) {
  if (!effectiveDuration.value) return;

  switch (event.key) {
    case 'ArrowRight':
      currentTime.value = Math.min(currentTime.value + 5, effectiveDuration.value);
      break;
    case 'ArrowLeft':
      currentTime.value = Math.max(currentTime.value - 5, 0);
      break;
    case 'Home':
      currentTime.value = 0;
      break;
    case 'End':
      currentTime.value = effectiveDuration.value;
      break;
    default:
      return;
  }

  event.preventDefault();
}

function toggleFullscreen() {
  if (fullscreenSupported.value) {
    toggleFs();
    return;
  }

  const element = videoEl.value as
    | (HTMLVideoElement & { webkitEnterFullscreen?: () => void })
    | null;
  element?.webkitEnterFullscreen?.();
}
</script>

<template>
  <div
    ref="playerEl"
    :class="
      cn(
        'relative aspect-video overflow-hidden rounded-2xl border border-divider-subtle bg-black',
        className
      )
    "
    @pointermove="showControls"
    @pointerdown="showControls"
    @focusin="showControls"
  >
    <video
      v-if="src"
      ref="videoEl"
      :src="src"
      :aria-label="ariaLabel"
      class="size-full object-cover"
      preload="metadata"
      playsinline
      @click="playing = !playing"
    ></video>

    <div
      v-if="src"
      :class="
        cn(
          'absolute inset-x-0 bottom-0 flex items-center gap-3 p-4 transition-opacity duration-300',
          !controlsVisible && 'pointer-events-none opacity-0'
        )
      "
    >
      <button
        type="button"
        class="grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg bg-brand text-page transition-opacity hover:opacity-90"
        :aria-label="playing ? 'Pause video' : 'Play video'"
        @click="playing = !playing"
      >
        <svg
          v-if="playing"
          class="size-3"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <rect x="6" y="4" width="4" height="16" />
          <rect x="14" y="4" width="4" height="16" />
        </svg>
        <svg
          v-else
          class="ml-0.5 size-3"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M8 5v14l11-7z" />
        </svg>
      </button>

      <div
        ref="scrubberEl"
        class="relative h-1 flex-1 cursor-pointer rounded-full bg-white/20 select-none"
        role="slider"
        tabindex="0"
        aria-label="Seek video"
        :aria-valuemin="0"
        :aria-valuemax="effectiveDuration || 0"
        :aria-valuenow="displayTime"
        @keydown="handleScrubberKeydown"
        @mousedown="scrubbing = true"
        @touchstart.passive="scrubbing = true"
      >
        <div class="h-full rounded-full bg-brand" :style="{ width: `${progress * 100}%` }"></div>
      </div>

      <span class="shrink-0 text-xs text-white/80">{{ timestamp }}</span>

      <button
        type="button"
        class="grid size-8 shrink-0 place-items-center rounded-lg bg-brand text-page transition-opacity hover:opacity-90"
        aria-label="View video fullscreen"
        @click="toggleFullscreen"
      >
        <svg
          class="size-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3" />
          <path d="M16 21h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
        </svg>
      </button>

      <button
        type="button"
        class="grid size-8 shrink-0 place-items-center rounded-lg bg-brand text-page transition-opacity hover:opacity-90"
        :aria-label="muted ? 'Unmute video' : 'Mute video'"
        @click="muted = !muted"
      >
        <svg
          v-if="muted"
          class="size-3.5"
          viewBox="0 0 24 24"
          fill="currentColor"
          stroke="currentColor"
          stroke-width="1.5"
          aria-hidden="true"
        >
          <path d="M11 5L6 9H2v6h4l5 4V5z" stroke-linecap="round" stroke-linejoin="round" />
          <line x1="23" y1="9" x2="17" y2="15" stroke-width="2.5" />
          <line x1="17" y1="9" x2="23" y2="15" stroke-width="2.5" />
        </svg>
        <svg
          v-else
          class="size-3.5"
          viewBox="0 0 24 24"
          fill="currentColor"
          stroke="currentColor"
          stroke-width="1.5"
          aria-hidden="true"
        >
          <path d="M11 5L6 9H2v6h4l5 4V5z" stroke-linecap="round" stroke-linejoin="round" />
          <path
            d="M15.54 8.46a5 5 0 0 1 0 7.07"
            fill="none"
            stroke-width="2"
            stroke-linecap="round"
          />
          <path
            d="M19.07 4.93a10 10 0 0 1 0 14.14"
            fill="none"
            stroke-width="2"
            stroke-linecap="round"
          />
        </svg>
      </button>
    </div>
  </div>
</template>
