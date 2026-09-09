/**
 * Curated English copy for hub workflow detail pages, keyed the same way as
 * `workflow-entity-graphs.ts` (see `curated-workflow-keys.ts`).
 *
 * The hub API is the source for every other workflow's copy. These four pages
 * carry client-approved prose written to corroborate the entity graph the page
 * already emits — the schema names `Codec`, `High Dynamic Range`, `Motion
 * Interpolation`, `Graphics Processing Unit` and the rest, and this text is
 * where those terms actually appear on the page. Generated hub copy predates
 * that schema and does not mention them, so it is overridden here rather than
 * left to drift.
 *
 * Transcribed verbatim from the client-provided content recommendation — do not
 * paraphrase, re-wrap, or extend entries by extrapolation. Paragraphs are stored
 * one per array element and joined with a blank line, which is the separator
 * `TemplateDetailPage.astro` splits on.
 */
import { curatedKey } from './curated-workflow-keys';

export interface WorkflowCopy {
  /** Long-form description shown under the hero, one entry per paragraph. */
  extendedDescription?: readonly string[];
}

/** A `WorkflowCopy` with its paragraph arrays collapsed to page-ready strings. */
export interface ResolvedWorkflowCopy {
  extendedDescription?: string;
}

export const WORKFLOW_COPY: Record<string, WorkflowCopy> = {
  // LTX-2.5: Image to Video
  video_ltx2_5_i2v: {
    extendedDescription: [
      "This ComfyUI workflow turns a single still image into a smooth, high-fidelity video using LTX-2.5, Lightricks' open-source video generation model, with full API access for local, self-hosted rendering. The pipeline is intentionally simple and production-minded: LoadImage ingests your source frame, ResolutionSelector locks in a model-friendly pixel size (multiples of 32) and display aspect ratio, the LTX-2.5 generator node (UUID: 6e397a2b-68f7-48f6-8930-f3a5491a163c) synthesizes a coherent motion sequence with high dynamic range and smooth motion interpolation, and SaveVideo encodes the frames to a ready-to-use MP4 using a standard codec. A MarkdownNote in the graph provides in-UI guidance and links.",
      'Under the hood, LTX-2.5 uses a keyframes-first "Pixel Diffusion" approach to propagate detail and structure consistently across time. This helps preserve subject identity, lighting, and scene composition from your source footage while introducing controllable motion. ResolutionSelector ensures your chosen 16:9 dimensions conform to model stride (multiples of 32), which is critical for rendering stability and VRAM efficiency on your own computer hardware and GPU. Because it runs entirely locally, you keep full control over your data rather than uploading footage to a third-party service.',
      'The workflow is built for real production use, not just experimentation: quality holds up across longer sequences, output stays consistent frame to frame, and the node library is editable enough to fit into an existing VFX or content pipeline. You can iterate quickly, refine your prompts, tune duration (frames/fps), and adjust motion strength to meet the needs of previz, VFX look development, camera-driven scenes, and multi-format content delivery, whether the final export needs to run at 1080p for social or full native resolution for a hero placement.',
    ],
  },

  // Seedance 2.5: Reference to Video
  api_seedance2_5_r2v: {
    extendedDescription: [
      'Seedance 2.5 builds a single 4–30 second video from up to 20 reference images, 6 video clips, and 6 audio clips, giving you direct control over character identity, visual style, and motion rhythm without manual video editing. ByteDance2ReferenceNode reads your strongest identity shots first and blends them with your reference footage and camera angles, so the output holds a consistent look scene to scene rather than drifting the way single-image generators do. The result plays like a shot pulled straight from a camera rather than a generated clip, which is what makes it hold up for cinematic techniques like coordinated framing and lighting across a short series.',
      "Audio and picture are generated together rather than layered on afterward: feed in a single clean vocal track, recorded close to the microphone, and Seedance 2.5 handles lip-sync, sound effect timing, and motion pacing so dialogue lands on the frame it's spoken in. Display resolution, aspect ratio, and frame rate are all set upfront, and image stabilization keeps handheld-style motion from reading as noisy motion blur. Preview at a lower resolution and shorter duration to confirm sync and motion first, then scale up to full quality, 1080p or higher, once the take is locked, using a fixed seed to keep comparisons consistent between runs.",
      'Because reference inputs carry brand assets directly into the output, this is built for repeatable commercial work rather than one-off experiments: product demonstration clips, branded short-form ads, and character-driven series that need to hold quality across dozens of variations for different target markets. Swap the reference set and Seedance 2.5 regenerates the same shot with new personalization details for each audience, turning what used to be a manual production step into a business process you can run at the volume digital marketing and e-commerce distribution actually need.',
    ],
  },

  // MiniMax H3: Image to Video
  video_minimax_h3_i2v: {
    extendedDescription: [
      "MiniMax H3 turns a single starting image into a short, high-quality video clip in one pass, generating the visuals and the audio together rather than as a separate sound design step. You bring one input image; everything else, motion, style, and sound, is steered with optional short text guidance or reference media rather than a full script. It's built for speed over precision: rapid concept visualization, character animation tests, and shareable social clips that need built-in sound rather than a silent render you edit later.",
      "ResolutionSelector picks your output size from a megapixel budget rather than a fixed resolution, and ImageScaleToTotalPixels keeps the dimensions as multiples of 32 while preserving your source image's aspect ratio through GetImageSize, so a portrait photo doesn't get stretched into a landscape frame. If you'd rather skip audio entirely, the MiniMax H3 node can generate silent output, and SaveVideo still writes a clean MP4 either way. Before your first render, download the video and audio VAE files listed in the workflow notes and point the node at them, or generation will fail on a missing model.",
      'Because it runs as a single unified model rather than a video generator bolted to a separate audio tool, output stays synced by construction instead of needing alignment afterward, which is what makes this a fast way to test an idea, a webcam clip, or a website hero visual before committing to a longer, more deliberate production pass.',
    ],
  },

  // Wan Animate 2: Motion Transfer
  video_wan_animate2: {
    extendedDescription: [
      "Wan Animate 2 animates a still character by transferring motion directly from a driving video, reading movement straight from the video frames instead of running a separate pose extraction or skeletal animation preprocessing step most motion-transfer workflows require. The reference image anchors the character's identity, while your text prompt generates a fresh background and controls camera movement independently of the motion source, so the same driving clip can drop a character into an entirely different scene. Because there's no computer vision pose pipeline to configure, setup takes a fraction of the time comparable motion-capture-style workflows need.",
      'GetVideoComponents reads the frame rate straight off your driving clip and CreateVideo matches playback to it, so retiming is a matter of adjusting fps up for faster movement or down for slower rather than re-authoring the whole sequence. Keep your reference image well-lit with minimal occlusion and a consistent aspect ratio and display resolution, since image stabilization only smooths so much before mismatched framing shows up as jitter in the final render.',
      "For clips longer than a single render pass, duplicate the Motion Transfer subgraph, match its prompt and size to the first copy, and feed both into BatchImagesNode to stitch full-length footage together, a workaround for native looping that's still under review. That segment-and-stitch approach makes this practical for real production use: character animation replacement, action mimicry for previz, and moving a performer's motion into branded footage without re-shooting, all without a dedicated motion-capture pipeline or waiting on a render farm for every iteration.",
    ],
  },
};

/**
 * Resolve curated copy for a workflow, accepting either the snake_case template
 * name (local content-collection builds) or the hub share id (preview/prod).
 * Returns undefined for the workflows that have no curated entry, which is all
 * but the four above — those keep whatever the hub sends.
 */
export function getWorkflowCopy(nameOrShareId: string): ResolvedWorkflowCopy | undefined {
  const copy = WORKFLOW_COPY[curatedKey(nameOrShareId)];
  if (!copy) return undefined;
  return {
    extendedDescription: copy.extendedDescription?.join('\n\n'),
  };
}
