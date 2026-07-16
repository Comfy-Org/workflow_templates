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
  /**
   * Marks the pinned entry as an App Mode app when the catalog hasn't flagged
   * it yet, so it files under the grid's "Comfy Apps" tab. Only set after
   * opening the share in cloud.comfy.org and seeing App Mode.
   */
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
  /**
   * Cloud share id of the App Mode experience the page's primary CTAs (hero +
   * closing) open. Overrides the default pick — the first template of the
   * usage-sorted grid — which on several pages leads with a workflow unrelated
   * to the use case. Each id is verified in cloud.comfy.org to open in App Mode
   * with bundled sample inputs before being linked here.
   */
  appShareId?: string;
  /**
   * Catalog entries force-included at the top of the grid regardless of
   * `filters` — for on-topic workflows the tag filters can't reach (e.g. the
   * purpose-built apps, which carry no matching tags yet). Cloud-save-only
   * shares that aren't hub-published cannot be pinned; they stay CTA-only.
   */
  pins?: SeoPagePin[];
  /**
   * Share ids removed from the grid: high-usage catalog entries the OR filters
   * catch even though they don't serve the page's use case (the "we should not
   * show wrong workflows" rule).
   */
  excludeShareIds?: string[];
}

export const SEO_PAGES: SeoPageDef[] = [
  {
    slug: 'ai-headshot-generator',
    title: 'AI Headshot Generator — ComfyUI Workflows',
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
    // "Headshot Generator" App Mode share (photo picker + outfit/backdrop/aspect
    // controls). Untagged on the hub, so it is pinned rather than tag-matched.
    appShareId: 'd70243b6fc64',
    pins: [{ shareId: 'd70243b6fc64', isApp: true }],
    // Portrait-tagged but not headshot tools: a reference-to-video generator, an
    // isometric-miniature stylizer, and a product-placement app.
    excludeShareIds: ['5a3df986f9f8', '364e72458b36', '163ff33fc4a7'],
  },
  {
    slug: 'ai-interior-design',
    title: 'AI Interior Design — ComfyUI Workflows',
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
  },
  {
    slug: 'ai-caricature-generator',
    title: 'AI Caricature Generator — ComfyUI Workflows',
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
    // "Photo to Cartoon Style Caricature" App Mode share (photo picker + cartoon
    // style dropdown). Tagged only "Image Edit", so it is pinned rather than
    // tag-matched.
    appShareId: 'd5ce59e59ff3',
    pins: [{ shareId: 'd5ce59e59ff3', isApp: true }],
    // Style-Transfer-tagged but not photo stylization: a reference-to-video
    // generator, a video style-transfer batch, a product-scene transform, motion
    // collages, and a product-ad app.
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
    title: 'AI Tattoo Generator — ComfyUI Workflows',
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
    // No dedicated tattoo workflow exists; the structure-preserving ControlNet and
    // line-art workflows are what adapt to tattoo/stencil design. The copy frames
    // them honestly as design tools, not a one-click app.
    filters: { tags: ['ControlNet', 'Canny'] },
  },
  {
    slug: 'ai-image-upscaler',
    title: 'AI Image Upscaler — ComfyUI Workflows',
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
    // "seo-video-upscaler-app" App Mode share (video picker + megapixels). Covers
    // the video half; swap for a combined app when a dedicated image one ships.
    appShareId: '46102ce62252',
    // The image half leads the grid: the sheet's new "Image Upscale" workflow
    // and the "Image Upscale: Z-Image-Turbo 2K" App Mode share (verified in
    // cloud.comfy.org: image picker + denoise).
    pins: [{ shareId: 'c1959fdc5642' }, { shareId: 'b3bbbf217b89', isApp: true }],
    // Upscale-tagged but not upscalers: a virtual try-on studio, an advertising
    // visualization demo, a variations generator app, and an event demo.
    excludeShareIds: ['5652fbe7f479', 'c5cbee07611f', 'c046d6c94bd1', '94ed41b87579'],
  },
  {
    slug: 'ai-avatar-generator',
    title: 'AI Avatar Generator — ComfyUI Workflows',
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
    title: 'AI Image to Video — ComfyUI Workflows',
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
    // "seo-image-to-video-ltx-api-app" App Mode share (image picker + frame count).
    // OSS LTX pipeline = the free first-run anchor; premium models stay in the grid.
    appShareId: '201003c6d79c',
    // The sheet's free-tier anchors lead the grid: LTX 2.3 (the CTA app's
    // source workflow) then Wan 2.2 14B; Seedance et al. follow by usage. LTX
    // leads because its still thumbnail is the page's hero image and Wan's
    // still 404s on the asset host (hero picking trusts the file extension).
    pins: [{ shareId: '7cc1d3bd2802' }, { shareId: '8c7511104c80' }],
    // Image-to-Video-tagged but not an image-to-video generator: a shot
    // annotation utility, a character-swap flow (brand-safety class pending
    // review), and the ByteDance real-human flow (KYC-gated, not linkable).
    excludeShareIds: ['0136284ecc19', '064da31db8f3', 'd4b951896b54'],
  },
  {
    slug: 'restore-old-photos',
    title: 'Restore Old Photos with AI — ComfyUI Workflows',
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
    // Restoration = repair (Image Edit) + enhancement (Image Upscale). This overlaps
    // the upscaler page on the upscale tag, but the keyword + copy are distinct.
    filters: { tags: ['Image Edit', 'Image Upscale'] },
  },
  {
    slug: 'ai-anime-generator',
    title: 'AI Anime Generator — ComfyUI Workflows',
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
    // "seo-anime-generator-anima-app" App Mode share (baked anime prompt + size).
    appShareId: '3ec117b8333d',
    // Anime-tagged but not anime generation: a video converter that turns anime
    // INTO live action, and an untitled personal test workflow.
    excludeShareIds: ['6fec31e40f4a', '2030b1e2fb72'],
  },
  {
    slug: 'ai-character-replacement',
    title: 'AI Character Replacement — ComfyUI Workflows',
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
