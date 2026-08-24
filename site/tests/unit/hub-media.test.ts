import { describe, expect, it } from 'vitest';
import { hubMediaFor } from '../../src/lib/hub-media';
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
    expect(hubMediaFor(`https://comfy-hub-assets.comfy.org/uploads/${known}.mp4?v=2`)).not.toBeNull();
  });

  it('returns null for an asset with no generated copy', () => {
    // The safe degradation: a workflow uploaded since the last run keeps its
    // upstream URL and the Cloudflare poster, rather than 404ing on ours.
    const unseen = 'https://comfy-hub-assets.comfy.org/uploads/00000000-0000-0000-0000-000000000000.mp4';
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
