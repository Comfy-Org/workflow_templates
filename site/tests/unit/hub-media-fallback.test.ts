import { describe, expect, it } from 'vitest';
import { hubAssetUrl, hubMediaFor } from '../../src/lib/hub-media';
import assets from '../../src/data/hub-media-assets.json';

/**
 * Some assets are deliberately NOT re-encoded: where reaching the quality floor
 * saves less than 25%, shipping a second copy trades visible quality for almost
 * no bytes. Those must keep their upstream URL.
 *
 * This is the case that has to keep working, because the failure is silent: a
 * card would point at a bucket path that does not exist and render nothing.
 */
describe('assets we deliberately did not re-encode', () => {
  const upstream = (id: string) => `https://comfy-hub-assets.comfy.org/uploads/${id}.mp4`;

  it('leaves a dropped asset pointing upstream, untouched', () => {
    // Asserts the RULE - any id absent from the manifest resolves to its
    // original - rather than naming a real dropped asset. An earlier version
    // pinned one, and it went stale the moment that file was reviewed and
    // shipped. A synthetic id can never join the manifest, and the assertion
    // below proves it has not.
    const dropped = '00000000-1111-2222-3333-444444444444';
    expect(assets).not.toContain(dropped);
    expect(hubMediaFor(upstream(dropped))).toBeNull();
    expect(hubAssetUrl(upstream(dropped))).toBe(upstream(dropped));
  });

  it('still rewrites an asset we did re-encode', () => {
    const kept = (assets as string[])[0];
    expect(hubAssetUrl(upstream(kept))).toBe(`https://media.comfy.org/hub-media/video/${kept}.mp4`);
  });

  it('leaves an asset nobody has ever processed alone', () => {
    const unseen = '00000000-0000-0000-0000-000000000000';
    expect(hubAssetUrl(upstream(unseen))).toBe(upstream(unseen));
  });
});
