import generatedAssets from '@/data/hub-media-assets.json';
import generatedImages from '@/data/hub-media-images.json';
import { firstStillThumbnail, isAudioFile, isVideoFile } from '@/lib/media-utils';
import { thumbnailPath } from '@/lib/routes';
import { getStillImageUrl, getVideoFrameUrl } from '@/lib/video-thumbnail';

const MEDIA_BASE = 'https://media.comfy.org/hub-media';
const LANDING_HERO_WIDTH = 1280;

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

export function detailHeroPreload(
  thumbnail: string | null | undefined,
  mediaSubtype?: string
): string | null {
  if (!thumbnail) return null;
  const url = thumbnailPath(thumbnail);
  if (isVideoFile(url)) return hubMediaFor(url)?.poster ?? getVideoFrameUrl(url);
  if (isAudioFile(url)) return null;
  const generated = hubImageFor(url);
  if (generated) return generated;
  if (mediaSubtype === 'webp') return getStillImageUrl(url, 640) ?? url;
  return url;
}

export function landingHeroPreload(thumbnails: string[] | undefined): string | null {
  const still = landingHeroImage(thumbnails);
  if (still) return still;
  const video = thumbnails?.find(isVideoFile);
  if (!video) return null;
  const url = thumbnailPath(video);
  return hubMediaFor(url)?.poster ?? getVideoFrameUrl(url);
}
