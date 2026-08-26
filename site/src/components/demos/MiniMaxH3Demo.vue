<script setup lang="ts">
import { Check, Copy, RefreshCw } from 'lucide-vue-next';
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import ComfySelect from '@/components/shared/ComfySelect.vue';
import VideoPlayer from '@/components/shared/VideoPlayer.vue';
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
  keyframePositions,
  type DemoSettings,
  type JobActionResponse,
  type JobOutput,
  type JobStatusResponse,
  type QueueState,
} from '@/lib/demos/mmh3/config';

/** Every route may answer `{ error }` instead of its success shape. */
type Failable = { error?: string | null };

const props = defineProps<{
  defaultPrompt: string;
  exampleKeyframes: string[];
  exampleVideo: string | null;
  /** System prompt for writing shot descriptions with an agent, if bundled. */
  agentPromptUrl: string | null;
}>();

type RunState = 'idle' | 'submitting' | 'queued' | 'running' | 'canceling' | 'succeeded' | 'failed';

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
const statusMessage = ref<string | null>(null);
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
const dragSource = ref<number | null>(null);

const queue = ref<QueueState>({ available: false });
const queueAgeMs = ref(0);

let pollTimer: ReturnType<typeof setTimeout> | null = null;
let clockTimer: ReturnType<typeof setInterval> | null = null;
let queueTimer: ReturnType<typeof setInterval> | null = null;
const objectUrls: string[] = [];

const frames = computed(() => clipLengthFrames(settings.seconds));
const keyframeFrames = computed(() => keyframePositions(settings.seconds));

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

const aspectRatioOptions = ASPECT_RATIOS.map((value) => ({ label: value, value }));
const resolutionSelectOptions = computed(() =>
  resolutionOptions.value.map((option) => ({
    label: `${option.label} — ${option.detail}`,
    value: option.megapixels,
  }))
);
const cropOptions = [
  { label: 'Crop to fill the frame', value: CROP_MODES[0] },
  { label: 'Use images as they are', value: CROP_MODES[1] },
];
const samplerOptions = SAMPLERS.map((value) => ({ label: value, value }));
const schedulerOptions = SCHEDULERS.map((value) => ({ label: value, value }));
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
const hasAllReferences = computed(() =>
  slots.every((slot) => slot.enabled && Boolean(slot.preview) && !slot.preparing)
);
const blockingError = computed(() =>
  hasAllReferences.value ? null : 'Add all three reference images before running the workflow.'
);
const isBusy = computed(() =>
  ['submitting', 'queued', 'running', 'canceling'].includes(state.value)
);
const canCancel = computed(
  () => Boolean(jobId.value) && (state.value === 'queued' || state.value === 'running')
);

/**
 * The generated video once there is one, otherwise the bundled example.
 *
 * A failed run shows nothing: leaving the example on screen next to an error
 * reads as though it were the result of that run.
 */
const video = computed(() => {
  if (outputs.value.length) {
    const out =
      outputs.value.find((output) => output.contentType.startsWith('video/')) ?? outputs.value[0];
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
    case 'canceling':
      return 'Stopping this job…';
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
async function readResponse<T extends object>(res: Response): Promise<Partial<T> & Failable> {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { error: httpErrorMessage(res.status, text) };
  }
}

function httpErrorMessage(status: number, body: string): string {
  if (status === 413) {
    return 'Those reference images are too large to upload in one request. Use smaller images.';
  }
  if (status === 504) return 'The request timed out before the server answered. Try again.';
  const detail = body.trim().split('\n')[0].slice(0, 120);
  return detail ? `Request failed (${status}): ${detail}` : `Request failed (${status}).`;
}

async function refreshQueue() {
  try {
    const res = await fetch('/api/workflows/minimax-h3-multiref/queue');
    const body = await readResponse<QueueState>(res);
    queue.value = { available: false, ...body };
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
  if (dragSource.value !== null) {
    swapSlotContent(dragSource.value, index);
    dragSource.value = null;
    return;
  }
  void attachFile(index, event.dataTransfer?.files?.[0] ?? null);
}

function onDragStart(index: number, event: DragEvent) {
  dragSource.value = index;
  if (!event.dataTransfer) return;
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', String(index));
}

function swapSlotContent(sourceIndex: number, targetIndex: number) {
  if (sourceIndex === targetIndex) return;
  const source = slots[sourceIndex];
  const target = slots[targetIndex];
  const sourceContent = {
    file: source.file,
    preview: source.preview,
    isExample: source.isExample,
    enabled: source.enabled,
    originalBytes: source.originalBytes,
    uploadBytes: source.uploadBytes,
  };

  source.file = target.file;
  source.preview = target.preview;
  source.isExample = target.isExample;
  source.enabled = target.enabled;
  source.originalBytes = target.originalBytes;
  source.uploadBytes = target.uploadBytes;
  target.file = sourceContent.file;
  target.preview = sourceContent.preview;
  target.isExample = sourceContent.isExample;
  target.enabled = sourceContent.enabled;
  target.originalBytes = sourceContent.originalBytes;
  target.uploadBytes = sourceContent.uploadBytes;
}

function resetSlot(index: number) {
  const slot = slots[index];
  slot.originalBytes = 0;
  slot.uploadBytes = 0;
  slot.file = null;
  slot.preview = props.exampleKeyframes[index] ?? '';
  slot.isExample = true;
}

function toggleSlot(index: number) {
  const slot = slots[index];
  slot.enabled = !slot.enabled;
}

function stopTimers() {
  if (pollTimer) clearTimeout(pollTimer);
  if (clockTimer) clearInterval(clockTimer);
  pollTimer = null;
  clockTimer = null;
}

function startJobTimers(pollDelay = 2000) {
  clockTimer = setInterval(() => {
    elapsed.value += 1;
    if (state.value === 'queued') queuedFor.value += 1;
  }, 1000);
  pollTimer = setTimeout(poll, pollDelay);
}

async function poll() {
  if (!jobId.value) return;
  try {
    const res = await fetch(`/api/workflows/minimax-h3-multiref/job/${jobId.value}`);
    const body = await readResponse<JobStatusResponse>(res);
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

    if (body.status === 'canceled' || body.status === 'cancelled') {
      state.value = 'idle';
      statusMessage.value = 'Generation canceled.';
      jobId.value = null;
      queuePosition.value = null;
      progressValue.value = null;
      stopTimers();
      return;
    }

    if (body.status === 'failed') {
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

async function cancelJob() {
  const id = jobId.value;
  if (!id || !canCancel.value) return;

  const previousState = state.value;
  stopTimers();
  state.value = 'canceling';
  errorMessage.value = null;
  statusMessage.value = null;

  try {
    const res = await fetch(`/api/workflows/minimax-h3-multiref/job/${id}`, {
      method: 'DELETE',
    });
    const body = await readResponse<JobActionResponse>(res);
    if (!res.ok) throw new Error(body.error ?? `Cancel failed (${res.status})`);

    if (body.status === 'canceled' || body.status === 'cancelled') {
      state.value = 'idle';
      jobId.value = null;
      queuePosition.value = null;
      progressValue.value = null;
      statusMessage.value = 'Generation canceled.';
      return;
    }

    state.value = previousState;
    statusMessage.value = `The job is already ${body.status}.`;
    startJobTimers(0);
  } catch (err) {
    state.value = previousState;
    errorMessage.value = err instanceof Error ? err.message : String(err);
    startJobTimers(3000);
  }
}

async function run() {
  if (isBusy.value || blockingError.value) return;

  stopTimers();
  state.value = 'submitting';
  errorMessage.value = null;
  statusMessage.value = null;
  outputs.value = [];
  jobId.value = null;
  elapsed.value = 0;
  queuedFor.value = 0;
  queuePosition.value = null;
  progressValue.value = null;

  const form = new FormData();
  form.append('settings', JSON.stringify({ ...settings, enabledKeyframes: enabledIndexes.value }));

  try {
    // Every enabled slot travels as real bytes: the bundled examples exist
    // only as static URLs (the serverless route cannot read `public/`), so a
    // slot still showing its example is fetched here and sent like an upload.
    let uploadBytes = 0;
    for (const slot of slots) {
      if (!slot.enabled) continue;
      const file = slot.file ?? (await fetchExampleFile(slot.preview, slot.index));
      uploadBytes += file.size;
      form.append(`keyframe_${slot.index}`, file, file.name);
    }

    // The submit route runs as a serverless function with a request-size cap,
    // so an oversized set is reported here instead of as an opaque 413.
    if (uploadBytes > MAX_UPLOAD_BYTES) {
      state.value = 'failed';
      errorMessage.value = `Those images add up to ${formatMb(uploadBytes)}, over the ${formatMb(MAX_UPLOAD_BYTES)} this page can send at once. Use smaller images.`;
      return;
    }

    const res = await fetch('/api/workflows/minimax-h3-multiref/run', {
      method: 'POST',
      body: form,
    });
    const body = await readResponse<JobActionResponse>(res);
    if (!res.ok || !body.jobId) throw new Error(body.error ?? `Submit failed (${res.status})`);

    jobId.value = body.jobId;
    state.value = body.status === 'queued' ? 'queued' : 'running';
    startJobTimers();
  } catch (err) {
    state.value = 'failed';
    errorMessage.value = err instanceof Error ? err.message : String(err);
  }
}

/** Pull a bundled example reference off the CDN so it can be uploaded. */
async function fetchExampleFile(url: string, index: number): Promise<File> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Could not load the example image for reference ${index} (${res.status}).`);
  }
  const blob = await res.blob();
  return new File([blob], `kf_${index}.webp`, { type: blob.type || 'image/webp' });
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
  <div class="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(380px,30rem)] lg:items-start">
    <!-- Controls -->
    <div class="flex min-w-0 flex-col gap-5">
      <!-- References -->
      <section class="flex flex-col gap-5 rounded-4xl bg-hub-surface p-5 sm:p-6">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <span
            class="flex items-center gap-3 text-sm font-semibold uppercase tracking-wider text-content"
          >
            <span class="grid size-7 place-items-center rounded-full bg-brand text-xs text-page"
              >1</span
            >
            Reference images
          </span>
          <span
            class="rounded-full px-3 py-1.5 text-xs"
            :class="
              usingExampleFrames ? 'bg-white/4 text-content-secondary' : 'bg-brand/10 text-brand'
            "
          >
            {{ enabledIndexes.length }}/{{ slots.length }} in use
          </span>
        </div>

        <div class="flex flex-col gap-5">
          <p class="max-w-3xl text-sm leading-relaxed text-content-secondary">
            Three fixed moments in the clip — start, middle and end.
          </p>

          <p
            v-if="preparingCount"
            class="flex items-center gap-2 rounded-2xl border border-divider-subtle bg-white/4 p-3 text-xs text-content-secondary"
          >
            <span
              class="inline-block h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-white/25 border-t-white/80"
              aria-hidden="true"
            ></span>
            Resizing {{ preparingCount }} image{{ preparingCount === 1 ? '' : 's' }} for upload…
          </p>
          <p
            v-else-if="compression"
            class="rounded-2xl border border-brand/20 bg-brand/6 p-3 text-xs text-content-secondary"
          >
            {{ compression.count }} image{{ compression.count === 1 ? '' : 's' }} resized for upload
            — {{ formatMb(compression.before) }} → {{ formatMb(compression.after) }}. The originals
            on your machine are untouched.
          </p>

          <div class="grid grid-cols-3 gap-3 sm:gap-4">
            <div
              v-for="slot in slots"
              :key="slot.index"
              class="group relative min-w-0"
              @dragover.prevent="dragSlot = slot.index"
              @dragleave="dragSlot = null"
              @dragend="dragSource = null"
              @drop.prevent="
                onDrop(
                  slots.findIndex((s) => s.index === slot.index),
                  $event
                )
              "
            >
              <label
                :draggable="slot.enabled"
                class="block overflow-hidden rounded-2xl border transition"
                :class="[
                  slot.enabled ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer',
                  dragSlot === slot.index
                    ? 'border-brand/60 ring-2 ring-brand/30'
                    : slot.enabled
                      ? 'border-white/15 hover:border-white/30'
                      : 'border-dashed border-white/15 hover:border-white/30',
                ]"
                :title="
                  slot.enabled
                    ? `Reference ${slot.index} — ${timecode(keyframeFrames[slot.index - 1])} into the clip`
                    : `Reference ${slot.index} removed — click + to put it back`
                "
                @dragstart="
                  onDragStart(
                    slots.findIndex((s) => s.index === slot.index),
                    $event
                  )
                "
              >
                <div
                  class="relative aspect-[4/3] sm:aspect-[3/2]"
                  :class="slot.enabled ? 'bg-black/40' : 'bg-white/[0.02]'"
                >
                  <img
                    v-if="slot.enabled && slot.preview"
                    :src="slot.preview"
                    :alt="`Reference ${slot.index}`"
                    class="h-full w-full object-cover"
                    draggable="false"
                    loading="lazy"
                  />
                  <div
                    v-else-if="slot.enabled"
                    class="flex h-full w-full items-center justify-center text-xs text-content-muted"
                  >
                    drop
                  </div>
                  <span
                    class="absolute left-2 top-2 grid size-6 place-items-center rounded-full text-xs font-semibold"
                    :class="slot.enabled ? 'bg-black/75 text-white' : 'text-content-muted/60'"
                  >
                    {{ slot.index }}
                  </span>
                  <span
                    v-if="!slot.isExample && slot.enabled && !slot.preparing"
                    class="absolute right-2 top-2 size-2 rounded-full bg-brand"
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
                class="mt-2 text-center font-mono text-xs leading-tight"
                :class="slot.enabled ? 'text-content-muted' : 'text-content-muted/40'"
              >
                {{ timecode(keyframeFrames[slot.index - 1]) }}
              </div>

              <div
                class="absolute right-2 top-2 flex gap-2 transition-opacity"
                :class="
                  slot.enabled
                    ? 'pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100'
                    : 'opacity-100'
                "
              >
                <button
                  v-if="!slot.isExample && slot.enabled"
                  type="button"
                  class="grid size-12 place-items-center rounded-2xl bg-brand text-page transition-opacity hover:opacity-90"
                  aria-label="Revert to the example image"
                  title="Revert to the example image"
                  @click.prevent="resetSlot(slots.findIndex((s) => s.index === slot.index))"
                >
                  <RefreshCw class="size-5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  class="grid size-8 place-items-center rounded-xl bg-brand text-page transition-opacity hover:opacity-90"
                  :aria-label="slot.enabled ? 'Remove this reference' : 'Put this reference back'"
                  :title="slot.enabled ? 'Remove this reference' : 'Put this reference back'"
                  @click.prevent="toggleSlot(slots.findIndex((s) => s.index === slot.index))"
                >
                  <span
                    class="size-4 bg-page [mask-image:url('/icons/plus.svg')] [mask-position:center] [mask-repeat:no-repeat] [mask-size:contain]"
                    :class="slot.enabled && 'rotate-45'"
                    aria-hidden="true"
                  ></span>
                </button>
              </div>
            </div>
          </div>

          <p class="text-xs leading-relaxed text-content-muted">
            Click a slot to upload a replacement, drag a file from your computer onto it, or drag
            one reference onto another to swap them. All three slots are required to run.
          </p>
        </div>
      </section>

      <!-- Prompt -->
      <section class="flex flex-col gap-5 rounded-4xl bg-hub-surface p-5 sm:p-6">
        <span
          class="flex items-center gap-3 text-sm font-semibold uppercase tracking-wider text-content"
        >
          <span class="grid size-7 place-items-center rounded-full bg-brand text-xs text-page"
            >2</span
          >
          Shot description
        </span>

        <div class="flex flex-col gap-4">
          <p class="text-sm leading-relaxed text-content-secondary">
            Describe what happens, how the camera moves, what carries over between scenes, and what
            it sounds like — all in one block of prose. The references anchor the visuals; this sets
            everything between them.
          </p>
          <div v-if="agentPromptUrl" class="flex flex-wrap items-center gap-2">
            <button
              type="button"
              class="inline-flex min-h-8 items-center gap-2 rounded-full border border-divider-subtle px-3 py-2 text-xs font-semibold text-content-secondary transition-colors hover:border-divider hover:bg-hub-surface-hover hover:text-content"
              @click="copyAgentPrompt"
            >
              <Check v-if="promptCopied" class="size-3" />
              <Copy v-else class="size-3" />
              {{ promptCopied ? 'Copied' : 'Copy prompt guide for agents' }}
            </button>
            <span class="text-xs text-content-muted">
              Paste it into an assistant, describe your shot, upload your images, and it writes the
              prompt below.
            </span>
          </div>
          <p v-if="promptCopyFailed" class="text-[10px] text-amber-200">
            Could not copy —
            <a :href="agentPromptUrl ?? '#'" target="_blank" class="underline underline-offset-2">
              open the guide </a
            >and copy it manually.
          </p>

          <div class="flex items-baseline justify-between gap-3">
            <label class="text-xs font-semibold text-content" for="mmh3-prompt">Your prompt</label>
            <span class="font-mono text-xs text-content-muted">
              {{ settings.prompt.length.toLocaleString() }}
            </span>
          </div>
          <textarea
            id="mmh3-prompt"
            v-model="settings.prompt"
            rows="7"
            class="w-full resize-y rounded-2xl border border-divider-subtle bg-hub-surface p-4 font-mono text-xs leading-relaxed text-content outline-none placeholder:text-content-muted focus:border-divider"
            placeholder="Describe the shot…"
          ></textarea>
        </div>
      </section>

      <!-- Format -->
      <section class="flex flex-col gap-5 rounded-4xl bg-hub-surface p-5 sm:p-6">
        <span
          class="flex items-center gap-3 text-sm font-semibold uppercase tracking-wider text-content"
        >
          <span class="grid size-7 place-items-center rounded-full bg-brand text-xs text-page"
            >3</span
          >
          Output format
        </span>

        <div class="flex flex-col gap-5">
          <p class="text-sm leading-relaxed text-content-secondary">
            How long the finished video runs and what shape it comes out. Longer clips give the
            references more room to breathe between beats.
          </p>

          <div class="grid gap-4 sm:grid-cols-2">
            <div class="sm:col-span-2">
              <div class="flex items-baseline justify-between">
                <label class="text-xs font-semibold text-content">Clip length</label>
                <span class="font-mono text-xs text-content-muted">{{ settings.seconds }}s</span>
              </div>
              <input
                v-model.number="settings.seconds"
                type="range"
                min="5"
                max="15"
                step="1"
                class="mt-3 h-1 w-full cursor-pointer appearance-none rounded-full bg-divider accent-brand"
              />
            </div>

            <div>
              <label class="text-xs font-semibold text-content">Aspect ratio</label>
              <ComfySelect
                v-model="settings.aspectRatio"
                class="mt-2"
                aria-label="Aspect ratio"
                :options="aspectRatioOptions"
              />
            </div>

            <div>
              <label class="text-xs font-semibold text-content">Resolution</label>
              <ComfySelect
                v-model.number="settings.megapixels"
                class="mt-2"
                aria-label="Resolution"
                :options="resolutionSelectOptions"
              />
              <p class="mt-2 text-xs text-content-muted">
                <template v-if="selectedResolution">
                  {{ selectedResolution.detail }} at this aspect ratio. Higher costs more time.
                </template>
              </p>
            </div>

            <div class="sm:col-span-2">
              <label class="text-xs font-semibold text-content">Fitting references</label>
              <ComfySelect
                v-model="settings.crop"
                class="mt-2"
                aria-label="Fitting references"
                :options="cropOptions"
              />
              <p class="mt-2 text-xs text-content-muted">
                How images that do not match the aspect ratio are handled.
              </p>
            </div>

            <div class="sm:col-span-2">
              <label class="text-xs font-semibold text-content">Seed</label>
              <div class="mt-2 flex gap-2">
                <input
                  v-model.number="settings.seed"
                  type="number"
                  class="h-12 min-w-0 flex-1 rounded-2xl border border-divider-subtle bg-hub-surface p-4 font-mono text-xs font-semibold text-content transition-colors outline-none focus:border-divider"
                />
                <button
                  type="button"
                  class="grid size-12 shrink-0 place-items-center rounded-2xl border border-divider-subtle bg-hub-surface text-content-secondary transition-colors hover:border-divider hover:text-brand focus-visible:border-divider focus-visible:outline-none"
                  aria-label="Randomize seed"
                  title="Randomize seed"
                  @click="randomizeSeed"
                >
                  <RefreshCw class="size-4" aria-hidden="true" />
                </button>
              </div>
              <p class="mt-2 text-xs leading-relaxed text-content-muted">
                Same seed and settings give the same video back.
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- Advanced -->
      <section class="flex flex-col border-y border-divider">
        <button
          type="button"
          class="group flex min-h-16 w-full items-center justify-between gap-4 py-5 text-left text-sm font-semibold uppercase tracking-wider text-content transition-colors hover:text-brand"
          :aria-expanded="showAdvanced"
          @click="showAdvanced = !showAdvanced"
        >
          Advanced
          <svg
            :class="showAdvanced ? 'text-brand' : 'text-content-secondary'"
            class="size-5 shrink-0 transition-colors duration-200 group-hover:text-brand"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path d="M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            <path
              :class="{ 'rotate-90 opacity-0': showAdvanced }"
              class="origin-center transition-all duration-200"
              d="M12 5v14"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
          </svg>
        </button>

        <div v-if="showAdvanced" class="flex flex-col gap-6 border-t border-divider py-6">
          <p class="text-sm leading-relaxed text-content-secondary">
            Sampling controls. The defaults are tuned for this model — change them when you want
            more detail, a different feel, or a repeatable result.
          </p>

          <div class="grid gap-4 sm:grid-cols-2">
            <div class="sm:col-span-2">
              <div class="flex items-baseline justify-between">
                <label class="text-xs font-semibold text-content">Quality steps</label>
                <span class="font-mono text-xs text-content-muted">{{ settings.steps }}</span>
              </div>
              <input
                v-model.number="settings.steps"
                type="range"
                min="4"
                max="12"
                step="1"
                class="mt-3 h-1 w-full cursor-pointer appearance-none rounded-full bg-divider accent-brand"
              />
              <p class="mt-2 text-xs leading-relaxed text-content-muted">
                More steps take longer; this model is tuned for 8.
              </p>
            </div>

            <div>
              <label class="text-xs font-semibold text-content">Sampler</label>
              <ComfySelect
                v-model="settings.sampler"
                class="mt-2"
                aria-label="Sampler"
                :options="samplerOptions"
              />
            </div>
            <div>
              <label class="text-xs font-semibold text-content">Scheduler</label>
              <ComfySelect
                v-model="settings.scheduler"
                class="mt-2"
                aria-label="Scheduler"
                :options="schedulerOptions"
              />
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- Result — sticky so it stays in view while the controls scroll -->
    <aside
      class="flex flex-col lg:sticky lg:top-48 lg:max-h-[calc(100vh-13rem)] lg:overflow-y-auto lg:pr-1"
    >
      <div class="flex flex-col gap-4 rounded-4xl bg-hub-surface p-5 sm:p-6">
        <span class="text-sm font-semibold uppercase tracking-wider text-brand">Result</span>

        <div class="media-frame">
          <VideoPlayer v-if="video" :key="video.url" :src="video.url" :aria-label="video.name" />
          <div
            v-else
            class="flex aspect-video w-full items-center justify-center px-6 text-center text-sm text-content-muted"
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
          class="flex flex-wrap items-center justify-between gap-2 text-xs text-content-muted"
        >
          <span class="min-w-0">
            {{
              outputs.length
                ? video.name
                : 'An example result. Run the workflow to replace it with your own.'
            }}
          </span>
          <span v-if="video.sizeBytes" class="shrink-0">{{ formatSize(video.sizeBytes) }}</span>
        </div>

        <div class="mt-1 flex flex-col gap-3">
          <button
            type="button"
            :disabled="isBusy || !!blockingError"
            class="min-h-12 w-full rounded-2xl bg-brand px-6 py-3 text-sm font-semibold uppercase tracking-wider text-page transition hover:opacity-90 disabled:cursor-not-allowed disabled:bg-white/20 disabled:text-content-muted"
            @click="run"
          >
            <span class="flex items-center justify-center gap-2">
              <span
                v-if="isBusy && state !== 'canceling'"
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
          <p v-if="blockingError" class="text-xs leading-relaxed text-content-muted">
            {{ blockingError }}
          </p>
          <button
            v-if="canCancel || state === 'canceling'"
            type="button"
            :disabled="state === 'canceling'"
            class="min-h-12 w-full rounded-2xl border border-divider px-6 py-3 text-sm font-semibold uppercase tracking-wider text-content transition-colors hover:border-brand hover:text-brand disabled:cursor-wait disabled:text-content-muted"
            @click="cancelJob"
          >
            {{ state === 'canceling' ? 'Canceling…' : 'Cancel job' }}
          </button>
          <a
            v-if="video"
            :href="video.url"
            download
            class="inline-flex min-h-12 w-full items-center justify-center rounded-2xl border border-brand px-6 py-3 text-sm font-semibold uppercase tracking-wider text-brand transition-colors hover:bg-brand hover:text-page"
          >
            Download video
          </a>
        </div>

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

        <p v-if="runCaption" class="text-xs leading-relaxed text-content-muted">
          {{ runCaption }}
        </p>

        <div class="flex flex-col gap-2 border-t border-white/10 pt-4 text-xs text-content-muted">
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
          v-else-if="statusMessage"
          class="rounded-lg border border-divider-subtle bg-white/4 p-3 text-[11px] text-content-secondary"
        >
          {{ statusMessage }}
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
