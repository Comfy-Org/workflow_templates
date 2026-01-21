import { defineCollection, z } from 'astro:content';

const templates = defineCollection({
  type: 'data',
  schema: z.object({
    name: z.string(),
    title: z.string().optional(),
    description: z.string(),
    mediaType: z.enum(['image', 'video', 'audio', '3d']),
    tags: z.array(z.string()).optional(),
    models: z.array(z.string()).optional(),
    date: z.string().optional(),
    openSource: z.boolean().optional(),
    requiresCustomNodes: z.array(z.string()).optional(),
    usage: z.number().optional(),

    // Synced assets
    thumbnails: z.array(z.string()).default([]),
    size: z.number().optional(),
    vram: z.number().optional(),

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

    // Override tracking
    humanEdited: z.boolean().default(false),
    lastAIGeneration: z.string().optional(),
  }),
});

export const collections = { templates };
