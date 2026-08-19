<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

import { cn } from '../../lib/utils';
import { buildSdkSnippet, extractSnippetNodes } from '../../lib/sdk-snippet';
import { buttonVariants } from '../ui/button';

// Labels are resolved in Astro and passed as props — islands don't import i18n.
const props = defineProps<{
  downloadUrl: string;
  canonicalJsonUrl: string;
  templateName: string;
  templateTitle: string;
  initialSnippet: string;
  personalized: boolean;
  sdkIntro: string;
  copyLabel: string;
  copiedLabel: string;
  loadingLabel: string;
  errorLabel: string;
}>();

const payload = ref<string | null>(null);
const failed = ref(false);
const copied = ref(false);
const snippet = ref(props.initialSnippet);

let inflight: Promise<string | null> | null = null;
let copyResetTimer: number | undefined;

const payloadText = computed(
  () => payload.value ?? (failed.value ? props.errorLabel : props.loadingLabel)
);

// Hub-sourced workflows ship no graph in this repo, so their snippet renders
// generic and is filled in here from the payload the panel already fetches.
function personalizeFrom(text: string) {
  if (props.personalized) return;
  try {
    const graph: unknown = JSON.parse(text);
    if (!graph || typeof graph !== 'object' || !('nodes' in graph)) return;
    const nodes = extractSnippetNodes(graph as Parameters<typeof extractSnippetNodes>[0]);
    if (!nodes.outputNode) return;
    snippet.value = buildSdkSnippet({
      title: props.templateTitle,
      templateName: props.templateName,
      nodes,
    });
  } catch {
    /* leave the documented generic snippet in place */
  }
}

function load(): Promise<string | null> {
  if (payload.value !== null) return Promise.resolve(payload.value);
  inflight ??= fetch(props.downloadUrl)
    .then(async (res) => {
      if (!res.ok) throw new Error(String(res.status));
      const text = await res.text();
      payload.value = text;
      failed.value = false;
      personalizeFrom(text);
      return text;
    })
    .catch(() => {
      failed.value = true;
      inflight = null;
      return null;
    });
  return inflight;
}

// The island hydrates as the section nears the viewport (client:visible with a
// rootMargin), so mounting is already the right moment to pull the payload.
onMounted(() => void load());

async function copy() {
  const text = await load();
  if (text === null) return;
  try {
    await navigator.clipboard.writeText(text);
    copied.value = true;
    window.clearTimeout(copyResetTimer);
    copyResetTimer = window.setTimeout(() => {
      copied.value = false;
    }, 1200);
  } catch {
    /* clipboard unavailable */
  }
}
</script>

<template>
  <div>
    <div class="mt-5 flex flex-wrap items-center gap-3">
      <button
        type="button"
        :class="
          cn(
            buttonVariants({ variant: 'brand-outline', size: 'nav' }),
            'cursor-pointer uppercase transition-colors'
          )
        "
        @click="copy"
      >
        <span class="ppformula-text-center-sm">{{ copied ? copiedLabel : copyLabel }}</span>
      </button>
    </div>

    <div class="mt-4 overflow-hidden rounded-2xl border border-white/15">
      <div class="border-b border-white/15 px-4 py-2.5">
        <code class="break-all text-xs text-hub-muted">GET {{ canonicalJsonUrl }}</code>
      </div>
      <pre
        class="api-payload-pre max-h-96 overflow-auto p-4 text-xs leading-relaxed text-hub-muted"
        >{{ payloadText }}</pre
      >
    </div>

    <p class="mt-6 max-w-2xl text-sm text-hub-muted">{{ sdkIntro }}</p>
    <div class="mt-3 overflow-hidden rounded-2xl border border-white/15">
      <pre class="api-sdk-pre overflow-auto p-4 text-xs leading-relaxed text-hub-muted">{{
        snippet
      }}</pre>
    </div>
  </div>
</template>
