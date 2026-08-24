/**
 * Right-sized copies of the hub's card media, hosted on our own bucket.
 *
 * The hub's uploads are delivered at their original encode, which for card
 * thumbnails means multi-megabyte files: one measured 9.67 Mbps for a five
 * second loop. Every video in the catalog was re-encoded once, offline, at its
 * native resolution (capped at 1280 wide, which covers the largest measured
 * card box) and paired with a poster frame, then uploaded to `media.comfy.org`.
 * Quality was verified per file against the source with SSIM rather than
 * assumed from an encoder setting.
 *
 * A source with no generated copy falls back to the original URL and the
 * Cloudflare frame transform, so a workflow uploaded after the last run keeps
 * working exactly as it does today. Re-run `scripts/hub-media/build.mjs` to
 * pick those up.
 */
import generatedAssets from '@/data/hub-media-assets.json';

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
  /** Re-encoded video at the source's own resolution. */
  video: string;
}

export function hubMediaFor(sourceUrl: string): HubMedia | null {
  const id = assetId(sourceUrl);
  if (!id || !generated.has(id)) return null;
  return {
    poster: `${MEDIA_BASE}/posters/${id}.jpg`,
    video: `${MEDIA_BASE}/video/${id}.mp4`,
  };
}
