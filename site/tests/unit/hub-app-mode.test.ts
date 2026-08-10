import { describe, expect, it } from 'vitest';
import { APP_MODE_SHARE_IDS, resolveIsApp } from '../../src/lib/hub-app-mode';

// Drawn from the snapshot rather than pasted out of it, so these cover the rule
// instead of asserting that a data file still holds a particular row. An id
// legitimately unpublished by a refresh should not fail a test about resolution.
const [anAppShareId] = [...APP_MODE_SHARE_IDS];
const notAnAppShareId = 'ffffffffffff';

describe('resolveIsApp', () => {
  it('files a workflow in the snapshot under Comfy Apps', () => {
    expect(resolveIsApp({ shareId: anAppShareId })).toBe(true);
  });

  it('leaves a workflow published as a node graph out', () => {
    expect(APP_MODE_SHARE_IDS.has(notAnAppShareId)).toBe(false);
    expect(resolveIsApp({ shareId: notAnAppShareId })).toBe(false);
  });

  it('files a workflow the hub reports as an app under Comfy Apps', () => {
    expect(resolveIsApp({ name: 'plain-workflow', isApp: true })).toBe(true);
  });

  // The hub column is written at publish time, so everything published before it
  // existed reads false until the backfill runs. Letting that win would empty the
  // tab for the whole window between the field shipping and the backfill landing.
  it('does not let a hub false overrule the snapshot', () => {
    expect(resolveIsApp({ shareId: anAppShareId, isApp: false })).toBe(true);
  });

  // The suffix was the original guess and is wrong in both directions. The
  // snapshot reads extra.linearMode from every workflow, so it already covers the
  // apps that happen to be named this way.
  it('no longer treats a .app name as evidence on its own', () => {
    expect(resolveIsApp({ name: 'utility_z_image_turbo_2k_upscaler.app' })).toBe(false);
  });

  it('does not file the known .app false positive under Comfy Apps', () => {
    expect(resolveIsApp({ name: 'templates_all_in_one_image_edit_models.app' })).toBe(false);
  });

  it('treats an entry with neither signal as a node graph', () => {
    expect(resolveIsApp({})).toBe(false);
  });
});

describe('app mode snapshot', () => {
  // A floor rather than a list of ids. The refresh script aborts instead of
  // writing a short file, so this is the backstop for a snapshot committed after
  // a partial run: low enough that unpublishing a few apps does not fail it,
  // high enough that a truncated refresh does.
  it('holds enough workflows to be a real catalog pass', () => {
    expect(APP_MODE_SHARE_IDS.size).toBeGreaterThan(40);
  });

  it('holds well-formed share ids', () => {
    for (const shareId of APP_MODE_SHARE_IDS) {
      expect(shareId).toMatch(/^[0-9a-f]{12}$/);
    }
  });
});
