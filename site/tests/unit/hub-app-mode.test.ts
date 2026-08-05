import { describe, expect, it } from 'vitest';
import { APP_MODE_SHARE_IDS, resolveIsApp } from '../../src/lib/hub-app-mode';

describe('resolveIsApp', () => {
  it('files a workflow published with default view "app" under Comfy Apps', () => {
    expect(resolveIsApp({ name: '69850664cf89', shareId: '69850664cf89' })).toBe(true);
  });

  it('honours the legacy .app name suffix', () => {
    expect(resolveIsApp({ name: 'utility_z_image_turbo_2k_upscaler.app' })).toBe(true);
  });

  it('leaves a workflow published as a node graph out', () => {
    expect(resolveIsApp({ name: 'e81f8eb0ee5f', shareId: 'e81f8eb0ee5f' })).toBe(false);
  });

  it('lets an isApp from the hub take precedence over the snapshot', () => {
    expect(resolveIsApp({ name: '69850664cf89', shareId: '69850664cf89', isApp: false })).toBe(
      false
    );
    expect(resolveIsApp({ name: 'plain-workflow', isApp: true })).toBe(true);
  });

  it('treats an entry with no share id and no .app name as a node graph', () => {
    expect(resolveIsApp({})).toBe(false);
  });
});

/**
 * Workflows known to be published as apps, kept as a regression guard so a
 * failed or partial snapshot refresh cannot silently drop them from the tab.
 */
const KNOWN_APPS: ReadonlyArray<readonly [string, string]> = [
  ['9f0b568bf8a1', 'Anime Generator'],
  ['8ce4aa90e8af', 'Clothes Changer'],
  ['f8cf4feac2e9', 'Expand Image'],
  ['c2aae816fe63', 'Face Swap'],
  ['fffa07892f17', 'Hairstyle Changer'],
  ['d70243b6fc64', 'Headshot Generator'],
  ['a09d65985659', 'Image Enhancer'],
  ['3515c5083027', 'Image to Video'],
  ['c1959fdc5642', 'Image Upscale'],
  ['a335e0968d76', 'Music Generator'],
  ['d5ce59e59ff3', 'Photo to Cartoon Style Caricature'],
  ['69850664cf89', 'Restore Old Photos'],
  ['3ef4de40106b', 'Song Generator'],
  ['90d086fef9e3', 'Tattoo Generator'],
  ['bed989744195', 'Video Face Swap'],
  ['0740bf78b7b6', 'Video Upscale'],
];

/** Templates that predate the snapshot and are matched by their `.app` suffix. */
const LEGACY_APP_TEMPLATES = ['b3bbbf217b89', '4724032fa666', 'd7677ac50371', '6a2b37d44146'];

describe('app mode snapshot', () => {
  it.each(KNOWN_APPS)('covers %s (%s)', (shareId) => {
    expect(APP_MODE_SHARE_IDS.has(shareId)).toBe(true);
  });

  it('omits a workflow that carries no app form', () => {
    expect(APP_MODE_SHARE_IDS.has('fe5600667e2c')).toBe(false);
  });

  it('still covers the templates matched by the legacy .app suffix', () => {
    for (const shareId of LEGACY_APP_TEMPLATES) {
      expect(APP_MODE_SHARE_IDS.has(shareId)).toBe(true);
    }
  });

  it('holds well-formed share ids', () => {
    for (const shareId of APP_MODE_SHARE_IDS) {
      expect(shareId).toMatch(/^[0-9a-f]{12}$/);
    }
  });
});
