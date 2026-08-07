/**
 * Registry of SEO pages served at `/workflows/use-cases/<slug>/`.
 *
 * Each entry declares ONE page that does not otherwise exist in the catalog: a
 * high-intent search keyword (e.g. "ai headshot generator") and either dynamic
 * `filters` that select live workflow templates, or an explicit `pins` list for
 * clusters the catalog tags cannot reach. Filter-resolved pages surface new
 * matches from `index.json` automatically; curated pages pin their grid.
 * Editorial copy lives per-slug in `src/content/landing/use-cases/<slug>.json`.
 *
 * A page whose filter resolves to zero live templates is skipped (no empty page
 * is ever routed or listed). See `resolveUseCasePageTemplates` in
 * `src/lib/workflow-pages/use-case-resolver.ts` for the matching rules.
 */

import type { KeywordModel } from './schema';

export interface SeoPageFilters {
  /** Match templates whose `models` include any of these (exact model strings). */
  models?: string[];
  /** Match templates whose `tags` include any of these (exact tag strings). */
  tags?: string[];
}

export interface SeoPagePin {
  /** Catalog share id to force-include at the top of the page's grid. */
  shareId: string;
}

export interface SeoPageDef {
  /** Canonical kebab-case URL segment, used verbatim (not re-slugified). */
  slug: string;
  title: string;
  h1: string;
  /** Target keywords; `keywords.primary` drives copy + meta fallback. */
  keywords: KeywordModel;
  /** Catalog filters that select the page's template grid (usage-sorted, OR semantics). */
  filters: SeoPageFilters;
  /** App Mode share the primary CTAs (hero + closing) open, overriding the
   *  grid's top pick. Verified in cloud.comfy.org before linking. When omitted
   *  (App Mode not yet verified for the page), the grid's top pin leads the CTA
   *  instead. */
  appShareId?: string;
  /** Catalog entries force-included atop the grid, bypassing `filters` — for
   *  on-topic workflows the tags can't reach. Must be hub-published to resolve. */
  pins?: SeoPagePin[];
  /** Share ids dropped from the grid: filter matches that don't serve the page. */
  excludeShareIds?: string[];
}

export const SEO_PAGES: SeoPageDef[] = [
  {
    slug: 'ai-headshot-generator',
    title: 'AI Headshot Generator | Comfy Workflows',
    h1: 'AI Headshot Generator Workflows',
    keywords: {
      primary: 'ai headshot generator',
      secondary: [
        'professional headshot',
        'linkedin headshot',
        'headshot from selfie',
        'corporate headshot',
        'professional profile picture',
        'studio lighting',
      ],
    },
    filters: { tags: ['Portrait'] },
    // Headshot Generator app (untagged on the hub, so pinned not tag-matched).
    appShareId: 'd70243b6fc64',
    pins: [{ shareId: 'd70243b6fc64' }],
    // Portrait-tagged non-headshot tools: ref-to-video, miniature stylizer, product placement.
    excludeShareIds: ['5a3df986f9f8', '364e72458b36', '163ff33fc4a7'],
  },
  {
    slug: 'ai-interior-design',
    title: 'AI Interior Design | Comfy Workflows',
    h1: 'AI Interior Design Workflows',
    keywords: {
      primary: 'ai interior design',
      secondary: [
        'redesign a room from a photo',
        'virtual staging',
        'room redesign',
        'interior design styles',
        'ai room planner',
        'remodel visualization',
      ],
    },
    // Fully curated grid: the ControlNet tag only matched generic control demos
    // with no room-design angle, so the page pins the structure-aware room tools
    // explicitly and matches nothing else.
    filters: {},
    pins: [
      { shareId: '7cfb99272578' }, // Photo to Blueprint to Model
      { shareId: 'f6e9d07c02fd' }, // Image Relight (rooms/lighting)
      { shareId: 'e0f1fb8115ed' }, // Bria: Image Edit (structured layout control)
    ],
  },
  {
    slug: 'ai-caricature-generator',
    title: 'AI Caricature Generator | Comfy Workflows',
    h1: 'AI Caricature Generator Workflows',
    keywords: {
      primary: 'ai caricature generator',
      secondary: [
        'photo to caricature',
        'cartoon yourself',
        'caricature from photo',
        'custom caricature',
        'caricature maker',
        'funny portrait',
      ],
    },
    // Fully curated grid: the Style Transfer tag mostly matched glitch/brand
    // tools rather than caricature makers, so the page pins the photo-to-cartoon
    // cluster explicitly and matches nothing else.
    filters: {},
    // Photo to Cartoon Style Caricature app. App Mode verified in cloud.comfy.org.
    appShareId: 'd5ce59e59ff3',
    pins: [
      { shareId: 'd5ce59e59ff3' },
      { shareId: '1043317e75c9' }, // 1 input, multiple styles from prompt
      { shareId: '452e68e4a484' }, // Seedream 5.0 Lite: Image Edit
      { shareId: '4ab928487496' }, // SYSTMS ACTION: Qwen Image Edit 2511 (toy style)
    ],
  },
  {
    slug: 'ai-tattoo-generator',
    title: 'AI Tattoo Generator | Comfy Workflows',
    h1: 'AI Tattoo Generator Workflows',
    keywords: {
      primary: 'ai tattoo generator',
      secondary: [
        'tattoo design generator',
        'custom tattoo design',
        'tattoo idea generator',
        'line art tattoo',
        'tattoo stencil',
        'fine line tattoo design',
      ],
    },
    // The structure-preserving ControlNet and line-art workflows adapt to tattoo/
    // stencil design; the copy frames them honestly as design tools.
    filters: { tags: ['ControlNet', 'Canny'] },
    // Purz's dedicated Tattoo Generator app, pinned atop the grid.
    // App Mode verified in cloud.comfy.org, so it files under the Comfy Apps tab.
    appShareId: '90d086fef9e3',
    pins: [{ shareId: '90d086fef9e3' }],
    // Non-line-art ControlNet matches: generic editors, depth/pose demos, and
    // union-control t2i demos whose only tattoo link is a canny option.
    excludeShareIds: [
      '300efdae24f6', // Image Editing (New)
      '2639a76cf00e', // Qwen Image Edit 2509
      '15538e51d812', // Qwen-Image InstantX Inpainting ControlNet
      '85e7df4b564e', // Flux.1 Depth Lora
      '45a8be9c1124', // SD3.5 Large Depth
      '011974792e13', // LTX-2 Depth to Video
      '52dd3f09bb59', // Flux.1 Redux Model
      '67a816af8a73', // Wan 2.2 14B Fun Control
      '736ab92b893a', // Wan 2.2 5B Fun Control
      '3cf3c6a082ed', // LTX-2 Pose to Video
      '12c2481d04b4', // AI on the Lot video union-control LoRA (off-topic)
      '9829786b38f5', // Qwen-Image InstantX Union ControlNet (generic t2i demo)
      'dba8340fd0f3', // Qwen-Image ControlNet Model Patch (generic t2i demo)
    ],
  },
  {
    slug: 'ai-image-upscaler',
    title: 'AI Image Upscaler | Comfy Workflows',
    h1: 'AI Image & Video Upscaler Workflows',
    keywords: {
      primary: 'ai image upscaler',
      secondary: [
        'upscale image',
        'enlarge photo without losing quality',
        'image enhancer',
        'increase image resolution',
        '4k upscale',
        'video upscaler',
      ],
    },
    filters: { tags: ['Image Upscale', 'Video Upscale'] },
    // Image app, so the CTA matches the image-side hero (video app stays a grid pin).
    appShareId: 'b3bbbf217b89',
    // Video Upscale (0740bf78b7b6) is untagged on the hub, so only a pin can
    // surface it. App classification still comes from Cloud's default_view.
    pins: [{ shareId: 'c1959fdc5642' }, { shareId: 'b3bbbf217b89' }, { shareId: '0740bf78b7b6' }],
    // Upscale-tagged non-upscalers: virtual try-on, ad viz, variations apps, event demo.
    excludeShareIds: [
      '5652fbe7f479',
      'c5cbee07611f',
      'c046d6c94bd1',
      '94ed41b87579',
      '8f90aec3d12c', // Realistic 2k Images - Quick Variations (variation maker, not an upscaler)
    ],
  },
  {
    slug: 'ai-avatar-generator',
    title: 'AI Avatar Generator | Comfy Workflows',
    h1: 'AI Avatar Generator Workflows',
    keywords: {
      primary: 'ai avatar generator',
      secondary: [
        'avatar from photo',
        'profile picture maker',
        'talking avatar',
        'character avatar',
        'animated avatar',
        'custom avatar',
      ],
    },
    // Fully curated grid: the broad character tags pulled in face-swap and
    // voice-clone workflows (brand-safety gated) plus generic reference-to-video
    // items, so the page pins the avatar / talking-head cluster explicitly and
    // matches nothing else.
    filters: {},
    // Kling: Avatar 2.0 — the dedicated avatar workflow, pinned to lead the grid so
    // it still drives the CTA. No appShareId: e81f8eb0ee5f is a canvas workflow, not
    // an App Mode app, so the CTA must not advertise it as one.
    pins: [
      { shareId: 'e81f8eb0ee5f' }, // Kling: Avatar 2.0
    ],
  },
  {
    slug: 'ai-image-to-video',
    title: 'AI Image to Video | Comfy Workflows',
    h1: 'AI Image to Video Workflows',
    keywords: {
      primary: 'ai image to video',
      secondary: [
        'image to video generator',
        'animate a photo',
        'photo to video',
        'turn image into video',
        'image to video ai',
        'video from photo',
      ],
    },
    filters: { tags: ['Image to Video'] },
    // OSS image-to-video LTX app (free first-run anchor; premium models stay in the grid).
    appShareId: '201003c6d79c',
    // Free-tier anchors lead: LTX 2.3 (the CTA app's source), then Wan 2.2 14B,
    // then the dedicated Image to Video workflow (usage sorting buries it).
    // App classification still comes from Cloud's default_view.
    pins: [{ shareId: '7cc1d3bd2802' }, { shareId: '8c7511104c80' }, { shareId: '3515c5083027' }],
    // Image-to-Video-tagged non-generators: shot annotation, character-swap
    // (brand-safety pending), ByteDance real-human (KYC-gated), and two
    // mis-tagged text-to-video workflows.
    excludeShareIds: [
      '0136284ecc19',
      '064da31db8f3',
      'd4b951896b54',
      '768526487e8d', // Wan2.5: Text to Video
      '3eb92c1b2380', // AI on the Lot 2026 - Final WF - t2v
    ],
  },
  {
    slug: 'restore-old-photos',
    title: 'Restore Old Photos with AI | Comfy Workflows',
    h1: 'Restore Old Photos Workflows',
    keywords: {
      primary: 'restore old photos',
      secondary: [
        'photo restoration',
        'repair damaged photos',
        'colorize black and white photos',
        'fix old photos',
        'restore faded photos',
        'photo repair',
      ],
    },
    // Fully curated grid: no tag maps to photo restoration (Image Edit alone
    // pulled ~90 generic editors), so the page pins the restoration-relevant
    // workflows explicitly and matches nothing else.
    filters: {},
    // Dedicated Restore Old Photos workflow. App Mode verified in cloud.comfy.org.
    appShareId: '69850664cf89',
    pins: [
      { shareId: '69850664cf89' },
      { shareId: 'b594a01df1d6' }, // Seedream 5.0 Pro: Image Edit
      { shareId: 'cd929d504424' }, // Topaz: Image Enhance
      { shareId: 'f6e9d07c02fd' }, // Image Relight
      { shareId: '0812b435d117' }, // Topaz: Illustration Upscale
      { shareId: '5ad4348c8417' }, // Magnific: Creative Image Upscale
      { shareId: 'd9d6f1309cbc' }, // WaveSpeed: Image Upscale
    ],
  },
  {
    slug: 'ai-anime-generator',
    title: 'AI Anime Generator | Comfy Workflows',
    h1: 'AI Anime Generator Workflows',
    // Keywords from grounded search research (~30 competitor pages, autocomplete + PAA).
    // "free ..." is a real variant but omitted as an off-brand positioning choice.
    keywords: {
      primary: 'ai anime generator',
      secondary: [
        'anime ai art generator',
        'text to anime',
        'anime art generator',
        'anime character generator',
        'anime style ai image generator',
        'manga art generator',
      ],
    },
    // Open anime text-to-image models (Anima base/preview, plus Lumina/NewBie) tagged Anime.
    filters: { tags: ['Anime'] },
    // Cloud-save app, not hub-published — CTA-only, so the hero can't match it yet.
    appShareId: '3ec117b8333d',
    // Hub-published Anime Generator workflow, pinned so usage sorting can't bury
    // it. App classification still comes from Cloud's default_view.
    // Anima Base v1 + the Illustration LoRA lack the Anime tag, so they need pins.
    pins: [
      { shareId: '9f0b568bf8a1' }, // Anime Generator
      { shareId: 'ab2f354cd396' }, // Anima Base v1: Text to Image
      { shareId: 'e41b80eb587d' }, // Qwen Image: Illustration LoRA
    ],
    // Anime-tagged untitled test workflow.
    excludeShareIds: ['2030b1e2fb72'],
  },
  {
    slug: 'ai-character-replacement',
    title: 'AI Character Replacement | Comfy Workflows',
    h1: 'AI Character Replacement Workflows',
    // Keywords from grounded search research. Research showed "ai character replacement"
    // is the cleaner, higher-intent head term than "ai character animation" (which collides
    // with 3D rigging / cartoon makers). "wan animate" is the top branded secondary.
    // Face-swap / deepfake / body-swap variants are deliberately excluded (brand-safety).
    keywords: {
      primary: 'ai character replacement',
      secondary: [
        'wan animate',
        'replace character in video ai',
        'ai motion transfer',
        'animate a character from a reference video',
        'character animation and replacement',
        'character swap in video',
      ],
    },
    // Backed by the Wan 2.2 Animate cluster (character replacement / full-scene animate).
    // No single clean tag covers them, so filter by the model.
    filters: { models: ['wan2.2 Animate'] },
    // Model matches that aren't character replacement: a comedy inflation
    // effect and a pose-control tutorial.
    excludeShareIds: ['06caca08d30b', '86efedaffa3e'],
  },
  {
    slug: 'ai-song-generator',
    title: 'AI Song Generator | Comfy Workflows',
    h1: 'AI Song Generator Workflows',
    keywords: {
      primary: 'ai song generator',
      secondary: [
        'song generator',
        'ai song maker',
        'text to song',
        'lyrics to song',
        'ai songwriting',
        'make a song with ai',
      ],
    },
    // Fully curated: the song cluster (vocals + lyrics) stays disjoint from the
    // instrumental ai-music-generator page.
    filters: {},
    pins: [
      { shareId: '3ef4de40106b' }, // Song Generator (Ace-Step 1.5XL)
      { shareId: 'b4d8756a63c1' }, // Text to Song (New)
      { shareId: '5d72bed48e89' }, // ACE Step v1 Text to Song
    ],
  },
  {
    slug: 'ai-music-generator',
    title: 'AI Music Generator | Comfy Workflows',
    h1: 'AI Music Generator Workflows',
    keywords: {
      primary: 'ai music generator',
      secondary: [
        'music generator',
        'text to music',
        'ai music maker',
        'background music generator',
        'instrumental music generator',
        'ai sound effects generator',
      ],
    },
    // Fully curated: instrumentals / audio generation, disjoint from the
    // vocals-oriented ai-song-generator page; voice-clone and TTS workflows
    // in the Audio tag stay out (consent-gated class).
    filters: {},
    pins: [
      { shareId: 'a335e0968d76' }, // Music Generator (Stable Audio 3)
      { shareId: '9c3c4722a8e1' }, // Stable Audio 3.0 Medium Base
      { shareId: 'ef36ec96537f' }, // ACE-Step 1.5 Music Generation (4B LLM)
      { shareId: 'f93775fd8ce0' }, // ACE-Step 1.5 Music Generation Workflow
      { shareId: 'afd30ccf8238' }, // ACE-Step 1.5 Music Generation AIO
      { shareId: '9851c174a194' }, // ACE-Step 1.5XL Turbo: Text to Music
      { shareId: 'ea4911d91143' }, // ACE-Step v1 Text to Instrumentals Music
      { shareId: 'f8663cd08a9b' }, // Seed Audio 1.0: Text to Audio
    ],
  },
  {
    slug: 'ai-image-enhancer',
    title: 'AI Image Enhancer | Comfy Workflows',
    h1: 'AI Image Enhancer Workflows',
    // "image enhancer" is the cluster head term; the ai-prefixed variants ride
    // on the same page.
    keywords: {
      primary: 'image enhancer',
      secondary: [
        'photo enhancer',
        'ai image enhancer',
        'ai photo enhancer',
        'enhance image quality',
        'image quality enhancer',
        'fix blurry photos',
      ],
    },
    // Fully curated: enhancement means recovering quality in an existing photo;
    // the Image Enhancement tag also carries editors and video tools.
    filters: {},
    pins: [
      { shareId: 'a09d65985659' }, // Image Enhancer (SeedVR2)
      { shareId: 'cd929d504424' }, // Topaz: Image Enhance
      { shareId: '81643690b5e9' }, // Magnific: Skin Enhancer
      { shareId: '68f726502f5a' }, // Nano Banana Pro: AI Image Enhancement
    ],
  },
  {
    slug: 'ai-hairstyle-changer',
    title: 'AI Hairstyle Changer | Comfy Workflows',
    h1: 'AI Hairstyle Changer Workflows',
    // Also targets the "ai hair color changer" cluster (same workflow serves both).
    keywords: {
      primary: 'ai hairstyle changer',
      secondary: [
        'ai hair color changer',
        'hairstyle try on',
        'change hairstyle in photo',
        'virtual hairstyle',
        'hair color try on',
        'short hair preview',
      ],
    },
    // Fully curated: no hairstyle tag exists in the catalog, so the page is the
    // dedicated workflow alone until siblings are published.
    filters: {},
    pins: [{ shareId: 'fffa07892f17' }], // Hairstyle Changer
  },
  {
    slug: 'image-to-3d',
    title: 'Image to 3D | Comfy Workflows',
    h1: 'Image to 3D Workflows',
    keywords: {
      primary: 'image to 3d',
      secondary: [
        'image to 3d model',
        'photo to 3d model',
        'ai 3d model generator',
        '2d to 3d',
        '3d asset generator',
        'image to 3d mesh',
      ],
    },
    // The `3D Model` tag was retired in #1063; `Image to 3D` is the current
    // catalog vocabulary for this cluster, so filter on that and keep the grid
    // self-maintaining as new 3D workflows land.
    filters: { tags: ['Image to 3D'] },
    pins: [
      { shareId: 'e4a4339afda4' }, // Hunyuan 3D lead (CTA target)
      // Multi-angle 3D camera app: a catalog .app, filed under the Comfy Apps tab.
      { shareId: '4724032fa666' },
    ],
    // Maanil's thumbnail-less test workflow, kept out of the grid (also excluded
    // on ai-anime-generator via its Anime tag).
    excludeShareIds: ['2030b1e2fb72'],
  },
];
