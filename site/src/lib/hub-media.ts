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
import { getStillImageUrl, getVideoFrameUrl } from '@/lib/video-thumbnail';

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
/** Width the landing hero is requested at: the box is `aspect-940/516`, so 1280
 *  covers it at DPR 2 on mobile and 1x on desktop. Cloudflare will not upscale. */
const LANDING_HERO_WIDTH = 1280;

export function landingHeroImage(thumbnails: string[] | undefined): string | null {
  const still = firstStillThumbnail(thumbnails);
  if (!still) return null;
  const url = thumbnailPath(still);
  const generated = hubImageFor(url);
  if (generated) return generated;
  // No generated copy: size it at the edge rather than shipping the original.
  // This hero is the page's eager, high-priority image and the originals are
  // not sized for it - Lighthouse reported 1,105 KB of `uses-responsive-images`
  // waste on the use-case detail page, 589 KB of it this one file. Measured on
  // that asset: a 604,696-byte PNG comes back as 35,612 bytes of JPEG at
  // width=1280, a 94% cut, and 960 and 1280 return the same bytes because the
  // source is narrower than both.
  return getStillImageUrl(url, LANDING_HERO_WIDTH) ?? url;
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

/**
 * Width the detail hero still is requested at. Read by `ThumbnailDisplay` as
 * well as by `detailHeroPreload` below: the preload and the element have to name
 * the same URL, and two copies of the number are two chances to drift.
 */
export const HERO_STILL_WIDTH = 640;

/**
 * The variants `ThumbnailDisplay` checks BEFORE its animated-thumb branch. Each
 * needs a second thumbnail to win, and when one does the still is never painted.
 */
const STILL_PREEMPTING_VARIANTS = new Set(['compareSlider', 'hoverDissolve']);

/**
 * Whether `ThumbnailDisplay` reaches the branch that paints a still and swaps
 * the animation in after load. Exported so the component decides it from the
 * same predicate `detailHeroPreload` below uses.
 */
export function heroPaintsAnimatedStill(
  thumbnails: readonly string[] | undefined,
  variant?: string | null
): boolean {
  if (!thumbnails?.length) return false;
  const hasSecondImage = thumbnails.length > 1;
  return !(hasSecondImage && STILL_PREEMPTING_VARIANTS.has(variant ?? ''));
}

/**
 * The image worth preloading for a detail hero, or null when there is none.
 *
 * Mirrors `ThumbnailDisplay` branch for branch, in its order, because a preload
 * that names a URL the element does not render is a whole extra request for a
 * picture nobody sees - and it takes `fetchpriority="high"` away from the one
 * that IS the hero. Measured on `api_wan2_7_video_edit` in the PR preview: a
 * 19 KB AVIF still preloaded at high priority that the compare slider never
 * painted, in front of the 1,892 KB and 2,079 KB WebPs it did.
 *
 * So it reads the same three inputs the component branches on - the thumbnail
 * list, the variant, and `mediaSubtype` - rather than only the first thumbnail.
 */
export function detailHeroPreload(
  thumbnails: readonly string[] | null | undefined,
  mediaSubtype?: string,
  variant?: string | null
): string | null {
  const primary = thumbnails?.[0];
  if (!primary) return null;
  const url = thumbnailPath(primary);

  // Audio paints an icon, so there is no image worth fetching early.
  if (isAudioFile(url)) return null;

  // A video hero paints its poster first, so that is the image to fetch early,
  // and the frame-transform fallback matters as much as the generated poster:
  // 27 of the catalog's videos have no generated copy, ThumbnailDisplay renders
  // exactly this URL for them, and without it their LCP image is preloaded not
  // at all. `thumbnailPath` is character-for-character what ThumbnailDisplay's
  // own `thumbUrl` produces, so the two cannot become separate requests.
  if (isVideoFile(url)) return hubMediaFor(url)?.poster ?? getVideoFrameUrl(url);

  // The compare slider layers two full-size images and puts `fetchpriority` on
  // the SECOND one - the "After" - with the "Before" clipped over its left half.
  // The second is therefore the one to fetch early; preloading the first would
  // promote the lower-priority layer ahead of it. Skipped when the second is not
  // an image, which `as="image"` could not fetch anyway.
  const secondary = thumbnails?.[1];
  if (variant === 'compareSlider' && secondary) {
    const secondaryUrl = thumbnailPath(secondary);
    if (!isVideoFile(secondaryUrl) && !isAudioFile(secondaryUrl)) return hubAssetUrl(secondaryUrl);
  }

  // Hover dissolve also needs a second thumbnail, but `fetchpriority` stays on
  // the first, so the answer is the same as the default branch: the original,
  // never the still, because that branch is checked before the animated one.
  if (heroPaintsAnimatedStill(thumbnails, variant) && mediaSubtype === 'webp') {
    const generated = hubImageFor(url);
    // A generated copy IS already a right-sized still, so there is nothing to
    // improve and `primarySrc` names it directly.
    if (generated) return generated;
    // Otherwise ThumbnailDisplay paints the Cloudflare still and swaps the
    // animation in after load, so the still is the LCP image. Both sides read
    // HERO_STILL_WIDTH, so they ask for the same box.
    return getStillImageUrl(url, HERO_STILL_WIDTH) ?? url;
  }

  // zoomHover, hoverDissolve and the default: `primarySrc`, which is our copy
  // when one exists and the ORIGINAL when it does not. Returning null here was
  // why every asset left out of the image manifest rendered an LCP still that
  // was never preloaded at all.
  return hubAssetUrl(url);
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
