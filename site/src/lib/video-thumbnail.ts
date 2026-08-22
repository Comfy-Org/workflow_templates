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
const FRAME_EXTRACTION_HOSTS = [
  'engcomfy.com',
  'comfy-hub-assets.comfy.org'
] as const;

function supportsFrameExtraction(hostname: string): boolean {
  // Suffix-matched rather than substring-matched: `includes` would also accept
  // engcomfy.com.example.net, which is not ours.
  return FRAME_EXTRACTION_HOSTS.some(
    (host) => hostname === host || hostname.endsWith(`.${host}`)
  );
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
