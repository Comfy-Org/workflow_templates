/**
 * Registry of SEO pages served at `/workflows/use-cases/<slug>/`.
 *
 * Each entry declares ONE page that does not otherwise exist in the catalog: a
 * high-intent search keyword (e.g. "ai headshot generator") and the dynamic
 * `filters` that select which live workflow templates appear on it. The grid is
 * resolved from the catalog at build time — adding a matching workflow to
 * `index.json` surfaces it here automatically, with no list to maintain.
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
  /** Files the pin under the "Comfy Apps" tab when the catalog hasn't flagged
   *  it. Set only after verifying App Mode in cloud.comfy.org. */
  isApp?: boolean;
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
   *  grid's top pick. Verified in cloud.comfy.org before linking. */
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
    pins: [{ shareId: 'd70243b6fc64', isApp: true }],
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
    filters: { tags: ['ControlNet'] },
    // The ControlNet tag is shared with the tattoo page, which made the two grids
    // near-identical. Interior keeps the depth / inpainting / image-edit side
    // (room restyling preserves geometry); the line-art / Canny / union-control
    // side lives on ai-tattoo-generator only.
    excludeShareIds: [
      '0bb057fd76e3', // SD3.5 Large Canny ControlNet
      '72448fe4e4b5', // Flux.1 Canny Model
      'f052abfce10e', // LTX-2 Canny to Video
      '1af3df552a07', // Qwen-Image Union Control
      '9829786b38f5', // Qwen-Image InstantX Union ControlNet
      'dba8340fd0f3', // Qwen-Image ControlNet Model Patch
      '7553d92529e0', // Z-Image-Turbo Fun Union ControlNet
      '02bd87067503', // Qwen-Image 2512: Fun Union ControlNet
      '12c2481d04b4', // AI on the Lot video union-control LoRA (off-topic)
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
    filters: { tags: ['Style Transfer'] },
    // Photo to Cartoon Style Caricature app (tagged only "Image Edit", so pinned).
    appShareId: 'd5ce59e59ff3',
    pins: [{ shareId: 'd5ce59e59ff3', isApp: true }],
    // Style-Transfer-tagged non-stylizers: ref-to-video, video style-transfer,
    // product-scene, motion collages, product ad.
    excludeShareIds: [
      '5a3df986f9f8',
      'e1e03cafda18',
      'd686f64879fb',
      'c27ee1ed3d54',
      '17883fb20765',
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
    pins: [{ shareId: '90d086fef9e3', isApp: true }],
    // Complement of the ai-interior-design split: tattoo keeps the line-art /
    // Canny / union-control cluster (stencil work), interior keeps the depth /
    // inpainting / image-edit cluster. Plus the off-topic "AI on the Lot" LoRA.
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
    // surface it. Its isApp stays unset until App Mode is verified in cloud.
    pins: [
      { shareId: 'c1959fdc5642' },
      { shareId: 'b3bbbf217b89', isApp: true },
      { shareId: '0740bf78b7b6' },
    ],
    // Upscale-tagged non-upscalers: virtual try-on, ad viz, variations app, event demo.
    excludeShareIds: ['5652fbe7f479', 'c5cbee07611f', 'c046d6c94bd1', '94ed41b87579'],
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
    filters: {
      tags: ['Character Reference', 'Lip Sync', 'Character Replacement', 'Character', 'Face Swap'],
    },
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
    // Its pin's isApp stays unset until App Mode is verified in cloud.comfy.org.
    pins: [{ shareId: '7cc1d3bd2802' }, { shareId: '8c7511104c80' }, { shareId: '3515c5083027' }],
    // Image-to-Video-tagged non-generators: shot annotation, character-swap
    // (brand-safety pending), ByteDance real-human (KYC-gated).
    excludeShareIds: ['0136284ecc19', '064da31db8f3', 'd4b951896b54'],
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
      { shareId: '69850664cf89', isApp: true },
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
    // it. Its isApp stays unset until App Mode is verified in cloud.comfy.org.
    pins: [{ shareId: '9f0b568bf8a1' }],
    // Anime-tagged non-generators: anime→live-action converter, untitled test workflow.
    excludeShareIds: ['6fec31e40f4a', '2030b1e2fb72'],
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
  },
];
