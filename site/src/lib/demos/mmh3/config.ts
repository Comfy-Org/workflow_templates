/**
 * MiniMax-H3 multi-reference demo — the single description of every input the
 * page exposes, shared by the Vue island and the API routes so the UI and the
 * submitted graph can never drift apart.
 *
 * Node ids refer to `workflow-api.json`
 * (mmh3_motion_context_3_keyframes_i2v v0.2): one clip, three references.
 */

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
  /** Frame this reference is anchored to. */
  frame: number;
}

/** The three references, in the order they occur in the clip. */
export const KEYFRAMES: KeyframeSlot[] = [
  { nodeId: '31', index: 1, frame: 1 },
  { nodeId: '32', index: 2, frame: 121 },
  { nodeId: '33', index: 3, frame: 241 },
];

/** The MiniMaxH3CustomKeyframes node the references feed. */
export const KEYFRAMES_NODE = '21';

/** Highest frame any reference is pinned to — the clip cannot be shorter. */
export const MAX_KEYFRAME_FRAME = Math.max(...KEYFRAMES.map((k) => k.frame));

/**
 * The `keyframe_state` widget the node reads: how many references it should
 * expect, and where each lands. Rebuilt whenever one is removed, since the node
 * pairs positions with `keyframe_image_1..count` in order.
 */
export function buildKeyframeState(positions: number[]): string {
  return JSON.stringify({ count: positions.length, positions });
}

/** Highest frame still in play once removed references are excluded. */
export function maxFrameFor(enabled: number[]): number {
  const frames = KEYFRAMES.filter((k) => enabled.includes(k.index)).map((k) => k.frame);
  return frames.length ? Math.max(...frames) : 0;
}

/**
 * References are pinned to absolute frames; nothing rescales them when the clip
 * length changes, so a clip that ends before the last one fails inside the node.
 */
export function validateSeconds(seconds: number, maxFrame = MAX_KEYFRAME_FRAME): string | null {
  const length = clipLengthFrames(seconds);
  if (maxFrame && length < maxFrame) {
    const needed = (maxFrame / FPS).toFixed(1);
    return `The last reference image sits at ${needed}s, past the end of a ${seconds}s clip. Make the clip at least ${needed}s, or remove the references that fall past the end.`;
  }
  return null;
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
  loraStrength: { nodeId: '2', field: 'strength_model' },
  crop: { nodeId: KEYFRAMES_NODE, field: 'crop' },
} as const;

export const ASPECT_RATIOS = [
  '16:9 (Widescreen)',
  '9:16 (Vertical)',
  '1:1 (Square)',
  '4:3 (Standard)',
  '21:9 (Cinemascope)',
] as const;

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
  loraStrength: number;
  crop: string;
  /** Reference slot indices (1-3) still in the run; omitted ones are removed. */
  enabledKeyframes: number[];
}

export const DEFAULTS: DemoSettings = {
  prompt: '',
  seconds: 15,
  steps: 8,
  seed: 424242,
  aspectRatio: '16:9 (Widescreen)',
  megapixels: 0.4,
  sampler: 'res_multistep',
  scheduler: 'simple',
  loraStrength: 1,
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
