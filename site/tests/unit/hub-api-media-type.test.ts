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
