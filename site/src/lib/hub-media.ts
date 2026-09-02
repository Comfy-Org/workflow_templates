/**
 * Right-sized copies of the hub's card media, hosted on our own bucket.
 *
 * The hub's uploads are delivered at their original encode, which for card
 * thumbnails means multi-megabyte files: one measured 9.67 Mbps for a five
 * second loop. The catalog was re-encoded once, offline, at each source's own
 * resolution (capped at 1920, NOT at the card box: the same asset is the
 * detail-page hero at up to 2044 device px, and downscaling to 1280 cost 3 to 4
 * VMAF points at the same file size) and paired with a poster frame, then
 * uploaded to `media.comfy.org`.
 *
 * Quality was gated per file against the source on VMAF >= 95, not assumed from
 * an encoder setting and not measured with SSIM, which passed a visibly
 * degraded file at 0.9665 that VMAF scored 78.8.
 *
 * This is a partial manifest by design. An asset is absent when re-encoding it
 * could not clear the floor, or cleared it while saving under 25%, which buys a
 * second copy to maintain for almost no bytes. Absent means "keep the original
 * URL and the Cloudflare frame transform", so those cards and a workflow
 * uploaded since the last run both keep working exactly as they do today.
 *
 * The pipeline that regenerates these manifests, and the rules above with the
 * evidence behind each, are in `scripts/hub-media/README.md`.
 */
import generatedAssets from '@/data/hub-media-assets.json';
import generatedImages from '@/data/hub-media-images.json';
import { firstStillThumbnail, isAudioFile, isVideoFile } from '@/lib/media-utils';
import { thumbnailPath } from '@/lib/routes';
import { getVideoFrameUrl } from '@/lib/video-thumbnail';

const MEDIA_BASE = 'https://media.comfy.org/hub-media';

/** Ids are the upstream filename, which is already a UUID. */
const generated = new Set<string>(generatedAssets as string[]);

function assetId(url: string): string | null {
  const file = url.split('?')[0]?.split('/').pop();
  if (!file) return null;
  const dot = file.lastIndexOf('.');
  return dot > 0 ? file.slice(0, dot) : file;
}

export interface HubMedia {
  /** Still frame, 640 wide. A placeholder the video replaces once it plays. */
  poster: string;
  /** Re-encoded video at the source's own resolution, capped at 1920 wide. */
  video: string;
}

/**
 * Extension of our copy, keyed by asset id. Every entry is `jpg` today: stills
 * re-encode to JPEG, and animated WebP is deliberately left alone, because
 * re-encoding it introduced visible blocking in smooth gradients for about 3%
 * of the total saving on files that are already `loading="lazy"`. The extension
 * is stored rather than assumed so reintroducing a second output format does
 * not require changing every call site.
 *
 * Assets that gained nothing from re-encoding, or that carry real transparency
 * a JPEG would flatten, are absent and keep their original URL.
 */
const generatedImageExt = generatedImages as Record<string, string>;

/** Our re-encoded still for a card image, when one exists. */
export function hubImageFor(sourceUrl: string): string | null {
  const id = assetId(sourceUrl);
  if (!id) return null;
  const ext = generatedImageExt[id];
  return ext ? `${MEDIA_BASE}/images/${id}.${ext}` : null;
}

export function hubMediaFor(sourceUrl: string): HubMedia | null {
  const id = assetId(sourceUrl);
  if (!id || !generated.has(id)) return null;
  return {
    poster: `${MEDIA_BASE}/posters/${id}.jpg`,
    video: `${MEDIA_BASE}/video/${id}.mp4`,
  };
}

/**
 * The still image a landing hero will render, resolved to our copy.
 *
 * Exported so the page can emit a matching `<link rel="preload">` without
 * recomputing the URL. A preload whose href differs from the element's `src`
 * by even a query string downloads the file twice, which is worse than not
 * preloading at all, so both sides read from here.
 *
 * Returns null when the hero is a video, which carries its own poster instead.
 */
export function landingHeroImage(thumbnails: string[] | undefined): string | null {
  const still = firstStillThumbnail(thumbnails);
  if (!still) return null;
  const url = thumbnailPath(still);
  return hubImageFor(url) ?? url;
}

/**
 * The URL a card or hero should actually render for an asset: our re-encoded
 * video or image where one exists, otherwise the original untouched.
 *
 * Shared so a page emitting `<link rel="preload">` and the component rendering
 * the element resolve identically. A preload that differs from the element's
 * `src` fetches the file twice, which is worse than not preloading at all.
 */
export function hubAssetUrl(url: string): string {
  if (!url) return url;
  return hubMediaFor(url)?.video ?? hubImageFor(url) ?? url;
}

/** The image worth preloading for a detail hero, or null when there is none. */
export function detailHeroPreload(thumbnail: string | null | undefined): string | null {
  if (!thumbnail) return null;
  const url = thumbnailPath(thumbnail);
  // A video hero paints its poster first, so that is the image to fetch early,
  // and the frame-transform fallback matters as much as the generated poster:
  // 27 of the catalog's videos have no generated copy, ThumbnailDisplay renders
  // exactly this URL for them, and without it their LCP image is preloaded not
  // at all. `thumbnailPath` is character-for-character what ThumbnailDisplay's
  // own `thumbUrl` produces, so the two cannot become separate requests.
  //
  // Mirrors what ThumbnailDisplay paints, branch for branch: a video shows its
  // poster, audio shows an icon and so has no image worth fetching, and a still
  // falls back to its ORIGINAL url. That last one was returning null, which
  // meant the assets deliberately left out of the image manifest - the ones
  // that saved under 15%, plus every animated WebP - rendered an LCP still that
  // was never preloaded. `hubAssetUrl` already ends in the same `?? url`.
  if (isVideoFile(url)) return hubMediaFor(url)?.poster ?? getVideoFrameUrl(url);
  if (isAudioFile(url)) return null;
  return hubImageFor(url) ?? url;
}

/**
 * The image a landing hero will actually paint: its still, or, when the hero is
 * video-led, that video's poster.
 *
 * `LandingHero` renders a `<video>` exactly when no thumbnail is a still, which
 * is the same condition under which `landingHeroImage` returns null, so the two
 * branches are complementary rather than overlapping. Both the page's
 * `<link rel="preload">` and the element's `poster` read from here, so they
 * cannot resolve to two different requests.
 */
export function landingHeroPreload(thumbnails: string[] | undefined): string | null {
  const still = landingHeroImage(thumbnails);
  if (still) return still;
  const video = thumbnails?.find(isVideoFile);
  if (!video) return null;
  const url = thumbnailPath(video);
  return hubMediaFor(url)?.poster ?? getVideoFrameUrl(url);
}
