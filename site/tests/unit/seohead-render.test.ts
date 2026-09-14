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

  it('matches the hreflang cluster exactly', async () => {
    const html = await render('/ja/workflows/x/', { hreflangLocales: ['en', 'ja'] });
    const hreflangs = [...html.matchAll(/hreflang="([^"]+)"/g)].map((m) => m[1]);
    const ogLocales = [...html.matchAll(/og:locale(?::alternate)?" content="([^"]+)"/g)].map(
      (m) => m[1]
    );
    expect(hreflangs.sort()).toEqual(['en', 'ja', 'x-default']);
    expect(ogLocales.sort()).toEqual(['en_US', 'ja_JP']);
  });

  it('renders matching self-canonical and hreflang alternates for localized creator profiles (jms)', async () => {
    const examples = [
      {
        path: '/workflows/jms/',
        locale: 'en',
        expectedCanonical: 'https://comfy.org/workflows/jms/',
      },
      {
        path: '/zh/workflows/jms/',
        locale: 'zh',
        expectedCanonical: 'https://comfy.org/zh/workflows/jms/',
      },
      {
        path: '/ja/workflows/jms/',
        locale: 'ja',
        expectedCanonical: 'https://comfy.org/ja/workflows/jms/',
      },
      {
        path: '/fr/workflows/jms/',
        locale: 'fr',
        expectedCanonical: 'https://comfy.org/fr/workflows/jms/',
      },
      {
        path: '/tr/workflows/jms/',
        locale: 'tr',
        expectedCanonical: 'https://comfy.org/tr/workflows/jms/',
      },
    ];

    for (const { path, locale, expectedCanonical } of examples) {
      const html = await render(path, {
        canonicalUrl: expectedCanonical,
        hreflangBasePath: '/workflows/jms/',
        hreflangLocales: ['en', 'zh', 'ja', 'fr', 'tr'],
      });

      expect(html).toContain(`<link rel="canonical" href="${expectedCanonical}">`);
      if (locale !== 'en') {
        expect(html).toContain(
          `<link rel="alternate" hreflang="${locale}" href="${expectedCanonical}">`
        );
      }
      expect(html).toContain(
        '<link rel="alternate" hreflang="x-default" href="https://comfy.org/workflows/jms/">'
      );
      expect(html).not.toContain('name="robots" content="noindex');
    }
  });
});
