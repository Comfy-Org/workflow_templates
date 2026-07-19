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
   * Optional `template.name` to pin as the hero card, overriding the default
   * "first template with a still thumbnail" auto-pick. Silently falls back to
   * the auto-pick when the named template is absent from the grid or lacks a
   * still thumbnail — safe to set ahead of a pending hub thumbnail upload.
   */
  heroTemplateName?: string;
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
    // No dedicated tattoo workflow exists; the structure-preserving ControlNet and
    // line-art workflows are what adapt to tattoo/stencil design. The copy frames
    // them honestly as design tools, not a one-click app.
    filters: { tags: ['ControlNet', 'Canny'] },
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
    // Feature Kling: Avatar 2.0 as the hero — the current auto-pick (Kling O3:
    // Reference to Video) has a broken hub thumbnail. Falls back to auto-pick
    // until the hub thumbnail for `api_kling_avatar2` is re-uploaded as a still
    // (animated .webp), so this line is safe to land ahead of that upstream fix.
    heroTemplateName: 'api_kling_avatar2',
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
    // Restoration = repair (Image Edit) + enhancement (Image Upscale). This overlaps
    // the upscaler page on the upscale tag, but the keyword + copy are distinct.
    filters: { tags: ['Image Edit', 'Image Upscale'] },
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
