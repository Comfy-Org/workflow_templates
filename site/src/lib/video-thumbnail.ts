/**
 * Poster/fallback image for a video, via Cloudflare's frame extraction.
 *
 * Only hosts served through Cloudflare Media can do this, so the allowlist is
 * explicit rather than "anything on our domain": media.comfy.org sits on the
 * same apex and answers those URLs with a 404, which would put a broken poster
 * on every marketing video.
 *
 * @param videoUrl - The video URL (full HTTPS or relative path)
 * @param timeSeconds - Offset of the frame to extract (default: 1)
 * @returns The frame URL, or null when the host cannot produce one
 */

/**
 * Hosts whose videos support `cdn-cgi/media` frame extraction. `engcomfy.com`
 * covers the test buckets; `comfy-hub-assets.comfy.org` is where the hub's
 * production uploads actually live, and it was missing, so every poster on the
 * live site resolved to null and every video rendered with nothing behind it.
 */
const FRAME_EXTRACTION_HOSTS = ['engcomfy.com', 'comfy-hub-assets.comfy.org'] as const;

function supportsFrameExtraction(hostname: string): boolean {
  // Suffix-matched rather than substring-matched: `includes` would also accept
  // engcomfy.com.example.net, which is not ours.
  return FRAME_EXTRACTION_HOSTS.some((host) => hostname === host || hostname.endsWith(`.${host}`));
}

export function getVideoFrameUrl(videoUrl: string, timeSeconds: number = 1): string | null {
  try {
    const parsed = new URL(videoUrl);
    if (!supportsFrameExtraction(parsed.hostname)) return null;
    // Insert cdn-cgi/media/mode=frame,time={N}s/ between the origin and the path
    const framePath = `cdn-cgi/media/mode=frame,time=${timeSeconds}s`;
    return `${parsed.origin}/${framePath}${parsed.pathname}`;
  } catch {
    // Not a valid absolute URL (relative path) -- no Cloudflare extraction available
    return null;
  }
}

/**
 * A still, right-sized copy of an image on the hub asset host, via Cloudflare
 * Image Resizing.
 *
 * Sibling of `getVideoFrameUrl`: same host allowlist, same reason for it being
 * an allowlist, different `cdn-cgi` transform. It exists for ANIMATED WebP,
 * which is deliberately absent from our re-encoded manifest and so is served at
 * its original size. Measured on the LTX-2.3 detail hero: a 350x350, 52-frame,
 * **1,870 KB** animated WebP, painted eagerly into a 640x360 box, which
 * Lighthouse mobile recorded as the LCP element at **16.7 s** - 16.0 s of it
 * render delay, because the file lands at 1.9 s and then has to decode 52
 * frames on a throttled CPU.
 *
 * `anim=false` collapses that same asset to **18.9 KB** of JPEG/AVIF, one
 * frame, decoded instantly. Note that resizing WITHOUT `anim=false` is actively
 * harmful here: Cloudflare re-encodes the animation to GIF and the same request
 * comes back at 3,106 KB, larger than the original.
 *
 * @param imageUrl - the image URL (absolute)
 * @param width - target width in pixels; Cloudflare will not upscale past the source
 * @returns the transform URL, or null when the host cannot produce one
 */
export function getStillImageUrl(imageUrl: string, width: number): string | null {
  try {
    const parsed = new URL(imageUrl);
    if (!supportsFrameExtraction(parsed.hostname)) return null;
    const transform = `cdn-cgi/image/width=${width},anim=false,format=auto,quality=82`;
    return `${parsed.origin}/${transform}${parsed.pathname}`;
  } catch {
    // Relative path: no Cloudflare transform available.
    return null;
  }
}
