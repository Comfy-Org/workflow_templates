import { z } from 'zod';

export const FeaturesResponseSchema = z
  .object({
    featureFlags: z.record(z.string(), z.unknown()).optional(),
    free_tier_credits: z.number().optional(),
    partner_node_conversion_rate: z.number().optional(),
  })
  .passthrough();

export type FeaturesResponse = z.infer<typeof FeaturesResponseSchema>;
