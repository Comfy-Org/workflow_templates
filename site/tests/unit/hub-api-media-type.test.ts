/**
 * A listing card's media type comes from the index, never from its tags.
 *
 * `mediaType` is backend-owned category state. Deriving it here from the tag
 * vocabulary would put category membership behind a frontend heuristic, so that
 * renaming a tag silently reclassifies a workflow. These tests exist to stop
 * that inference being reintroduced.
 *
 * Known consequence, tracked against the API rather than patched here: the live
 * index omits `mediaType` on 174 of 616 entries, 89 of which are video
 * workflows. Those fall to the `'image'` default and keep
 * /workflows/category/video/ and /3d/ empty in the locale routes until the
 * backend populates the field and makes it required.
 */
import { describe, expect, it } from 'vitest';
import {
  serializeIndexEntry,
  toTemplateData,
  type HubWorkflowTemplateEntry,
} from '../../src/lib/hub-api';

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
  it('uses what the index declares', () => {
    expect(typeOf([], 'video')).toBe('video');
    expect(typeOf([], 'audio')).toBe('audio');
    expect(typeOf([], '3d')).toBe('3d');
  });

  it('lets the declared value stand even when the tags disagree with it', () => {
    // 198 live entries declare 'image' while their tags read as video. The
    // declaration is the contract; disagreeing with it here is how the frontend
    // ends up owning classification.
    expect(typeOf(['Text to Video'], 'image')).toBe('image');
    expect(typeOf(['Text to Image'], 'video')).toBe('video');
  });

  it('never derives a media type from tags', () => {
    // The guard: every one of these reads as video, audio or 3d to a human, and
    // none of them may move the classification without a declared field.
    for (const tags of [
      ['Image to Video'],
      ['Video Edit'],
      ['Audio to Video'],
      ['Animation'],
      ['Text to Audio'],
      ['Image to 3D'],
    ]) {
      expect(typeOf(tags)).toBe('image');
    }
  });

  it('falls back to image when the index declares nothing', () => {
    expect(typeOf([])).toBe('image');
  });
});

/**
 * The detail path classifies separately from the index, via `inferMediaType`,
 * and its breadcrumb links straight to `/workflows/category/{mediaType}/`.
 *
 * That is the half that regressed: widening the tag match to substrings sent a
 * workflow tagged "Image to Video" to the video category, which holds no entries
 * now that classification comes from the index, so the link 404s in every locale
 * and renders empty in English. Exact match is what main shipped.
 */
describe('toTemplateData media type (the detail-page breadcrumb)', () => {
  const detail = (tagNames: string[], mediaType?: string) =>
    toTemplateData({
      share_id: 's',
      name: 'n',
      title: 't',
      tags: tagNames.map((name) => ({ name })),
      profile: { username: 'u' },
      metadata: mediaType ? { media_type: mediaType } : {},
    } as unknown as Parameters<typeof toTemplateData>[0]).mediaType;

  it('uses the declared media type when the detail payload carries one', () => {
    expect(detail(['Image to Video'], 'audio')).toBe('audio');
  });

  it('matches a whole tag, not a phrase containing one', () => {
    // Each of these reads as video to a human and must NOT resolve to video:
    // the breadcrumb would point at a category with nothing in it.
    expect(detail(['Image to Video'])).toBe('image');
    expect(detail(['Video Edit'])).toBe('image');
    expect(detail(['Audio to Video'])).toBe('image');
    expect(detail(['Image to 3D'])).toBe('image');
  });

  it('still resolves an exact medium tag, which is main behaviour', () => {
    expect(detail(['Video'])).toBe('video');
    expect(detail(['Animation'])).toBe('video');
    expect(detail(['Audio'])).toBe('audio');
    expect(detail(['3D'])).toBe('3d');
  });
});
