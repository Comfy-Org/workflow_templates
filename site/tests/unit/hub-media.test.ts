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
    expect(hubMediaFor(`https://comfy-hub-assets.comfy.org/templates/${known}.mp4`)).not.toBeNull();
  });

  it('ignores a query string when reading the id', () => {
    expect(
      hubMediaFor(`https://comfy-hub-assets.comfy.org/uploads/${known}.mp4?v=2`)
    ).not.toBeNull();
  });

  it('returns null for an asset with no generated copy', () => {
    const unseen =
      'https://comfy-hub-assets.comfy.org/uploads/00000000-0000-0000-0000-000000000000.mp4';
    expect(hubMediaFor(unseen)).toBeNull();
  });

  it('returns null for a local thumbnail path', () => {
    expect(hubMediaFor('/workflows/thumbnails/flux.webp')).toBeNull();
  });

  it('carries a non-trivial number of assets', () => {
    expect((generatedAssets as string[]).length).toBeGreaterThan(150);
  });
});

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
    expect(detailHeroPreload([upstream(unseen, 'webp')])).toBe(upstream(unseen, 'webp'));
  });

  it('preloads the still, not the original, for an animated WebP hero', () => {
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
    const still = upstream(unseen, 'webp');
    expect(landingHeroPreload([still, upstream(known, 'mp4')])).toBe(getStillImageUrl(still, 1280));
  });

  it('preloads the video poster when a landing hero is video-led', () => {
    expect(landingHeroPreload([upstream(known, 'mp4')])).toBe(
      `https://media.comfy.org/hub-media/posters/${known}.jpg`
    );
  });

  it('falls back to the frame transform for a video-led hero with no copy', () => {
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

describe('detailHeroPreload follows the variant branches', () => {
  const id = (n: string) => `https://comfy-hub-assets.comfy.org/uploads/${n}.webp`;
  const before = id('00000000-0000-0000-0000-000000000000');
  const after = id('11111111-1111-1111-1111-111111111111');
  const video = `https://comfy-hub-assets.comfy.org/uploads/${known}.mp4`;

  it("names the compare slider's second layer, which carries fetchpriority", () => {
    expect(detailHeroPreload([before, after], 'webp', 'compareSlider')).toBe(hubAssetUrl(after));
    expect(detailHeroPreload([before, after], 'webp', 'compareSlider')).not.toContain('anim=false');
  });

  it('names the original for hover dissolve, where fetchpriority stays first', () => {
    expect(heroPaintsAnimatedStill([before, after], 'hoverDissolve')).toBe(false);
    expect(detailHeroPreload([before, after], 'webp', 'hoverDissolve')).toBe(hubAssetUrl(before));
  });

  it('falls back to the animated branch when the variant has one thumbnail', () => {
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
    expect(detailHeroPreload([video, after], 'webp', 'compareSlider')).toBe(
      `https://media.comfy.org/hub-media/posters/${known}.jpg`
    );
  });

  it('will not preload a non-image second layer as an image', () => {
    expect(detailHeroPreload([before, video], 'webp', 'compareSlider')).not.toContain('.mp4');
  });

  it('has nothing to paint without thumbnails', () => {
    expect(heroPaintsAnimatedStill([], 'compareSlider')).toBe(false);
    expect(heroPaintsAnimatedStill(undefined)).toBe(false);
  });
});
