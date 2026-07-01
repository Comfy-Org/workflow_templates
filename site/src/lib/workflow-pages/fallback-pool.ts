/**
 * The shared image fallback pool for workflow landing pages (use-case + model).
 *
 * Every template that has a still image, trimmed to the fields the image-matcher
 * reads (`MatcherTemplate`) so the page payload stays lean. A section draws a
 * content-matched image from this whole-dataset pool before any image repeats,
 * so no card is ever left empty.
 */
import type { SerializedTemplate, MatcherTemplate } from '../hub-api';
import { isMediaFile } from '../media-utils';

export function buildFallbackPool(catalog: SerializedTemplate[]): MatcherTemplate[] {
  return catalog
    .filter((t) => t.thumbnails?.some((thumb) => !isMediaFile(thumb)))
    .map(
      (t): MatcherTemplate => ({
        name: t.name,
        shareId: t.shareId,
        title: t.title,
        description: t.description,
        tags: t.tags,
        models: t.models,
        usage: t.usage,
        thumbnails: t.thumbnails,
      })
    );
}
