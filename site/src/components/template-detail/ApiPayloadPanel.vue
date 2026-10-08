<script setup lang="ts">
import { FileJson } from 'lucide-vue-next';

import { cn } from '../../lib/utils';
import { computed, nextTick, onMounted, ref, watch } from 'vue';

import { highlightInline } from '../../lib/highlight';
import CodeCopyButton from './CodeCopyButton.vue';
import CodeDownloadButton from './CodeDownloadButton.vue';
import type { SnippetLang } from '../../lib/sdk-snippet';
import { buildSdkSnippet, extractSnippetNodes } from '../../lib/sdk-snippet';

// Labels are resolved in Astro and passed as props — islands don't import i18n.
const props = defineProps<{
  downloadUrl: string;
  templateName: string;
  templateTitle: string;
  initialSnippet: string;
  initialSnippetHtml: string | null;
  initialTsSnippet: string;
  initialTsSnippetHtml: string | null;
  personalized: boolean;
  sdkIntro: string;
  copyLabel: string;
  downloadLabel: string;
  copiedLabel: string;
  loadingLabel: string;
  errorLabel: string;
}>();

const payload = ref<string | null>(null);
const failed = ref(false);
const snippet = ref(props.initialSnippet);
const tsSnippet = ref(props.initialTsSnippet);
// TypeScript leads: the SDK's npm package is the more common entry point.
const activeLang = ref<SnippetLang>('typescript');

const LANG_TABS: { lang: SnippetLang; label: string }[] = [
  { lang: 'typescript', label: 'TypeScript' },
  { lang: 'python', label: 'Python' },
];
// Tokenized markup for the two blocks; null keeps the plain-text rendering,
// which is also what oversized payloads and any highlighter failure fall back to.
const snippetHtml = ref(props.initialSnippetHtml);
const payloadHtml = ref<string | null>(null);

// Same bottom fade ExpandableText uses for clipped prose, here signalling that
// the payload scrolls on. Hidden once the end is reached, so the closing lines
// aren't left dimmed with nothing below them.
const payloadPre = ref<HTMLElement | null>(null);
const showFade = ref(false);

function updateFade() {
  const el = payloadPre.value;
  showFade.value = !!el && el.scrollHeight - el.scrollTop - el.clientHeight > 1;
}
const tsSnippetHtml = ref(props.initialTsSnippetHtml);

const shownSnippet = computed(() =>
  activeLang.value === 'typescript' ? tsSnippet.value : snippet.value
);
const shownSnippetHtml = computed(() =>
  activeLang.value === 'typescript' ? tsSnippetHtml.value : snippetHtml.value
);

let inflight: Promise<string | null> | null = null;

// The header names the file the download button hands over, standing in for the
// endpoint URL it used to print.
const fileName = computed(() => `${props.templateName}.json`);

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
    const args = { title: props.templateTitle, templateName: props.templateName, nodes };
    const nextPython = buildSdkSnippet({ ...args, lang: 'python' });
    const nextTs = buildSdkSnippet({ ...args, lang: 'typescript' });
    snippet.value = nextPython;
    tsSnippet.value = nextTs;
    void highlightInline(nextPython, 'python').then((html) => {
      snippetHtml.value = html;
    });
    void highlightInline(nextTs, 'typescript').then((html) => {
      tsSnippetHtml.value = html;
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
      void highlightInline(text, 'json').then((html) => {
        payloadHtml.value = html;
      });
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
onMounted(() => {
  updateFade();
  void load();
});

// The payload lands async and highlighting re-renders it, so remeasure after both.
watch([payloadText, payloadHtml], () => void nextTick(updateFade));
</script>

<template>
  <div>
    <div class="mt-4 overflow-hidden rounded-2xl border border-white/15">
      <div class="flex items-center justify-between gap-3 border-b border-white/15 px-4 py-2.5">
        <span class="flex min-w-0 items-center gap-2 text-hub-muted">
          <FileJson class="size-3.5 shrink-0" aria-hidden="true" />
          <code class="break-all text-xs">{{ fileName }}</code>
        </span>
        <div class="flex shrink-0 items-center gap-1">
          <CodeCopyButton :resolve="load" :label="copyLabel" :copied-label="copiedLabel" />
          <CodeDownloadButton :href="downloadUrl" :label="downloadLabel" />
        </div>
      </div>
      <div class="relative">
        <pre
          ref="payloadPre"
          class="api-payload-pre scrollbar-code max-h-96 overflow-auto whitespace-pre-wrap break-words p-4 text-xs leading-relaxed text-hub-muted"
          @scroll="updateFade"
        ><span v-if="payloadHtml" v-html="payloadHtml"></span><template v-else>{{
            payloadText
          }}</template></pre>
        <div
          v-show="showFade"
          class="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-linear-to-t from-page to-transparent"
        />
      </div>
    </div>

    <p class="mt-6 max-w-2xl text-sm text-hub-muted">{{ sdkIntro }}</p>
    <div class="mt-3 overflow-hidden rounded-2xl border border-white/15">
      <div class="flex items-center justify-between gap-3 border-b border-white/15 px-2 py-1.5">
        <div class="flex items-center gap-1" role="tablist">
          <button
            v-for="tab in LANG_TABS"
            :key="tab.lang"
            type="button"
            role="tab"
            :aria-selected="activeLang === tab.lang"
            :class="
              cn(
                'cursor-pointer rounded-lg px-3 py-1 text-xs font-medium transition-colors',
                activeLang === tab.lang
                  ? 'bg-hub-surface text-content'
                  : 'text-hub-muted hover:text-content'
              )
            "
            @click="activeLang = tab.lang"
          >
            {{ tab.label }}
          </button>
        </div>
        <CodeCopyButton
          class="mr-1"
          :resolve="() => shownSnippet"
          :label="copyLabel"
          :copied-label="copiedLabel"
        />
      </div>
      <pre
        class="api-sdk-pre scrollbar-code overflow-auto whitespace-pre-wrap break-words p-4 text-xs leading-relaxed text-hub-muted"
      ><span v-if="shownSnippetHtml" v-html="shownSnippetHtml"></span><template v-else>{{
          shownSnippet
        }}</template></pre>
    </div>
  </div>
</template>
