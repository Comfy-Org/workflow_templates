import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import SEOHead from '../../src/components/SEOHead.astro';
import { LANGUAGES } from '../../src/i18n/config';

async function render(pathname: string, props: Record<string, unknown> = {}) {
  const container = await AstroContainer.create();
  return container.renderToString(SEOHead, {
    props: { title: 'T', description: 'D', ...props },
    request: new Request(`https://comfy.org${pathname}`),
  });
}

describe('SEOHead rendered output', () => {
  it('declares the page language and the other locales', async () => {
    const html = await render('/ko/workflows/');
    expect(html).toContain('<meta property="og:locale" content="ko_KR">');
    expect(html).toContain('<meta property="og:locale:alternate" content="en_US">');
    expect(html).not.toContain('content="ko_KR"></meta>');
    const alternates = [...html.matchAll(/og:locale:alternate" content="([^"]+)"/g)].map(
      (m) => m[1]
    );
    expect(alternates).not.toContain('ko_KR');
    // Derived, not a literal: registering a locale should change this number,
    // and a hard-coded one silently rots the moment it does.
    expect(alternates).toHaveLength(Object.keys(LANGUAGES).length - 1);
  });

  it('emits no alternates for an English-only page', async () => {
    const html = await render('/workflows/use-cases/x/', { hreflangLocalized: false });
    expect(html).toContain('<meta property="og:locale" content="en_US">');
    expect(html).not.toContain('og:locale:alternate');
  });

  it('emits no robots meta by default', async () => {
    const html = await render('/ja/workflows/x/');
    expect(html).not.toContain('name="robots"');
  });

  it('emits max-video-preview:0 when the video preview is suppressed', async () => {
    const html = await render('/ja/workflows/x/', { suppressVideoPreview: true });
    expect(html).toContain('<meta name="robots" content="max-video-preview:0">');
  });

  it('merges noindex and max-video-preview:0 into one robots meta', async () => {
    const html = await render('/ja/workflows/x/', {
      noindex: true,
      suppressVideoPreview: true,
    });
    expect(html).toContain('<meta name="robots" content="noindex,follow,max-video-preview:0">');
    expect(html.match(/name="robots"/g)).toHaveLength(1);
  });

  it('keeps noindex,follow unchanged when the video preview is not suppressed', async () => {
    const html = await render('/ja/workflows/x/', { noindex: true });
    expect(html).toContain('<meta name="robots" content="noindex,follow">');
  });

  it('matches the hreflang cluster exactly', async () => {
    const html = await render('/ja/workflows/x/', { hreflangLocales: ['en', 'ja'] });
    const hreflangs = [...html.matchAll(/hreflang="([^"]+)"/g)].map((m) => m[1]);
    const ogLocales = [...html.matchAll(/og:locale(?::alternate)?" content="([^"]+)"/g)].map(
      (m) => m[1]
    );
    expect(hreflangs.sort()).toEqual(['en', 'ja', 'x-default']);
    expect(ogLocales.sort()).toEqual(['en_US', 'ja_JP']);
  });
});
