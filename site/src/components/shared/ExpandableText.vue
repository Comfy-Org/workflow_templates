<script setup lang="ts">
/**
 * Expandable extended-description block for the workflow detail page.
 *
 * SEO: all paragraphs are rendered into the DOM (and SSR'd) regardless of
 * collapsed state — the cap is purely visual via max-height, so crawlers and
 * AI agents always see the full text.
 *
 * Behaviour: collapsed to a fixed height with a bottom fade. The toggle only
 * appears when the content actually exceeds the cap (measured on mount and on
 * resize). Expand/collapse animates max-height between the cap and the measured
 * content height, then releases the cap so later reflow isn't clipped. Honours
 * prefers-reduced-motion.
 *
 * Labels are resolved in Astro and passed as props — islands don't import i18n.
 */
import { ref, computed, onMounted, onUnmounted, useId, useTemplateRef } from 'vue';

const props = withDefaults(
  defineProps<{
    paragraphs: string[];
    moreLabel: string;
    lessLabel: string;
    collapsedMax?: number;
    textClass?: string;
  }>(),
  { collapsedMax: 320, textClass: 'text-base leading-relaxed text-content-secondary' }
);

/** Collapsed height cap, in px. */
const COLLAPSED_MAX = props.collapsedMax;

const contentRef = useTemplateRef<HTMLElement>('content');
const contentId = useId();
const expanded = ref(false);
const overflows = ref(false);

let resizeObserver: ResizeObserver | null = null;
let transitionTimer: number | null = null;

const toggleLabel = computed(() => (expanded.value ? props.lessLabel : props.moreLabel));

/** Inline style driving the collapse/expand animation. */
const containerStyle = ref<Record<string, string>>({ maxHeight: `${COLLAPSED_MAX}px` });

function measure() {
  const el = contentRef.value;
  if (!el) return;
  overflows.value = el.scrollHeight > COLLAPSED_MAX + 8;
  // While collapsed, keep the cap; while expanded, stay uncapped.
  if (!expanded.value) {
    containerStyle.value = overflows.value ? { maxHeight: `${COLLAPSED_MAX}px` } : {};
  }
}

function toggle() {
  const el = contentRef.value;
  if (!el) return;
  if (transitionTimer) window.clearTimeout(transitionTimer);

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!expanded.value) {
    // Expand: cap → measured full height → uncapped (so later reflow isn't clipped).
    expanded.value = true;
    if (reduce) {
      containerStyle.value = {};
      return;
    }
    containerStyle.value = { maxHeight: `${el.scrollHeight}px` };
    transitionTimer = window.setTimeout(() => {
      if (expanded.value) containerStyle.value = {};
    }, 400);
  } else {
    // Collapse: from current full height → cap (needs an explicit start height).
    expanded.value = false;
    if (reduce) {
      containerStyle.value = { maxHeight: `${COLLAPSED_MAX}px` };
      return;
    }
    containerStyle.value = { maxHeight: `${el.scrollHeight}px` };
    // Next frame: drop to the cap so the transition runs.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        containerStyle.value = { maxHeight: `${COLLAPSED_MAX}px` };
      });
    });
  }
}

onMounted(() => {
  measure();
  if (contentRef.value && 'ResizeObserver' in window) {
    resizeObserver = new ResizeObserver(() => measure());
    resizeObserver.observe(contentRef.value);
  }
});

onUnmounted(() => {
  resizeObserver?.disconnect();
  if (transitionTimer) window.clearTimeout(transitionTimer);
});
</script>

<template>
  <div>
    <div
      :id="contentId"
      ref="content"
      class="ext-desc relative flex flex-col gap-4 overflow-hidden motion-safe:transition-[max-height] motion-safe:duration-300 motion-safe:ease-out"
      :style="containerStyle"
    >
      <p v-for="(paragraph, i) in paragraphs" :key="i" :class="textClass">
        {{ paragraph }}
      </p>
      <!-- Fade only while collapsed and overflowing -->
      <div
        v-if="overflows && !expanded"
        class="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-linear-to-t from-page to-transparent"
        aria-hidden="true"
      />
    </div>
    <button
      v-if="overflows"
      type="button"
      class="mt-3 rounded-sm text-sm font-medium text-content transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      :aria-expanded="expanded"
      :aria-controls="contentId"
      @click="toggle"
    >
      {{ toggleLabel }}
    </button>
  </div>
</template>
