import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import type { GeneratedSeoContent } from '../lib/workflow-pages/schema';

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

// Use-case and model pages share this content shape (`styles` vs `modelSpec`).
// Must stay in sync with `GeneratedSeoContent` (schema.ts) — see assertion below.
const seoContentSchema = z.object({
  subheading: z.string().optional(),
  extendedDescription: z.string(),
  styles: z.array(z.object({ title: z.string(), description: z.string() })).optional(),
  modelSpec: z
    .object({
      summary: z.string(),
      highlights: z.array(z.object({ title: z.string(), description: z.string() })),
    })
    .optional(),
  howToUse: z.array(z.string()),
  capabilitiesIntro: z.string().optional(),
  whyComfy: z
    .array(
      z.object({
        title: z.string(),
        description: z.string(),
        cloudOnly: z.boolean().optional(),
      })
    )
    .optional(),
  applicationsIntro: z.string().optional(),
  suggestedUseCases: z
    .array(z.union([z.string(), z.object({ title: z.string(), subtitle: z.string() })]))
    .optional(),
  metaDescription: z.string(),
  faqItems: z.array(z.object({ question: z.string(), answer: z.string() })),
  qualityFailed: z.boolean().optional(),
  lastAIGeneration: z.string().optional(),
});

// Guard against schema/type drift (schema.ts).
const _assertMatch = (content: z.infer<typeof seoContentSchema>): GeneratedSeoContent => content;
void _assertMatch;

const seoUseCases = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/landing/use-cases' }),
  schema: seoContentSchema,
});
const seoModels = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/landing/models' }),
  schema: seoContentSchema,
});

export const collections = {
  templates,
  seoUseCases,
  seoModels,
};
