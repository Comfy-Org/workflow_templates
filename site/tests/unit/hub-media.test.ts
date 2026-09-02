import { describe, expect, it } from 'vitest';
import {
  HERO_STILL_WIDTH,
  detailHeroPreload,
  heroPaintsAnimatedStill,
  hubAssetUrl,
  hubMediaFor,
  landingHeroPreload,
} from '../../src/lib/hub-media';
import { getStillImageUrl, getVideoFrameUrl } from '../../src/lib/video-thumbnail';
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
    expect(detailHeroPreload([upstream(known, 'mp4')])).toBe(
      `https://media.comfy.org/hub-media/posters/${known}.jpg`
    );
  });

  it('falls back to the frame transform for a video with no generated copy', () => {
    const url = upstream(unseen, 'mp4');
    expect(detailHeroPreload([url])).toBe(getVideoFrameUrl(url));
    expect(detailHeroPreload([url])).toContain('cdn-cgi/media/mode=frame');
  });

  it('preloads the original still when no copy was generated', () => {
    // ThumbnailDisplay renders the upstream url for these, so there IS an LCP
    // image to fetch early. Returning null here meant every asset left out of
    // the image manifest - the ones saving under 15%, and every animated WebP -
    // painted a hero that was never preloaded.
    expect(detailHeroPreload([upstream(unseen, 'webp')])).toBe(upstream(unseen, 'webp'));
  });

  it('preloads the still, not the original, for an animated WebP hero', () => {
    // The measured case: a 350x350, 52-frame, 1,870 KB animated WebP was the
    // LCP element at 16.7 s. ThumbnailDisplay paints the Cloudflare still and
    // swaps the animation in after load, so the preload has to name the still
    // or the page fetches both. 640 is mirrored from HERO_STILL_WIDTH there.
    const url = upstream(unseen, 'webp');
    expect(detailHeroPreload([url], 'webp')).toBe(getStillImageUrl(url, HERO_STILL_WIDTH));
    expect(detailHeroPreload([url], 'webp')).toContain('anim=false');
  });

  it('preloads nothing for an audio hero, which paints an icon', () => {
    expect(detailHeroPreload([upstream(unseen, 'mp3')])).toBeNull();
    expect(detailHeroPreload(null)).toBeNull();
    expect(detailHeroPreload([])).toBeNull();
  });

  it('prefers the still when a landing hero has one, sized at the edge', () => {
    // LandingHero renders the <img> branch here, so the still is what paints.
    // With no generated copy it is sized by Cloudflare rather than shipped at
    // full size: measured 604,696 -> 35,612 bytes on the real use-case hero.
    const still = upstream(unseen, 'webp');
    expect(landingHeroPreload([still, upstream(known, 'mp4')])).toBe(getStillImageUrl(still, 1280));
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

/**
 * The still is only what the page paints when ThumbnailDisplay actually reaches
 * its animated-thumb branch. `compareSlider` and `hoverDissolve` are checked
 * first there and win whenever a second thumbnail exists.
 *
 * 45 pages in the live catalog were in that state. Each preloaded an `anim=false`
 * still at `fetchpriority="high"` that the slider never rendered, in front of the
 * multi-megabyte images it did - verified on `api_wan2_7_video_edit` in the PR
 * preview: 19 KB preloaded, 1,892 KB and 2,079 KB painted, neither preloaded.
 */
describe('detailHeroPreload follows the variant branches', () => {
  const id = (n: string) => `https://comfy-hub-assets.comfy.org/uploads/${n}.webp`;
  const before = id('00000000-0000-0000-0000-000000000000');
  const after = id('11111111-1111-1111-1111-111111111111');

  it('names the compare slider\'s "After" layer, which carries fetchpriority', () => {
    // ThumbnailDisplay renders `secondarySrc` first with `fetchpriority`, and
    // clips `primarySrc` over its left half. Preloading the first would promote
    // the lower-priority layer ahead of the one that is the hero.
    expect(detailHeroPreload([before, after], 'webp', 'compareSlider')).toBe(hubAssetUrl(after));
    expect(detailHeroPreload([before, after], 'webp', 'compareSlider')).not.toContain('anim=false');
  });

  it('never asks for a still the compare slider will not paint', () => {
    expect(heroPaintsAnimatedStill([before, after], 'compareSlider')).toBe(false);
    expect(heroPaintsAnimatedStill([before, after], 'hoverDissolve')).toBe(false);
  });

  it('names the original for hover dissolve, where fetchpriority stays first', () => {
    expect(detailHeroPreload([before, after], 'webp', 'hoverDissolve')).toBe(hubAssetUrl(before));
  });

  it('falls back to the animated branch when the variant has one thumbnail', () => {
    // Both variants need a second image to win; with one, ThumbnailDisplay drops
    // through to the animated branch and the still IS what renders.
    expect(heroPaintsAnimatedStill([before], 'compareSlider')).toBe(true);
    expect(detailHeroPreload([before], 'webp', 'compareSlider')).toBe(
      getStillImageUrl(before, HERO_STILL_WIDTH)
    );
  });

  it('leaves every other variant on the still path', () => {
    for (const variant of [undefined, null, '', 'zoomHover', 'hoverZoom']) {
      expect(heroPaintsAnimatedStill([before, after], variant)).toBe(true);
      expect(detailHeroPreload([before, after], 'webp', variant)).toBe(
        getStillImageUrl(before, HERO_STILL_WIDTH)
      );
    }
  });

  it('keeps the video branch ahead of the variant branches', () => {
    // ThumbnailDisplay checks `isVideo` on the PRIMARY before any variant, so a
    // video-led compare slider still paints - and preloads - its poster.
    const video = `https://comfy-hub-assets.comfy.org/uploads/${known}.mp4`;
    expect(detailHeroPreload([video, after], 'webp', 'compareSlider')).toBe(
      `https://media.comfy.org/hub-media/posters/${known}.jpg`
    );
  });

  it('will not preload a non-image second layer as an image', () => {
    const video = `https://comfy-hub-assets.comfy.org/uploads/${known}.mp4`;
    expect(detailHeroPreload([before, video], 'webp', 'compareSlider')).not.toContain('.mp4');
  });

  it('has nothing to paint without thumbnails', () => {
    expect(heroPaintsAnimatedStill([], 'compareSlider')).toBe(false);
    expect(heroPaintsAnimatedStill(undefined)).toBe(false);
  });

  it('exports the width both sides ask for', () => {
    // The preload and ThumbnailDisplay read this one constant; two copies of the
    // number would be two chances to drift into two separate downloads.
    expect(HERO_STILL_WIDTH).toBe(640);
  });
});
