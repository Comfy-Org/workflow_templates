/**
 * The shared image fallback pool for workflow landing pages (use-case + model).
 *
 * Every template that has a still image, trimmed to the fields the image-matcher
 * reads (`MatcherTemplate`) so the page payload stays lean. A section draws a
 * content-matched image from this whole-dataset pool before any image repeats,
 * so no card is ever left empty.
 */
import type { SerializedTemplate, MatcherTemplate } from '../hub-api';
import { hasStillThumbnail } from '../media-utils';

// Exhaustive map: a new MatcherTemplate field won't compile until listed here,
// so the projection below can't silently drop a matching signal.
const MATCHER_FIELDS: Record<keyof MatcherTemplate, true> = {
  name: true,
  shareId: true,
  title: true,
  description: true,
  tags: true,
  models: true,
  usage: true,
  thumbnails: true,
};

const MATCHER_KEYS = Object.keys(MATCHER_FIELDS) as (keyof MatcherTemplate)[];

export function buildFallbackPool(catalog: SerializedTemplate[]): MatcherTemplate[] {
  return catalog
    .filter((t) => hasStillThumbnail(t.thumbnails))
    .map((t) => Object.fromEntries(MATCHER_KEYS.map((k) => [k, t[k]])) as MatcherTemplate);
}
