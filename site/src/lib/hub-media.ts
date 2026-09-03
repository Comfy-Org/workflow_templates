import generatedAssets from '@/data/hub-media-assets.json';
import generatedImages from '@/data/hub-media-images.json';
import { firstStillThumbnail, isAudioFile, isVideoFile } from '@/lib/media-utils';
import { thumbnailPath } from '@/lib/routes';
import { getStillImageUrl, getVideoFrameUrl } from '@/lib/video-thumbnail';

const MEDIA_BASE = 'https://media.comfy.org/hub-media';
const LANDING_HERO_WIDTH = 1280;

export const HERO_STILL_WIDTH = 640;

const generatedVideoIds = new Set<string>(generatedAssets as string[]);
const generatedImageExt = generatedImages as Record<string, string>;

function assetId(url: string): string | null {
  const file = url.split('?')[0]?.split('/').pop();
  if (!file) return null;
  const dot = file.lastIndexOf('.');
  return dot > 0 ? file.slice(0, dot) : file;
}

export interface HubMedia {
  poster: string;
  video: string;
}

export function hubImageFor(sourceUrl: string): string | null {
  const id = assetId(sourceUrl);
  if (!id) return null;
  const ext = generatedImageExt[id];
  return ext ? `${MEDIA_BASE}/images/${id}.${ext}` : null;
}

export function hubMediaFor(sourceUrl: string): HubMedia | null {
  const id = assetId(sourceUrl);
  if (!id || !generatedVideoIds.has(id)) return null;
  return {
    poster: `${MEDIA_BASE}/posters/${id}.jpg`,
    video: `${MEDIA_BASE}/video/${id}.mp4`,
  };
}

export function hubAssetUrl(url: string): string {
  if (!url) return url;
  return hubMediaFor(url)?.video ?? hubImageFor(url) ?? url;
}

export function landingHeroImage(thumbnails: string[] | undefined): string | null {
  const still = firstStillThumbnail(thumbnails);
  if (!still) return null;
  const url = thumbnailPath(still);
  return hubImageFor(url) ?? getStillImageUrl(url, LANDING_HERO_WIDTH) ?? url;
}

const STILL_PREEMPTING_VARIANTS = new Set(['compareSlider', 'hoverDissolve']);

export function heroPaintsAnimatedStill(
  thumbnails: readonly string[] | undefined,
  variant?: string | null
): boolean {
  if (!thumbnails?.length) return false;
  return !(thumbnails.length > 1 && STILL_PREEMPTING_VARIANTS.has(variant ?? ''));
}

export function detailHeroPreload(
  thumbnails: readonly string[] | null | undefined,
  mediaSubtype?: string,
  variant?: string | null
): string | null {
  const primary = thumbnails?.[0];
  if (!primary) return null;
  const url = thumbnailPath(primary);

  if (isAudioFile(url)) return null;
  if (isVideoFile(url)) return hubMediaFor(url)?.poster ?? getVideoFrameUrl(url);

  const secondary = thumbnails?.[1];
  if (variant === 'compareSlider' && secondary) {
    const secondaryUrl = thumbnailPath(secondary);
    if (!isVideoFile(secondaryUrl) && !isAudioFile(secondaryUrl)) return hubAssetUrl(secondaryUrl);
  }

  if (mediaSubtype === 'webp' && heroPaintsAnimatedStill(thumbnails, variant)) {
    return hubImageFor(url) ?? getStillImageUrl(url, HERO_STILL_WIDTH) ?? url;
  }
  return hubAssetUrl(url);
}

export function landingHeroPreload(thumbnails: string[] | undefined): string | null {
  const still = landingHeroImage(thumbnails);
  if (still) return still;
  const video = thumbnails?.find(isVideoFile);
  if (!video) return null;
  const url = thumbnailPath(video);
  return hubMediaFor(url)?.poster ?? getVideoFrameUrl(url);
}
