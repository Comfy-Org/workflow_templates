import { describe, expect, it } from 'vitest';
import { getStillImageUrl } from '../../src/lib/video-thumbnail';

/**
 * `getStillImageUrl` is the one helper standing between the hub and its
 * unresized originals: the detail hero, the landing hero, every avatar and the
 * profile header all resolve through it. The cases that matter are the host
 * allowlist (getting it wrong puts a broken image on every card) and `anim=false`
 * (without it Cloudflare re-encodes an animated WebP to GIF and returns MORE
 * bytes than the original - measured 1,870 KB in, 3,106 KB out).
 */
describe('getStillImageUrl', () => {
  const asset = 'https://comfy-hub-assets.comfy.org/templates/abc123.webp';

  it('builds an anim=false transform on the hub asset host', () => {
    expect(getStillImageUrl(asset, 640)).toBe(
      'https://comfy-hub-assets.comfy.org/cdn-cgi/image/width=640,anim=false,format=auto,quality=82/templates/abc123.webp'
    );
  });

  it('always disables animation, whatever the width', () => {
    // Resizing an animated WebP without this is worse than doing nothing.
    for (const width of [64, 128, 640, 1280]) {
      expect(getStillImageUrl(asset, width)).toContain('anim=false');
      expect(getStillImageUrl(asset, width)).toContain(`width=${width},`);
    }
  });

  it('preserves the path, including the uploads/templates split', () => {
    expect(getStillImageUrl('https://comfy-hub-assets.comfy.org/uploads/x.png', 96)).toContain(
      '/uploads/x.png'
    );
  });

  it('returns null for media.comfy.org, which is not behind Cloudflare', () => {
    // Our own bucket answers cdn-cgi URLs with a 404, so a transform there would
    // put a broken image on the page rather than a smaller one.
    expect(getStillImageUrl('https://media.comfy.org/hub-media/images/x.jpg', 640)).toBeNull();
  });

  it('returns null for a look-alike host', () => {
    expect(
      getStillImageUrl('https://comfy-hub-assets.comfy.org.evil.net/uploads/x.png', 640)
    ).toBeNull();
  });

  it('returns null for a relative path', () => {
    expect(getStillImageUrl('/workflows/thumbnails/flux.webp', 640)).toBeNull();
  });
});
