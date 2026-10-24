import { describe, expect, it } from 'vitest';
import { hubAssetUrl, hubMediaFor } from '../../src/lib/hub-media';
import assets from '../../src/data/hub-media-assets.json';

describe('assets we deliberately did not re-encode', () => {
  const upstream = (id: string) => `https://comfy-hub-assets.comfy.org/uploads/${id}.mp4`;

  it('leaves a dropped asset pointing upstream, untouched', () => {
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
