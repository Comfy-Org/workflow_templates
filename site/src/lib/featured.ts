/**
 * Featured-templates selection for the hub hero carousel.
 * Single source of truth shared by the default and localized index pages.
 */
import type { SerializedTemplate } from './hub-api';
import { isMediaFile } from './media-utils';
import { thumbnailPath } from './routes';

/** How many templates the hero carousel rotates through. */
export const FEATURED_COUNT = 6;

/** Top templates by real usage (most-used first). */
export function getFeatured(
  templates: SerializedTemplate[],
  count: number = FEATURED_COUNT
): SerializedTemplate[] {
  return [...templates].sort((a, b) => b.usage - a.usage).slice(0, count);
}

/**
 * URL of the first featured card's image for an LCP `<link rel="preload">`.
 * Returns null when there is no featured item or its primary asset is video/audio
 * (those carry their own poster handling and shouldn't be image-preloaded).
 */
export function featuredPreloadImage(featured: SerializedTemplate[]): string | null {
  const primary = featured[0]?.thumbnails?.[0];
  if (!primary || isMediaFile(primary)) return null;
  return thumbnailPath(primary);
}
