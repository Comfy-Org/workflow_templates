<script setup lang="ts">
import { Check, Copy } from 'lucide-vue-next';
import { ref } from 'vue';

import { codeBlockControl } from './code-block-styles';

// `resolve` defers the text so the payload button can await the lazy fetch and
// the snippet button can hand back whatever is currently rendered.
const { resolve, label, copiedLabel } = defineProps<{
  resolve: () => string | null | Promise<string | null>;
  label: string;
  copiedLabel: string;
}>();

const copied = ref(false);
let resetTimer: number | undefined;

async function copy() {
  const text = await resolve();
  if (text === null) return;
  try {
    await navigator.clipboard.writeText(text);
    copied.value = true;
    window.clearTimeout(resetTimer);
    resetTimer = window.setTimeout(() => {
      copied.value = false;
    }, 1200);
  } catch {
    /* clipboard unavailable */
  }
}
</script>

<template>
  <button
    type="button"
    :title="copied ? copiedLabel : label"
    :aria-label="copied ? copiedLabel : label"
    :class="codeBlockControl"
    @click="copy"
  >
    <Check v-if="copied" class="size-3.5" />
    <Copy v-else class="size-3.5" />
  </button>
</template>
