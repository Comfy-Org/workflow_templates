import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Base schema for template data
const templateSchema = z.object({
  name: z.string(),
  title: z.string().optional(),
  description: z.string(),
  mediaType: z.enum(['image', 'video', 'audio', '3d']),
  mediaSubtype: z.string().optional(),
  thumbnailVariant: z.enum(['compareSlider', 'hoverDissolve', 'hoverZoom', 'zoomHover']).optional(),
  estimatedTime: z.string().optional(),
  tutorialUrl: z.string().optional(),
  tags: z.array(z.string()).optional(),
  models: z.array(z.string()).optional(),
  date: z.string().optional(),
  openSource: z.boolean().optional(),
  requiresCustomNodes: z.array(z.string()).optional(),
  requiredNodes: z
    .array(
      z.object({
        nodeType: z.string(),
        package: z.string(),
        url: z.string(),
        description: z.string().optional(),
      })
    )
    .optional(),
  usage: z.number().optional(),
  username: z.string().optional(),
  includeOnDistributions: z.array(z.string()).optional(),

  // Synced assets
  thumbnails: z.array(z.string()).default([]),
  detailImages: z.array(z.string()).optional(),
  size: z.number().optional(),
  vram: z.number().optional(),
  authorNotes: z.string().optional(),

  workflowModels: z
    .array(
      z.object({
        kind: z.enum([
          'checkpoint',
          'unet',
          'vae',
          'clip',
          'lora',
          'controlnet',
          'upscaler',
          'other',
        ]),
        filename: z.string(),
        nodeType: z.string(),
      })
    )
    .optional(),

  // AI-generated content
  extendedDescription: z.string(),
  howToUse: z.array(z.string()),
  metaDescription: z.string(),
  suggestedUseCases: z.array(z.string()),
  faqItems: z
    .array(
      z.object({
        question: z.string(),
        answer: z.string(),
      })
    )
    .optional(),

  // Generated assets
  workflowPreviewPath: z.string().optional(),

  // Logos
  logos: z
    .array(
      z.object({
        provider: z.union([z.string(), z.array(z.string())]),
      })
    )
    .optional(),

  // Search ranking
  searchRank: z.number().optional(),

  // Workflow type
  isApp: z.boolean().default(false),

  // Override tracking
  humanEdited: z.boolean().default(false),
  lastAIGeneration: z.string().optional(),

  // i18n
  locale: z.string().optional(), // undefined = default locale (en)
});

// English templates (default locale, at root)
const templates = defineCollection({
  type: 'data',
  schema: templateSchema,
});

// SEO page editorial copy. Use-case and model SEO pages share one content shape
// (the only structural difference is `styles` vs `modelSpec`), so both
// collections validate against the same schema. Authored by hand under
// src/content/seo/{use-cases,models}/<slug>.json; rendered by the SEO routes.
const seoContentSchema = z.object({
  /** Hero subheading under the H1. */
  subheading: z.string().optional(),
  /** Intro; paragraphs separated by blank lines. */
  extendedDescription: z.string(),
  /** "What you can create" capability cards (use-case pages). */
  styles: z.array(z.object({ title: z.string(), description: z.string() })).optional(),
  /** "What is <model>" block (model pages). */
  modelSpec: z.object({ summary: z.string(), highlights: z.array(z.string()) }).optional(),
  howToUse: z.array(z.string()),
  /** Subheading for the "What you can create" capabilities section. */
  capabilitiesIntro: z.string().optional(),
  /** "Why ComfyUI" reason rows (title + supporting sentence). */
  whyComfy: z
    .array(
      z.object({
        title: z.string(),
        description: z.string(),
        cloudOnly: z.boolean().optional(),
      })
    )
    .optional(),
  /** Subheading for the "What people use it for" section. */
  applicationsIntro: z.string().optional(),
  suggestedUseCases: z
    .array(z.union([z.string(), z.object({ title: z.string(), subtitle: z.string() })]))
    .optional(),
  /** 150-160 chars; excluded from body word counts. */
  metaDescription: z.string(),
  /** Drives FAQPage JSON-LD. */
  faqItems: z.array(z.object({ question: z.string(), answer: z.string() })),
  /** True for hand-authored copy (vs generated). */
  humanEdited: z.boolean().optional(),
  /** Set by the generator when content could not pass the quality contract. */
  qualityFailed: z.boolean().optional(),
  /** Set when generated rather than hand-authored. */
  lastAIGeneration: z.string().optional(),
});

// Nested under src/content/seo/, so each needs an explicit glob loader (entry
// `id` is the file's base name, e.g. "ai-headshot-generator" / "wan").
const seoUseCases = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/seo/use-cases' }),
  schema: seoContentSchema,
});
const seoModels = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/seo/models' }),
  schema: seoContentSchema,
});

export const collections = {
  templates,
  seoUseCases,
  seoModels,
};
