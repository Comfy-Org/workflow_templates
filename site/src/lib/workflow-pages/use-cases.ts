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

import type { KeywordModel, WordCountTier } from './schema';

export interface SeoPageFilters {
  /** Match templates whose `models` include any of these (exact model strings). */
  models?: string[];
  /** Match templates whose `tags` include any of these (exact tag strings). */
  tags?: string[];
  /** Match templates of this media type. */
  mediaType?: 'image' | 'video' | 'audio' | '3d';
}

export interface SeoPageDef {
  /** Canonical kebab-case URL segment, used verbatim (not re-slugified). */
  slug: string;
  title: string;
  h1: string;
  /** Target keywords; `keywords.primary` drives copy + meta fallback. */
  keywords: KeywordModel;
  /** Word-count band the quality validator enforces, by keyword difficulty/value. */
  wordCountTier: WordCountTier;
  /** Catalog filters that select the page's template grid (usage-sorted, OR semantics). */
  filters: SeoPageFilters;
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
      paaQuestions: [
        'How do AI headshot generators work?',
        'Are AI headshots good enough for LinkedIn?',
        'How realistic are AI headshots?',
        'Can I make matching headshots for my team?',
      ],
    },
    wordCountTier: 'long',
    filters: { tags: ['Portrait'] },
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
      paaQuestions: [
        'How does AI interior design work?',
        'Can AI redesign a room from a photo?',
        'What interior design styles can AI generate?',
        'Can I keep my room existing layout?',
      ],
    },
    wordCountTier: 'medium',
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
      paaQuestions: [
        'How do I turn a photo into a caricature with AI?',
        'What caricature styles can I make?',
        'Can I make a caricature of a group photo or pet?',
        'Can I use the caricature on merch?',
      ],
    },
    wordCountTier: 'lean',
    filters: { tags: ['Style Transfer'] },
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
      paaQuestions: [
        'How does an AI tattoo generator work?',
        'What tattoo styles can I generate?',
        'Can I turn my idea or photo into a tattoo design?',
        'Can a tattoo artist use an AI-generated design?',
      ],
    },
    wordCountTier: 'long',
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
      paaQuestions: [
        'How do I upscale an image without losing quality?',
        'Can I upscale video to 4K?',
        'How far can I upscale an image?',
        'What is the difference between AI upscaling and a normal resize?',
      ],
    },
    wordCountTier: 'long',
    filters: { tags: ['Image Upscale', 'Video Upscale'] },
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
      paaQuestions: [
        'How do I make an AI avatar from a photo?',
        'Can I make a talking avatar without a camera?',
        'What avatar styles can I create?',
        'Can I keep the same avatar across many images?',
      ],
    },
    wordCountTier: 'medium',
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
      paaQuestions: [
        'How do I turn a photo into a video with AI?',
        'Which AI model is best for image to video?',
        'Can I add motion or camera movement to a still image?',
        'How long can the generated videos be?',
      ],
    },
    wordCountTier: 'long',
    filters: { tags: ['Image to Video'] },
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
      paaQuestions: [
        'How do I restore old photos using AI?',
        'Can severely damaged or torn photos be restored?',
        'How can I colorize a black-and-white photo?',
        'Can AI recover faces in faded photos?',
      ],
    },
    wordCountTier: 'lean',
    // Restoration = repair (Image Edit) + enhancement (Image Upscale). This overlaps
    // the upscaler page on the upscale tag, but the keyword + copy are distinct.
    filters: { tags: ['Image Edit', 'Image Upscale'] },
  },
  {
    slug: 'ai-anime-generator',
    title: 'AI Anime Generator — ComfyUI Workflows',
    h1: 'AI Anime Generator Workflows',
    // Keywords from grounded search research (~30 competitor pages, autocomplete + PAA).
    // "free ..." is a real variant but omitted: it would trip the no-"free" content gate.
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
      paaQuestions: [
        'What is the best AI anime art generator?',
        'How do you generate anime art with AI?',
        'Which app turns text into anime?',
        'Can AI draw anime characters?',
      ],
    },
    wordCountTier: 'medium',
    // Open anime text-to-image models (Anima base/preview, plus Lumina/NewBie) tagged Anime.
    filters: { tags: ['Anime'] },
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
      paaQuestions: [
        'How do you replace a character in a video with AI?',
        'What is Wan Animate and how does it work?',
        'How do you animate a character from a reference video?',
        'Can I replace a character in a video without rotoscoping or masking?',
      ],
    },
    wordCountTier: 'medium',
    // Backed by the Wan 2.2 Animate cluster (character replacement / full-scene animate).
    // No single clean tag covers them, so filter by the model.
    filters: { models: ['wan2.2 Animate'] },
  },
];
