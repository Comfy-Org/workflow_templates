import { describe, expect, it } from 'vitest';
import { detailHeroPreload, hubMediaFor, landingHeroPreload } from '../../src/lib/hub-media';
import { getVideoFrameUrl } from '../../src/lib/video-thumbnail';
import generatedAssets from '../../src/data/hub-media-assets.json';

/** A real id from the generated set, so the test breaks if the data is dropped. */
const known = (generatedAssets as string[])[0];

describe('hubMediaFor', () => {
  it('maps a generated asset to our bucket', () => {
    const result = hubMediaFor(`https://comfy-hub-assets.comfy.org/uploads/${known}.mp4`);
    expect(result).toEqual({
      poster: `https://media.comfy.org/hub-media/posters/${known}.jpg`,
      video: `https://media.comfy.org/hub-media/video/${known}.mp4`,
    });
  });

  it('finds the same asset under the other upstream path', () => {
    // Assets live under both /uploads/ and /templates/. Rebuilding the source
    // path from the id was a real bug in the generator's own verify pass.
    expect(hubMediaFor(`https://comfy-hub-assets.comfy.org/templates/${known}.mp4`)).not.toBeNull();
  });

  it('ignores a query string when reading the id', () => {
    expect(
      hubMediaFor(`https://comfy-hub-assets.comfy.org/uploads/${known}.mp4?v=2`)
    ).not.toBeNull();
  });

  it('returns null for an asset with no generated copy', () => {
    // The safe degradation: a workflow uploaded since the last run keeps its
    // upstream URL and the Cloudflare poster, rather than 404ing on ours.
    const unseen =
      'https://comfy-hub-assets.comfy.org/uploads/00000000-0000-0000-0000-000000000000.mp4';
    expect(hubMediaFor(unseen)).toBeNull();
  });

  it('returns null for a local thumbnail path', () => {
    expect(hubMediaFor('/workflows/thumbnails/flux.webp')).toBeNull();
  });

  it('carries a non-trivial number of assets', () => {
    // A manifest that emptied itself would make every lookup silently fall back.
    expect((generatedAssets as string[]).length).toBeGreaterThan(150);
  });
});

/**
 * The preload has to resolve to the SAME url the element renders, or the hero is
 * fetched twice, which is worse than not preloading it. Both helpers exist for
 * that reason, so the cases below pin the fallback rather than the happy path:
 * 27 of the catalog's videos have no generated copy, and before this they
 * preloaded nothing at all while the element painted a frame-transform poster.
 */
describe('hero preload resolvers', () => {
  const unseen = '00000000-0000-0000-0000-000000000000';
  const upstream = (id: string, ext: string) =>
    `https://comfy-hub-assets.comfy.org/uploads/${id}.${ext}`;

  it('preloads the generated poster for a detail hero that has one', () => {
    expect(detailHeroPreload(upstream(known, 'mp4'))).toBe(
      `https://media.comfy.org/hub-media/posters/${known}.jpg`
    );
  });

  it('falls back to the frame transform for a video with no generated copy', () => {
    const url = upstream(unseen, 'mp4');
    expect(detailHeroPreload(url)).toBe(getVideoFrameUrl(url));
    expect(detailHeroPreload(url)).toContain('cdn-cgi/media/mode=frame');
  });

  it('returns null for a hero that is neither generated nor a video', () => {
    expect(detailHeroPreload(upstream(unseen, 'webp'))).toBeNull();
    expect(detailHeroPreload(null)).toBeNull();
  });

  it('prefers the still when a landing hero has one', () => {
    // LandingHero renders the <img> branch here, so the still is what paints.
    const still = upstream(unseen, 'webp');
    expect(landingHeroPreload([still, upstream(known, 'mp4')])).toBe(still);
  });

  it('preloads the video poster when a landing hero is video-led', () => {
    // No still means LandingHero renders <video poster=...>, and that poster is
    // the LCP image. This is the case that previously preloaded nothing.
    expect(landingHeroPreload([upstream(known, 'mp4')])).toBe(
      `https://media.comfy.org/hub-media/posters/${known}.jpg`
    );
  });

  it('falls back to the frame transform for a video-led hero with no copy', () => {
    // The generated-poster branch above passes with or without the fallback, so
    // it cannot pin it. This one can: an ungenerated video is the only path that
    // reaches getVideoFrameUrl, and it is the majority of the 27 such assets.
    const url = upstream(unseen, 'mp4');
    expect(landingHeroPreload([url])).toBe(getVideoFrameUrl(url));
    expect(landingHeroPreload([url])).toContain('cdn-cgi/media/mode=frame');
  });

  it('returns null when a landing hero has nothing to paint', () => {
    expect(landingHeroPreload([])).toBeNull();
    expect(landingHeroPreload(undefined)).toBeNull();
    expect(landingHeroPreload(['track.mp3'])).toBeNull();
  });
});
