import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import ThumbnailDisplay from '../../src/components/ThumbnailDisplay.astro';

const PLACEHOLDER =
  'https://comfy-hub-assets.comfy.org/uploads/850ff161-2547-4fce-a9c3-7835eeeedcce.mp4';
const REAL_VIDEO =
  'https://comfy-hub-assets.comfy.org/uploads/00000000-1111-2222-3333-444444444444.mp4';

async function render(thumbnails: string[]) {
  const container = await AstroContainer.create();
  return container.renderToString(ThumbnailDisplay, {
    props: { thumbnails, title: 'Demo workflow' },
  });
}

describe('ThumbnailDisplay — placeholder video', () => {
  it('renders a poster <img>, not a <video>, for the shared placeholder clip', async () => {
    const html = await render([PLACEHOLDER]);
    expect(html).not.toContain('<video');
    expect(html).toContain('<img');
    // still classified as a video slot (keeps the video-thumb layout)
    expect(html).toContain('video-thumb');
  });

  it('still renders a <video> for a real preview clip', async () => {
    const html = await render([REAL_VIDEO]);
    expect(html).toContain('<video');
  });
});
