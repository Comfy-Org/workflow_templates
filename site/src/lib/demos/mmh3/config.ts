/**
 * MiniMax-H3 multi-reference demo — the single description of every input the
 * page exposes, shared by the Vue island and the API routes so the UI and the
 * submitted graph can never drift apart.
 *
 * Node ids refer to `workflow-api.json`
 * (mmh3_motion_context_3_keyframes_i2v v0.2): one clip, three references.
 */

/**
 * The deployment this page runs against. Hard-coded rather than configured:
 * it is pinned to this page's workflow (the graph below only makes sense on a
 * deployment that has the H3 nodes and models), and it is whitelisted, so no
 * credential travels with a submission.
 */
export const DEPLOYMENT_URL = 'https://dep-f74ca441-9963-4fb8-a112-b8d78674d88b.run.comfy.app';

/** Frames per second the workflow renders at. */
export const FPS = 24;

/**
 * H3 wants a frame count of the form 17k+5, which the graph computes from the
 * seconds value. Mirrored here so the UI can validate before submitting.
 */
export function clipLengthFrames(seconds: number): number {
  const base = Math.max(5, Math.round(seconds * FPS));
  return base + ((5 - (base % 17)) % 17);
}

export interface KeyframeSlot {
  /** LoadImage node holding this reference. */
  nodeId: string;
  /** 1-based position in the UI. */
  index: number;
}

/** The three references, in the order they occur in the clip. */
export const KEYFRAMES: KeyframeSlot[] = [
  { nodeId: '31', index: 1 },
  { nodeId: '32', index: 2 },
  { nodeId: '33', index: 3 },
];

/** The MiniMaxH3CustomKeyframes node the references feed. */
export const KEYFRAMES_NODE = '21';

/** Place the references at the start, one-third, and two-thirds of the clip. */
export function keyframePositions(seconds: number): number[] {
  return [1, Math.round((seconds * FPS) / 3) + 1, Math.round((seconds * FPS * 2) / 3) + 1];
}

/** Where each scalar control writes in the graph. */
export const INPUT_NODES = {
  prompt: { nodeId: '20', field: 'prompt' },
  seconds: { nodeId: '56', field: 'value' },
  steps: { nodeId: '12', field: 'steps' },
  seed: { nodeId: '10', field: 'noise_seed' },
  aspectRatio: { nodeId: '54', field: 'aspect_ratio' },
  megapixels: { nodeId: '54', field: 'megapixels' },
  sampler: { nodeId: '11', field: 'sampler_name' },
  scheduler: { nodeId: '12', field: 'scheduler' },
  crop: { nodeId: KEYFRAMES_NODE, field: 'crop' },
} as const;

export const ASPECT_RATIOS = [
  '16:9 (Widescreen)',
  '9:16 (Vertical)',
  '1:1 (Square)',
  '4:3 (Standard)',
  '21:9 (Cinemascope)',
] as const;

/** The `multiple` widget on the resolution node: both sides snap to this. */
export const RESOLUTION_MULTIPLE = 8;

/** What the resolution control offers, and the megapixels each one sends. */
export const RESOLUTION_PRESETS = [
  { label: 'Draft', megapixels: 0.2 },
  { label: 'Standard', megapixels: 0.4 },
  { label: 'High', megapixels: 1 },
] as const;

/**
 * Frame size for an aspect ratio at a megapixel budget: spread the pixels
 * across the ratio, then snap each side to {@link RESOLUTION_MULTIPLE}.
 *
 * This mirrors the resolution node so the UI can show what a preset means. The
 * node is the authority — treat these as approximate, and expect a few pixels
 * of difference if its rounding differs.
 */
export function frameSizeFor(
  aspectRatio: string,
  megapixels: number
): { width: number; height: number } {
  const [w, h] = aspectRatio.split(' ')[0].split(':').map(Number);
  const scale = Math.sqrt((megapixels * 1_000_000) / (w * h));
  const snap = (value: number) =>
    Math.max(RESOLUTION_MULTIPLE, Math.round(value / RESOLUTION_MULTIPLE) * RESOLUTION_MULTIPLE);
  return { width: snap(w * scale), height: snap(h * scale) };
}

export const SAMPLERS = ['res_multistep', 'euler', 'dpmpp_2m', 'ddim', 'uni_pc'] as const;
export const SCHEDULERS = ['simple', 'normal', 'karras', 'beta', 'sgm_uniform'] as const;
export const CROP_MODES = ['center', 'disabled'] as const;

/** Defaults mirror the workflow as authored. */
export interface DemoSettings {
  prompt: string;
  seconds: number;
  steps: number;
  seed: number;
  aspectRatio: string;
  megapixels: number;
  sampler: string;
  scheduler: string;
  crop: string;
  /** Reference slot indices (1-3) present in the run. */
  enabledKeyframes: number[];
}

export const DEFAULTS: DemoSettings = {
  prompt: '',
  seconds: 10,
  steps: 8,
  seed: 424242,
  aspectRatio: '16:9 (Widescreen)',
  megapixels: 0.4,
  sampler: 'res_multistep',
  scheduler: 'simple',
  crop: 'center',
  enabledKeyframes: KEYFRAMES.map((k) => k.index),
};

export interface JobOutput {
  name: string;
  nodeId: string;
  contentType: string;
  sizeBytes: number;
  url: string;
}

/** Queue depth for the deployment behind this page. */
export interface QueueState {
  available: boolean;
  jobsInQueue?: number;
  /** Workers by state, as reported by the deploy control plane. */
  workers?: {
    idle: number;
    initializing: number;
    ready: number;
    running: number;
    throttled: number;
    unhealthy: number;
  };
  sampledAt?: string;
  reason?: string;
}

/** How old a queue sample can be before the UI stops trusting the number. */
export const QUEUE_STALE_MS = 120_000;
