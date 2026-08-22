<script setup lang="ts">
import { Check, Copy } from 'lucide-vue-next';
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import {
  ASPECT_RATIOS,
  CROP_MODES,
  RESOLUTION_PRESETS,
  DEFAULTS,
  FPS,
  KEYFRAMES,
  QUEUE_STALE_MS,
  SAMPLERS,
  SCHEDULERS,
  clipLengthFrames,
  frameSizeFor,
  maxFrameFor,
  validateSeconds,
  type DemoSettings,
  type JobOutput,
  type QueueState,
} from '@/lib/demos/mmh3/config';

const props = defineProps<{
  defaultPrompt: string;
  exampleKeyframes: string[];
  exampleVideo: string | null;
  /** System prompt for writing shot descriptions with an agent, if bundled. */
  agentPromptUrl: string | null;
}>();

type RunState = 'idle' | 'submitting' | 'queued' | 'running' | 'succeeded' | 'failed';

const settings = reactive<DemoSettings>({ ...DEFAULTS, prompt: props.defaultPrompt });

/** One entry per reference slot: the uploaded File plus a preview URL. */
const slots = reactive(
  KEYFRAMES.map((slot, i) => ({
    ...slot,
    file: null as File | null,
    preview: props.exampleKeyframes[i] ?? '',
    isExample: true,
    enabled: true,
    /** True while the browser is re-encoding a freshly dropped image. */
    preparing: false,
    /** Size of what the user picked, and of what will actually be uploaded. */
    originalBytes: 0,
    uploadBytes: 0,
  }))
);

const state = ref<RunState>('idle');
const jobId = ref<string | null>(null);
const errorMessage = ref<string | null>(null);
const outputs = ref<JobOutput[]>([]);
const elapsed = ref(0);
const queuedFor = ref(0);
const queuePosition = ref<number | null>(null);
const progressValue = ref<number | null>(null);
const showAdvanced = ref(false);
const promptCopied = ref(false);
const promptCopyFailed = ref(false);
let copyResetTimer: number | undefined;
const dragSlot = ref<number | null>(null);

const queue = ref<QueueState>({ available: false });
const queueAgeMs = ref(0);

let pollTimer: ReturnType<typeof setTimeout> | null = null;
let clockTimer: ReturnType<typeof setInterval> | null = null;
let queueTimer: ReturnType<typeof setInterval> | null = null;
const objectUrls: string[] = [];

const frames = computed(() => clipLengthFrames(settings.seconds));

/** Preset labels carry the megapixel budget and the frame size it works out to. */
const resolutionOptions = computed(() =>
  RESOLUTION_PRESETS.map((preset) => {
    const { width, height } = frameSizeFor(settings.aspectRatio, preset.megapixels);
    return {
      ...preset,
      detail: `${preset.megapixels} MP · ${width}×${height}`,
    };
  })
);
const selectedResolution = computed(() =>
  resolutionOptions.value.find((o) => o.megapixels === settings.megapixels)
);
const enabledIndexes = computed(() => slots.filter((s) => s.enabled).map((s) => s.index));
const usingExampleFrames = computed(() => slots.every((s) => s.isExample));
const preparingCount = computed(() => slots.filter((s) => s.preparing).length);

/** Only reports on images the browser actually shrank. */
const compression = computed(() => {
  const shrunk = slots.filter((s) => s.enabled && s.uploadBytes && s.uploadBytes < s.originalBytes);
  if (!shrunk.length) return null;
  return {
    count: shrunk.length,
    before: shrunk.reduce((sum, s) => sum + s.originalBytes, 0),
    after: shrunk.reduce((sum, s) => sum + s.uploadBytes, 0),
  };
});
const secondsError = computed(() =>
  validateSeconds(settings.seconds, maxFrameFor(enabledIndexes.value))
);
/** The node needs at least one image to anchor, so the last one can't go. */
const emptyError = computed(() =>
  enabledIndexes.value.length ? null : 'Keep at least one reference image.'
);
const blockingError = computed(() => secondsError.value ?? emptyError.value);
const isBusy = computed(() => ['submitting', 'queued', 'running'].includes(state.value));

/**
 * The generated video once there is one, otherwise the bundled example.
 *
 * A failed run shows nothing: leaving the example on screen next to an error
 * reads as though it were the result of that run.
 */
const video = computed(() => {
  if (outputs.value.length) {
    const out = outputs.value[0];
    return { url: out.url, name: out.name, sizeBytes: out.sizeBytes, isExample: false };
  }
  if (state.value === 'failed') return null;
  return props.exampleVideo
    ? { url: props.exampleVideo, name: 'Example result', sizeBytes: 0, isExample: true }
    : null;
});

const runLabel = computed(() => {
  switch (state.value) {
    case 'submitting':
      return 'Uploading references…';
    case 'queued':
      return queuePosition.value ? `Queued · #${queuePosition.value} in line` : 'Queued…';
    case 'running':
      return progressValue.value !== null
        ? `Generating… ${Math.round(progressValue.value * 100)}%`
        : `Generating… ${elapsed.value}s`;
    default:
      return 'Run workflow';
  }
});

const runCaption = computed(() => {
  switch (state.value) {
    case 'submitting':
      return 'Sending your images to the deployment.';
    case 'queued':
      return queuedFor.value > 3
        ? `Waiting for a free worker — ${queuedFor.value}s so far.`
        : 'Waiting for a free worker.';
    case 'running':
      return 'A worker is rendering your clip. This usually takes a few minutes.';
    default:
      return null;
  }
});

/** Queue depth is sampled, not live, so an old sample is labelled as such. */
const queueStale = computed(() => queueAgeMs.value > QUEUE_STALE_MS);
const queueLabel = computed(() => {
  if (!queue.value.available || queue.value.jobsInQueue === undefined) return null;
  const n = queue.value.jobsInQueue;
  const jobs = n === 1 ? '1 job' : `${n} jobs`;
  return queueStale.value ? `${jobs} queued (last known)` : `${jobs} queued`;
});
const busyWorkers = computed(() => queue.value.workers?.running ?? 0);

/**
 * Read a response that is *usually* JSON.
 *
 * Our routes always answer with JSON, but the platform in front of them does
 * not: an oversized upload is rejected by Vercel itself with an HTML error
 * page, and a gateway fault can do the same. Parsing those blindly surfaced
 * the parser's complaint ("Unexpected token 'R'...") instead of the real
 * failure, so fall back to a message built from the status.
 */
async function readResponse(res: Response): Promise<{ error?: string; [key: string]: unknown }> {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { error: httpErrorMessage(res.status, text) };
  }
}

function httpErrorMessage(status: number, body: string): string {
  if (status === 413) {
    return 'Those reference images are too large to upload in one request. Try smaller images, or remove a reference.';
  }
  if (status === 504) return 'The request timed out before the server answered. Try again.';
  const detail = body.trim().split('\n')[0].slice(0, 120);
  return detail ? `Request failed (${status}): ${detail}` : `Request failed (${status}).`;
}

async function refreshQueue() {
  try {
    const res = await fetch('/api/workflows/minimax-h3-multiref/queue');
    const body = (await readResponse(res)) as QueueState;
    queue.value = body;
    queueAgeMs.value = body.sampledAt ? Date.now() - new Date(body.sampledAt).getTime() : 0;
  } catch {
    queue.value = { available: false };
  }
}

/**
 * Hands the agent instructions to the clipboard. The text is fetched here
 * rather than inlined in the page so its weight is only paid on click; the
 * icon and reset behaviour mirror the site's own CodeCopyButton.
 */
async function copyAgentPrompt() {
  if (!props.agentPromptUrl) return;
  promptCopyFailed.value = false;
  try {
    const res = await fetch(props.agentPromptUrl);
    if (!res.ok) throw new Error(String(res.status));
    await navigator.clipboard.writeText(await res.text());
    promptCopied.value = true;
    window.clearTimeout(copyResetTimer);
    copyResetTimer = window.setTimeout(() => {
      promptCopied.value = false;
    }, 1600);
  } catch {
    // Clipboard blocked (insecure context, permissions) or the fetch failed —
    // point at the file so the text is still reachable.
    promptCopyFailed.value = true;
  }
}

/**
 * Longest edge kept for an uploaded reference. The workflow renders at most
 * ~1464px wide, and the keyframes node crops and resizes every reference to
 * the frame, so anything beyond this is detail the model never sees.
 */
const MAX_REFERENCE_EDGE = 1536;
/** Skip work on images that are already small enough to not matter. */
const COMPRESS_THRESHOLD_BYTES = 600_000;
/** Vercel rejects function requests over 4.5 MB; stay clear of the edge. */
const MAX_UPLOAD_BYTES = 3.5 * 1024 * 1024;

/**
 * Re-encode an oversized image to WebP so a full set of references fits in one
 * request. Never upscales, and returns the original file when it is already
 * small or when the browser cannot decode/encode it — better to attempt the
 * upload than to refuse the file outright.
 */
async function prepareImage(file: File): Promise<File> {
  if (file.size <= COMPRESS_THRESHOLD_BYTES) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_REFERENCE_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/webp', 0.9)
    );
    if (!blob || blob.size >= file.size) return file;

    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.webp', { type: 'image/webp' });
  } catch {
    return file;
  }
}

function formatMb(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(bytes < 1024 * 1024 ? 2 : 1)} MB`;
}

function timecode(frame: number): string {
  const total = frame / FPS;
  const m = Math.floor(total / 60);
  const s = (total % 60).toFixed(2).padStart(5, '0');
  return `${m}:${s}`;
}

function formatSize(bytes: number): string {
  return bytes ? `${(bytes / 1e6).toFixed(1)} MB` : '';
}

function randomizeSeed() {
  settings.seed = Math.floor(Math.random() * 2 ** 31);
}

async function attachFile(index: number, file: File | null) {
  if (!file || !file.type.startsWith('image/')) return;
  const slot = slots[index];
  slot.preparing = true;
  try {
    // Shrink before storing, so what is previewed is exactly what is uploaded.
    const prepared = await prepareImage(file);
    const url = URL.createObjectURL(prepared);
    objectUrls.push(url);
    slot.file = prepared;
    slot.preview = url;
    slot.isExample = false;
    slot.enabled = true;
    slot.originalBytes = file.size;
    slot.uploadBytes = prepared.size;
  } finally {
    slot.preparing = false;
  }
}

function onPick(index: number, event: Event) {
  const input = event.target as HTMLInputElement;
  void attachFile(index, input.files?.[0] ?? null);
  input.value = '';
}

function onDrop(index: number, event: DragEvent) {
  dragSlot.value = null;
  void attachFile(index, event.dataTransfer?.files?.[0] ?? null);
}

function resetSlot(index: number) {
  const slot = slots[index];
  slot.originalBytes = 0;
  slot.uploadBytes = 0;
  slot.file = null;
  slot.preview = props.exampleKeyframes[index] ?? '';
  slot.isExample = true;
}

/** Remove a reference from the run (or put it back). */
function toggleSlot(index: number) {
  const slot = slots[index];
  if (slot.enabled && enabledIndexes.value.length === 1) return;
  slot.enabled = !slot.enabled;
}

function isLastEnabled(index: number): boolean {
  return slots[index].enabled && enabledIndexes.value.length === 1;
}

function stopTimers() {
  if (pollTimer) clearTimeout(pollTimer);
  if (clockTimer) clearInterval(clockTimer);
  pollTimer = null;
  clockTimer = null;
}

async function poll() {
  if (!jobId.value) return;
  try {
    const res = await fetch(`/api/workflows/minimax-h3-multiref/job/${jobId.value}`);
    const body = await readResponse(res);
    if (!res.ok) throw new Error(body.error ?? `Status check failed (${res.status})`);

    queuePosition.value = body.queuePosition ?? null;
    progressValue.value = body.progress?.value ?? null;
    // 'queued' means accepted but not yet picked up; 'running' means a worker
    // has it. Anything else non-terminal is treated as running.
    if (body.status === 'queued') {
      state.value = 'queued';
    } else if (state.value === 'queued' || state.value === 'running') {
      state.value = 'running';
    }

    if (body.status === 'succeeded') {
      outputs.value = body.outputs ?? [];
      // A job can succeed with no outputs when something fails part-way, so say
      // that rather than showing an empty stage.
      if (!outputs.value.length) {
        state.value = 'failed';
        errorMessage.value =
          'The run finished but produced no video. Something failed part-way through — try again, and check the deployment logs for this job if it keeps happening.';
      } else {
        state.value = 'succeeded';
      }
      stopTimers();
      return;
    }

    if (body.status === 'failed' || body.status === 'canceled' || body.status === 'cancelled') {
      state.value = 'failed';
      errorMessage.value = body.error ?? `Job ${body.status}`;
      stopTimers();
      return;
    }

    pollTimer = setTimeout(poll, 3000);
  } catch (err) {
    state.value = 'failed';
    errorMessage.value = err instanceof Error ? err.message : String(err);
    stopTimers();
  }
}

async function run() {
  if (isBusy.value || blockingError.value) return;

  stopTimers();
  state.value = 'submitting';
  errorMessage.value = null;
  outputs.value = [];
  jobId.value = null;
  elapsed.value = 0;
  queuedFor.value = 0;
  queuePosition.value = null;
  progressValue.value = null;

  const form = new FormData();
  form.append('settings', JSON.stringify({ ...settings, enabledKeyframes: enabledIndexes.value }));
  let uploadBytes = 0;
  for (const slot of slots) {
    if (slot.file && slot.enabled) {
      uploadBytes += slot.file.size;
      form.append(`keyframe_${slot.index}`, slot.file, slot.file.name);
    }
  }

  // The submit route runs as a serverless function with a request-size cap, so
  // an oversized set is reported here instead of as an opaque 413.
  if (uploadBytes > MAX_UPLOAD_BYTES) {
    state.value = 'failed';
    errorMessage.value = `Those images add up to ${formatMb(uploadBytes)}, over the ${formatMb(MAX_UPLOAD_BYTES)} this page can send at once. Use smaller images, or remove a reference.`;
    return;
  }

  try {
    const res = await fetch('/api/workflows/minimax-h3-multiref/run', {
      method: 'POST',
      body: form,
    });
    const body = await readResponse(res);
    if (!res.ok) throw new Error(body.error ?? `Submit failed (${res.status})`);

    jobId.value = body.jobId;
    state.value = body.status === 'queued' ? 'queued' : 'running';
    clockTimer = setInterval(() => {
      elapsed.value += 1;
      if (state.value === 'queued') queuedFor.value += 1;
    }, 1000);
    pollTimer = setTimeout(poll, 2000);
  } catch (err) {
    state.value = 'failed';
    errorMessage.value = err instanceof Error ? err.message : String(err);
  }
}

onMounted(() => {
  void refreshQueue();
  queueTimer = setInterval(() => {
    void refreshQueue();
  }, 15000);
});

onBeforeUnmount(() => {
  window.clearTimeout(copyResetTimer);
  if (queueTimer) clearInterval(queueTimer);
  stopTimers();
  objectUrls.forEach((u) => URL.revokeObjectURL(u));
});
</script>

<template>
  <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(360px,26rem)] lg:items-start lg:gap-8">
    <!-- Controls -->
    <div class="flex min-w-0 flex-col gap-6">
      <!-- References -->
      <section class="flex flex-col gap-4">
        <div class="flex flex-wrap items-center justify-between gap-2 px-2">
          <span class="text-xs font-semibold uppercase tracking-wider text-content-secondary">
            Reference images
          </span>
          <span
            class="rounded-full border px-2.5 py-0.5 text-[11px]"
            :class="
              usingExampleFrames
                ? 'border-white/15 text-content-secondary'
                : 'border-emerald-400/30 text-emerald-300'
            "
          >
            {{ enabledIndexes.length }}/{{ slots.length }} in use
          </span>
        </div>

        <div class="flex flex-col gap-4 rounded-2xl border border-white/15 px-4 py-4">
          <p class="text-[11px] leading-relaxed text-content-secondary">
            Three images pinned to moments in the clip — start, middle and end. The model paints its
            way from one to the next, so the order tells the story. Drop in your own to replace one,
            or remove it to let the model invent that stretch freely. Large images are resized and
            re-encoded in your browser before upload — the model renders well below their full
            resolution either way.
          </p>

          <p
            v-if="preparingCount"
            class="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-2 text-[11px] text-content-secondary"
          >
            <span
              class="inline-block h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-white/25 border-t-white/80"
              aria-hidden="true"
            ></span>
            Resizing {{ preparingCount }} image{{ preparingCount === 1 ? '' : 's' }} for upload…
          </p>
          <p
            v-else-if="compression"
            class="rounded-lg border border-emerald-400/20 bg-emerald-400/[0.06] p-2 text-[11px] text-emerald-200/90"
          >
            {{ compression.count }} image{{ compression.count === 1 ? '' : 's' }} resized for upload
            — {{ formatMb(compression.before) }} → {{ formatMb(compression.after) }}. The originals
            on your machine are untouched.
          </p>

          <div class="flex flex-wrap gap-3">
            <div
              v-for="slot in slots"
              :key="slot.index"
              class="group relative w-[84px]"
              @dragover.prevent="dragSlot = slot.index"
              @dragleave="dragSlot = null"
              @drop.prevent="
                onDrop(
                  slots.findIndex((s) => s.index === slot.index),
                  $event
                )
              "
            >
              <label
                class="block cursor-pointer overflow-hidden rounded-lg border transition"
                :class="[
                  dragSlot === slot.index
                    ? 'border-emerald-400/60 ring-2 ring-emerald-400/30'
                    : slot.enabled
                      ? 'border-white/15 hover:border-white/30'
                      : 'border-dashed border-white/15 hover:border-white/30',
                ]"
                :title="
                  slot.enabled
                    ? `Reference ${slot.index} — ${timecode(slot.frame)} into the clip`
                    : `Reference ${slot.index} removed — click + to put it back`
                "
              >
                <div
                  class="relative aspect-[3/4]"
                  :class="slot.enabled ? 'bg-black/40' : 'bg-white/[0.02]'"
                >
                  <img
                    v-if="slot.enabled && slot.preview"
                    :src="slot.preview"
                    :alt="`Reference ${slot.index}`"
                    class="h-full w-full object-cover"
                    loading="lazy"
                  />
                  <div
                    v-else-if="slot.enabled"
                    class="flex h-full w-full items-center justify-center text-[9px] text-content-muted"
                  >
                    drop
                  </div>
                  <span
                    class="absolute left-1 top-1 rounded px-1 text-[9px] font-semibold"
                    :class="slot.enabled ? 'bg-black/75 text-white' : 'text-content-muted/60'"
                  >
                    {{ slot.index }}
                  </span>
                  <span
                    v-if="!slot.isExample && slot.enabled && !slot.preparing"
                    class="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-emerald-400"
                    :title="
                      slot.uploadBytes && slot.uploadBytes < slot.originalBytes
                        ? `Compressed for upload: ${formatMb(slot.originalBytes)} → ${formatMb(slot.uploadBytes)}`
                        : 'Your image'
                    "
                  ></span>
                  <div
                    v-if="slot.preparing"
                    class="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/70 text-[9px] text-white"
                  >
                    <span
                      class="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white"
                      aria-hidden="true"
                    ></span>
                    resizing
                  </div>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  class="sr-only"
                  @change="
                    onPick(
                      slots.findIndex((s) => s.index === slot.index),
                      $event
                    )
                  "
                />
              </label>
              <div
                class="mt-1 text-center font-mono text-[9px] leading-tight"
                :class="slot.enabled ? 'text-content-muted' : 'text-content-muted/40'"
              >
                {{ timecode(slot.frame) }}
              </div>

              <div class="absolute -top-1.5 right-0 hidden gap-1 group-hover:flex">
                <button
                  v-if="!slot.isExample && slot.enabled"
                  type="button"
                  class="h-4 w-4 rounded-full bg-white/90 text-[9px] font-bold leading-none text-black hover:bg-white"
                  title="Revert to the example image"
                  @click.prevent="resetSlot(slots.findIndex((s) => s.index === slot.index))"
                >
                  ↺
                </button>
                <button
                  type="button"
                  :disabled="isLastEnabled(slots.findIndex((s) => s.index === slot.index))"
                  class="h-4 w-4 rounded-full text-[10px] font-bold leading-none disabled:cursor-not-allowed disabled:opacity-40"
                  :class="
                    slot.enabled
                      ? 'bg-red-400/90 text-black hover:bg-red-400'
                      : 'bg-emerald-400/90 text-black hover:bg-emerald-400'
                  "
                  :title="
                    isLastEnabled(slots.findIndex((s) => s.index === slot.index))
                      ? 'Keep at least one reference'
                      : slot.enabled
                        ? 'Remove this reference'
                        : 'Put this reference back'
                  "
                  @click.prevent="toggleSlot(slots.findIndex((s) => s.index === slot.index))"
                >
                  {{ slot.enabled ? '×' : '+' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Prompt -->
      <section class="flex flex-col gap-4">
        <span class="px-2 text-xs font-semibold uppercase tracking-wider text-content-secondary">
          Prompt
        </span>

        <div class="flex flex-col gap-3 rounded-2xl border border-white/15 px-4 py-4">
          <p class="text-[11px] leading-relaxed text-content-secondary">
            Describe what happens, how the camera moves, what carries over between scenes, and what
            it sounds like — all in one block of prose. The references anchor the visuals; this sets
            everything between them.
          </p>
          <div v-if="agentPromptUrl" class="flex flex-wrap items-center gap-2">
            <button
              type="button"
              class="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-[11px] font-medium text-content-secondary transition hover:border-white/30 hover:text-content"
              @click="copyAgentPrompt"
            >
              <Check v-if="promptCopied" class="size-3" />
              <Copy v-else class="size-3" />
              {{ promptCopied ? 'Copied' : 'Copy prompt guide for agents' }}
            </button>
            <span class="text-[10px] text-content-muted">
              Paste it into an assistant, describe your shot, and it writes the prompt below.
            </span>
          </div>
          <p v-if="promptCopyFailed" class="text-[10px] text-amber-200">
            Could not copy —
            <a :href="agentPromptUrl ?? '#'" target="_blank" class="underline underline-offset-2">
              open the guide </a
            >and copy it manually.
          </p>

          <div class="flex items-baseline justify-between gap-3">
            <label class="text-xs font-medium text-content" for="mmh3-prompt"
              >Shot description</label
            >
            <span class="font-mono text-[10px] text-content-muted">
              {{ settings.prompt.length.toLocaleString() }}
            </span>
          </div>
          <textarea
            id="mmh3-prompt"
            v-model="settings.prompt"
            rows="10"
            class="w-full resize-y rounded-xl border border-white/15 bg-black/30 p-3 font-mono text-[12px] leading-relaxed text-content placeholder:text-content-muted focus:border-white/30 focus:outline-none"
            placeholder="Describe the shot…"
          ></textarea>
        </div>
      </section>

      <!-- Format -->
      <section class="flex flex-col gap-4">
        <span class="px-2 text-xs font-semibold uppercase tracking-wider text-content-secondary">
          Format
        </span>

        <div class="flex flex-col gap-4 rounded-2xl border border-white/15 px-4 py-4">
          <p class="text-[11px] leading-relaxed text-content-secondary">
            How long the finished video runs and what shape it comes out. Longer clips give the
            references more room to breathe between beats.
          </p>

          <div class="grid gap-4 sm:grid-cols-2">
            <div class="sm:col-span-2">
              <div class="flex items-baseline justify-between">
                <label class="text-xs font-medium text-content">Clip length</label>
                <span class="font-mono text-[11px] text-content-muted"
                  >{{ settings.seconds }}s</span
                >
              </div>
              <input
                v-model.number="settings.seconds"
                type="range"
                min="2"
                max="30"
                step="0.5"
                class="mt-2 h-1 w-full cursor-pointer appearance-none rounded-full bg-white/15 accent-white"
              />
              <p
                v-if="blockingError"
                class="mt-2 rounded-lg border border-amber-400/30 bg-amber-400/10 p-2 text-[11px] leading-relaxed text-amber-200"
              >
                {{ blockingError }}
              </p>
            </div>

            <div>
              <label class="text-xs font-medium text-content">Aspect ratio</label>
              <select
                v-model="settings.aspectRatio"
                class="mt-1.5 w-full rounded-lg border border-white/15 bg-black/30 px-2 py-2 text-xs text-content focus:border-white/30 focus:outline-none"
              >
                <option v-for="r in ASPECT_RATIOS" :key="r" :value="r">{{ r }}</option>
              </select>
            </div>

            <div>
              <label class="text-xs font-medium text-content">Resolution</label>
              <select
                v-model.number="settings.megapixels"
                class="mt-1.5 w-full rounded-lg border border-white/15 bg-black/30 px-2 py-2 text-xs text-content focus:border-white/30 focus:outline-none"
              >
                <option
                  v-for="option in resolutionOptions"
                  :key="option.label"
                  :value="option.megapixels"
                >
                  {{ option.label }} — {{ option.detail }}
                </option>
              </select>
              <p class="mt-1 text-[10px] text-content-muted">
                <template v-if="selectedResolution">
                  {{ selectedResolution.detail }} at this aspect ratio. Higher costs more time.
                </template>
              </p>
            </div>

            <div class="sm:col-span-2">
              <label class="text-xs font-medium text-content">Fitting references</label>
              <select
                v-model="settings.crop"
                class="mt-1.5 w-full rounded-lg border border-white/15 bg-black/30 px-2 py-2 text-xs text-content focus:border-white/30 focus:outline-none"
              >
                <option value="center">Crop to fill the frame</option>
                <option value="disabled">Use images as they are</option>
              </select>
              <p class="mt-1 text-[10px] text-content-muted">
                How images that do not match the aspect ratio are handled.
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- Advanced -->
      <section class="flex flex-col gap-4">
        <button
          type="button"
          class="flex items-center gap-2 px-2 text-xs font-semibold uppercase tracking-wider text-content-secondary hover:text-content"
          @click="showAdvanced = !showAdvanced"
        >
          Advanced
          <span class="text-[10px] font-normal normal-case tracking-normal text-content-muted">
            {{ showAdvanced ? 'hide' : 'show' }}
          </span>
        </button>

        <div
          v-if="showAdvanced"
          class="flex flex-col gap-4 rounded-2xl border border-white/15 px-4 py-4"
        >
          <p class="text-[11px] leading-relaxed text-content-secondary">
            Sampling controls. The defaults are tuned for this model — change them when you want
            more detail, a different feel, or a repeatable result.
          </p>

          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <div class="flex items-baseline justify-between">
                <label class="text-xs font-medium text-content">Quality steps</label>
                <span class="font-mono text-[11px] text-content-muted">{{ settings.steps }}</span>
              </div>
              <input
                v-model.number="settings.steps"
                type="range"
                min="4"
                max="30"
                step="1"
                class="mt-2 h-1 w-full cursor-pointer appearance-none rounded-full bg-white/15 accent-white"
              />
              <p class="mt-1 text-[10px] text-content-muted">
                More steps take longer; this model is tuned for 8.
              </p>
            </div>

            <div>
              <div class="flex items-baseline justify-between">
                <label class="text-xs font-medium text-content">Speed-up strength</label>
                <span class="font-mono text-[11px] text-content-muted">
                  {{ settings.loraStrength }}
                </span>
              </div>
              <input
                v-model.number="settings.loraStrength"
                type="range"
                min="0"
                max="1.5"
                step="0.05"
                class="mt-2 h-1 w-full cursor-pointer appearance-none rounded-full bg-white/15 accent-white"
              />
              <p class="mt-1 text-[10px] text-content-muted">Lower trades speed for fidelity.</p>
            </div>

            <div class="sm:col-span-2">
              <label class="text-xs font-medium text-content">Seed</label>
              <div class="mt-1.5 flex gap-2">
                <input
                  v-model.number="settings.seed"
                  type="number"
                  class="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/30 px-2 py-2 font-mono text-[11px] text-content focus:border-white/30 focus:outline-none"
                />
                <button
                  type="button"
                  class="rounded-lg border border-white/15 px-2.5 text-xs text-content-secondary hover:border-white/30 hover:text-content"
                  title="Randomize"
                  @click="randomizeSeed"
                >
                  ⟳
                </button>
              </div>
              <p class="mt-1 text-[10px] text-content-muted">
                Same seed and settings give the same video back.
              </p>
            </div>

            <div>
              <label class="text-xs font-medium text-content">Sampler</label>
              <select
                v-model="settings.sampler"
                class="mt-1.5 w-full rounded-lg border border-white/15 bg-black/30 px-2 py-2 text-xs text-content focus:border-white/30 focus:outline-none"
              >
                <option v-for="s in SAMPLERS" :key="s" :value="s">{{ s }}</option>
              </select>
            </div>
            <div>
              <label class="text-xs font-medium text-content">Scheduler</label>
              <select
                v-model="settings.scheduler"
                class="mt-1.5 w-full rounded-lg border border-white/15 bg-black/30 px-2 py-2 text-xs text-content focus:border-white/30 focus:outline-none"
              >
                <option v-for="s in SCHEDULERS" :key="s" :value="s">{{ s }}</option>
              </select>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- Result — sticky so it stays in view while the controls scroll -->
    <aside
      class="flex flex-col gap-4 lg:sticky lg:top-48 lg:max-h-[calc(100vh-13rem)] lg:overflow-y-auto lg:pr-1"
    >
      <span class="px-2 text-xs font-semibold uppercase tracking-wider text-content-secondary">
        Result
      </span>

      <div class="flex flex-col gap-3 rounded-2xl border border-white/15 px-4 py-4">
        <p class="text-[11px] leading-relaxed text-content-secondary">
          {{
            outputs.length
              ? 'Generated from your settings.'
              : state === 'failed'
                ? 'This run did not produce a video.'
                : 'An example result. Run the workflow to replace it with your own.'
          }}
        </p>

        <div class="media-frame overflow-hidden rounded-lg border border-white/10 bg-black">
          <video
            v-if="video"
            :key="video.url"
            :src="video.url"
            controls
            playsinline
            class="aspect-video w-full bg-black"
          ></video>
          <div
            v-else
            class="flex aspect-video w-full items-center justify-center px-6 text-center text-[11px] text-content-muted"
          >
            {{
              state === 'failed'
                ? 'Nothing was generated — see the error below.'
                : 'No example available yet — run the workflow to fill this in.'
            }}
          </div>
        </div>

        <div
          v-if="video"
          class="flex flex-wrap items-center justify-between gap-2 text-[11px] text-content-muted"
        >
          <span class="truncate">{{ video.name }}</span>
          <span class="flex shrink-0 items-center gap-3">
            <span v-if="video.sizeBytes">{{ formatSize(video.sizeBytes) }}</span>
            <a
              :href="video.url"
              download
              class="text-content-secondary underline underline-offset-4 hover:text-content"
              >Download</a
            >
          </span>
        </div>

        <button
          type="button"
          :disabled="isBusy || !!blockingError"
          class="mt-1 w-full rounded-full bg-white px-4 py-3 text-xs font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:bg-white/30 disabled:text-black/50"
          @click="run"
        >
          <span class="flex items-center justify-center gap-2">
            <span
              v-if="isBusy"
              class="inline-block h-3 w-3 shrink-0 rounded-full border-2 border-black/25 border-t-black/80"
              :class="
                state === 'queued'
                  ? 'animate-[mmh3-pulse_1.4s_ease-in-out_infinite]'
                  : 'animate-spin'
              "
              aria-hidden="true"
            ></span>
            {{ runLabel }}
          </span>
        </button>

        <!-- Queued shows a pulsing track (nothing is happening yet); running
             shows real progress when the deployment reports it, and a moving
             indeterminate bar when it does not. -->
        <div
          v-if="isBusy && state !== 'submitting'"
          class="h-1 overflow-hidden rounded-full bg-white/10"
          role="progressbar"
          :aria-valuenow="progressValue !== null ? Math.round(progressValue * 100) : undefined"
        >
          <div
            v-if="state === 'queued'"
            class="h-full w-full animate-[mmh3-pulse_1.4s_ease-in-out_infinite] bg-white/25"
          ></div>
          <div
            v-else-if="progressValue !== null"
            class="h-full bg-white/80 transition-[width] duration-500"
            :style="{ width: `${Math.max(2, Math.round(progressValue * 100))}%` }"
          ></div>
          <div
            v-else
            class="h-full w-1/3 animate-[mmh3-slide_1.6s_ease-in-out_infinite] bg-white/70"
          ></div>
        </div>

        <p v-if="runCaption" class="text-[11px] leading-relaxed text-content-muted">
          {{ runCaption }}
        </p>

        <div class="flex flex-col gap-1 text-[11px] text-content-muted">
          <div v-if="queueLabel" class="flex items-center justify-between">
            <span class="flex items-center gap-1.5">
              <span
                class="h-1.5 w-1.5 rounded-full"
                :class="
                  queueStale
                    ? 'bg-content-muted/50'
                    : queue.jobsInQueue
                      ? 'bg-amber-400'
                      : 'bg-emerald-400'
                "
              ></span>
              Ahead of you
            </span>
            <span class="font-mono">{{ queueLabel }}</span>
          </div>
          <div v-if="queueLabel && busyWorkers" class="flex justify-between">
            <span>Rendering now</span><span class="font-mono">{{ busyWorkers }}</span>
          </div>
          <div class="flex justify-between">
            <span>Length</span
            ><span class="font-mono">{{ settings.seconds }}s · {{ frames }} frames</span>
          </div>
          <div class="flex justify-between">
            <span>References in use</span><span class="font-mono">{{ enabledIndexes.length }}</span>
          </div>
        </div>

        <p
          v-if="errorMessage"
          class="max-h-40 overflow-auto rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-[11px] leading-relaxed text-red-200"
        >
          {{ errorMessage }}
        </p>
        <p
          v-else-if="state === 'succeeded'"
          class="rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-3 text-[11px] text-emerald-200"
        >
          Done — your video is ready.
        </p>
      </div>
    </aside>
  </div>
</template>

<style>
@keyframes mmh3-pulse {
  0%,
  100% {
    opacity: 0.35;
  }
  50% {
    opacity: 1;
  }
}

@keyframes mmh3-slide {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(300%);
  }
}
</style>
