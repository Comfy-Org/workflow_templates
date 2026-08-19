/**
 * A listing card's media type must never be fabricated.
 *
 * `serializeIndexEntry` used to fall back to `'image'` whenever the hub index
 * omitted `mediaType`. That is not a default, it is an invention: on the live
 * index 174 of 616 entries carry no `mediaType`, and 89 of those are video
 * workflows ("Seedance2.5: Text to Video", "LTX-2.5: FLF2V"). Filing them as
 * images emptied /workflows/category/video/ and /workflows/category/3d/
 * completely, which in turn 404'd the localized variants of both, because the
 * locale routes 404 an empty result while the English routes render a blank page.
 *
 * The hub's tag vocabulary is phrase-shaped ("Image to Video", "Video Edit",
 * "Audio to Video"), so the match has to be substring, not equality: an equality
 * check sees only the bare "Video" tag and misses the rest. Order encodes the
 * OUTPUT medium, which is what a category page groups by, so "Audio to Video"
 * has to resolve to video rather than audio.
 */
import { describe, expect, it } from 'vitest';
import { serializeIndexEntry, type HubWorkflowTemplateEntry } from '../../src/lib/hub-api';

const entry = (tags: string[], mediaType?: string): HubWorkflowTemplateEntry =>
  ({
    name: 'n',
    shareId: 's',
    title: 't',
    tags,
    ...(mediaType ? { mediaType } : {}),
  }) as HubWorkflowTemplateEntry;

const typeOf = (tags: string[], mediaType?: string) =>
  serializeIndexEntry(entry(tags, mediaType), new Map()).mediaType;

describe('serializeIndexEntry media type', () => {
  it('keeps the declared media type when the index supplies one', () => {
    expect(typeOf(['Text to Video'], 'audio')).toBe('audio');
  });

  it('infers video from phrase-shaped tags, not just the bare tag', () => {
    // Real tag sets from the live index, all currently filed as images.
    expect(typeOf(['API', 'Image to Video'])).toBe('video');
    expect(typeOf(['API', 'Text to Video'])).toBe('video');
    expect(typeOf(['Video'])).toBe('video');
    expect(typeOf(['flf2v', 'Video'])).toBe('video');
    expect(typeOf(['Video Edit'])).toBe('video');
    expect(typeOf(['Video to Video'])).toBe('video');
  });

  it('resolves to the output medium when two media appear in one tag', () => {
    expect(typeOf(['API', 'Audio to Video'])).toBe('video');
  });

  it('counts animation as video', () => {
    // A separate branch from the video keyword, and the only reason the bare
    // "Animation" family of tags resolves at all.
    expect(typeOf(['Animation'])).toBe('video');
    expect(typeOf(['Image to Animation'])).toBe('video');
  });

  it('matches regardless of how the hub cases a tag', () => {
    // The index is authored by hand, so casing is not guaranteed. Dropping the
    // normalization would leave these filed as images with nothing failing.
    expect(typeOf(['VIDEO'])).toBe('video');
    expect(typeOf(['image to video'])).toBe('video');
    expect(typeOf(['AUDIO Editing'])).toBe('audio');
    expect(typeOf(['3d'])).toBe('3d');
  });

  it('infers audio and 3d', () => {
    expect(typeOf(['API', 'Audio'])).toBe('audio');
    expect(typeOf(['Text to Audio'])).toBe('audio');
    expect(typeOf(['Audio to Audio'])).toBe('audio');
    expect(typeOf(['3D'])).toBe('3d');
    expect(typeOf(['Image to 3D'])).toBe('3d');
  });

  it('falls back to image only when no medium is discernible', () => {
    expect(typeOf(['API', 'Text to Image'])).toBe('image');
    expect(typeOf([])).toBe('image');
    expect(typeOf(['LoRA', 'Character'])).toBe('image');
  });
});
