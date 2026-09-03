import { describe, expect, it } from 'vitest';
import type { SerializedTemplate } from '../../src/lib/hub-api';
import { buildTemplateItemListEntries } from '../../src/lib/workflow-pages/item-list';

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
      {
        name: 'Flux Schnell',
        url: 'https://comfy.org/workflows/flux_schnell-abc123/',
        image: undefined,
        itemType: 'CreativeWork',
      },
      {
        name: 'Qwen Edit',
        url: 'https://comfy.org/workflows/qwen_edit-def456/',
        image: undefined,
        itemType: 'CreativeWork',
      },
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

  it('returns an empty list for empty input', () => {
    expect(buildTemplateItemListEntries([])).toEqual([]);
  });

  it('keeps a video-only template but omits its image', () => {
    const [entry] = buildTemplateItemListEntries([
      template({ thumbnails: ['https://comfy-hub-assets.comfy.org/uploads/clip.mp4'] }),
    ]);
    expect(entry.image).toBeUndefined();
    expect(entry.url).toBe('https://comfy.org/workflows/flux_schnell-abc123/');
  });

  it('still emits a template with no name, falling back to shareId for the slug', () => {
    const [entry] = buildTemplateItemListEntries([
      template({ name: '', shareId: 'abc123', title: 'Untitled' }),
    ]);
    expect(entry.name).toBe('Untitled');
    expect(entry.url).toBe('https://comfy.org/workflows/abc123-abc123/');
  });

  it('skips a template with no name or shareId (no derivable detail URL)', () => {
    const entries = buildTemplateItemListEntries([
      template({ name: '', shareId: '' }),
      template({ name: 'flux_schnell', shareId: 'abc123' }),
    ]);
    expect(entries).toHaveLength(1);
    expect(entries[0].name).toBe('Flux Schnell');
  });

  it('populates keywords and creator object when metadata is present', () => {
    const entries = buildTemplateItemListEntries([
      template({
        name: 'full_featured',
        shareId: 'xyz789',
        title: 'Full Featured Workflow',
        tags: ['Video', 'Animation'],
        models: ['Wan Animate 2', 'SDXL'],
        username: 'animator_pro',
        creatorDisplayName: 'Animator Pro',
      }),
    ]);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      name: 'Full Featured Workflow',
      url: 'https://comfy.org/workflows/full_featured-xyz789/',
      itemType: 'CreativeWork',
      keywords: 'Video, Animation, Wan Animate 2, SDXL',
      creator: {
        '@type': 'Person',
        name: 'Animator Pro',
        url: 'https://comfy.org/workflows/animator_pro/',
      },
    });
  });
});
