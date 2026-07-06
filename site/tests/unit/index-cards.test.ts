import { describe, expect, it } from 'vitest';
import type { SerializedTemplate } from '../../src/lib/hub-api';
import { buildTemplateItemListEntries } from '../../src/lib/workflow-pages/index-cards';

/** Minimal SerializedTemplate for list-entry tests; override only what matters. */
function template(overrides: Partial<SerializedTemplate>): SerializedTemplate {
  return {
    name: 'flux_schnell',
    shareId: 'abc123',
    title: 'Flux Schnell',
    description: '',
    mediaType: 'image',
    tags: [],
    models: [],
    logos: [],
    usage: 0,
    date: '',
    thumbnails: [],
    username: '',
    creatorDisplayName: '',
    creatorAvatarUrl: '',
    isApp: false,
    ...overrides,
  };
}

describe('buildTemplateItemListEntries', () => {
  it('maps templates to positioned, absolute detail-page entries', () => {
    const entries = buildTemplateItemListEntries([
      template({ name: 'flux_schnell', shareId: 'abc123', title: 'Flux Schnell' }),
      template({ name: 'qwen_edit', shareId: 'def456', title: 'Qwen Edit' }),
    ]);
    expect(entries).toEqual([
      { name: 'Flux Schnell', url: 'https://comfy.org/workflows/flux_schnell-abc123/', image: undefined },
      { name: 'Qwen Edit', url: 'https://comfy.org/workflows/qwen_edit-def456/', image: undefined },
    ]);
  });

  it('resolves a still thumbnail to an absolute image URL and skips videos', () => {
    const cdn = 'https://comfy-hub-assets.comfy.org/templates/still.png';
    const [entry] = buildTemplateItemListEntries([
      template({ thumbnails: ['https://comfy-hub-assets.comfy.org/uploads/clip.mp4', cdn] }),
    ]);
    expect(entry.image).toBe(cdn);
  });

  it('locale-prefixes the detail URL for a non-default locale', () => {
    const [entry] = buildTemplateItemListEntries(
      [template({ name: 'flux_schnell', shareId: 'abc123' })],
      'ja'
    );
    expect(entry.url).toBe('https://comfy.org/ja/workflows/flux_schnell-abc123/');
  });

  it('skips a template with no name or shareId (no derivable detail URL)', () => {
    const entries = buildTemplateItemListEntries([
      template({ name: '', shareId: '' }),
      template({ name: 'flux_schnell', shareId: 'abc123' }),
    ]);
    expect(entries).toHaveLength(1);
    expect(entries[0].name).toBe('Flux Schnell');
  });
});
