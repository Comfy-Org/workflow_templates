/**
 * Featured-templates selection for the hub hero carousel.
 * Single source of truth shared by the default and localized index pages.
 */
import type { SerializedTemplate } from './hub-api';
import { isMediaFile, isVideoFile } from './media-utils';
import { thumbnailPath } from './routes';
import { hubMediaFor } from './hub-media';
import { getVideoFrameUrl } from './video-thumbnail';

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
 */
export function featuredPreloadImage(featured: SerializedTemplate[]): string | null {
  const primary = featured[0]?.thumbnails?.[0];
  if (!primary) return null;

  if (isVideoFile(primary)) {
    const url = thumbnailPath(primary);
    return hubMediaFor(url)?.poster ?? getVideoFrameUrl(url);
  }

  if (isMediaFile(primary)) return null;
  return thumbnailPath(primary);
}
