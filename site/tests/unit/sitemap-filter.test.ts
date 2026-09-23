import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it, afterEach, beforeEach } from 'vitest';
import {
  checkRenderedHtmlDirectives,
  createSitemapFilter,
  isSitemapUrlAllowed,
  __resetHtmlDirectiveCache,
} from '../../src/lib/sitemap-filter';

describe('sitemap-filter', () => {
  const defaultOptions = {
    distDir: null,
    indexableModelSlugs: new Set(['wan', 'flux']),
    hubCategories: ['image', 'video'],
    indexableUseCaseSlugs: new Set(['restore-old-photos']),
    indexableLocales: new Set(['zh', 'es', 'pt-BR']),
    creatorUsernames: new Set(['comfyui', 'purzbeats']),
    resolveWorkflowIndexable: (shareId: string, locale: string) => {
      // Mock: only 111111111111 is indexable in es, 222222222222 is held/noindex
      if (locale === 'es' && shareId === '111111111111') return true;
      if (locale === 'zh') return true;
      return false;
    },
  };

  beforeEach(() => {
    __resetHtmlDirectiveCache();
  });

  it('excludes OpenGraph image endpoints', () => {
    expect(isSitemapUrlAllowed('https://comfy.org/workflows/og.png', defaultOptions)).toBe(false);
    expect(isSitemapUrlAllowed('https://comfy.org/workflows/og/sample-image', defaultOptions)).toBe(
      false
    );
  });

  it('excludes legacy workflow URLs without a 12-hex share_id', () => {
    expect(
      isSitemapUrlAllowed('https://comfy.org/workflows/my-cool-workflow/', defaultOptions)
    ).toBe(false);
    expect(
      isSitemapUrlAllowed('https://comfy.org/es/workflows/my-cool-workflow/', defaultOptions)
    ).toBe(false);
  });

  it('includes English workflow URLs with a 12-hex share_id', () => {
    expect(
      isSitemapUrlAllowed('https://comfy.org/workflows/my-workflow-c0d1253e51dd/', defaultOptions)
    ).toBe(true);
  });

  it('handles URLs without trailing slash', () => {
    expect(
      isSitemapUrlAllowed('https://comfy.org/workflows/my-workflow-c0d1253e51dd', defaultOptions)
    ).toBe(true);
    // Unreviewed/held localized workflow without trailing slash must be excluded
    expect(
      isSitemapUrlAllowed('https://comfy.org/es/workflows/my-workflow-222222222222', defaultOptions)
    ).toBe(false);
  });

  it('handles relative URLs', () => {
    expect(isSitemapUrlAllowed('/workflows/my-workflow-c0d1253e51dd/', defaultOptions)).toBe(true);
    expect(isSitemapUrlAllowed('/es/workflows/my-workflow-222222222222/', defaultOptions)).toBe(
      false
    );
  });

  it('handles query parameters and hash fragments', () => {
    expect(
      isSitemapUrlAllowed(
        'https://comfy.org/workflows/my-workflow-c0d1253e51dd/?utm=1#section',
        defaultOptions
      )
    ).toBe(true);
    expect(
      isSitemapUrlAllowed(
        'https://comfy.org/es/workflows/my-workflow-222222222222/?utm=1',
        defaultOptions
      )
    ).toBe(false);
  });

  it('supports uppercase hex in share_id', () => {
    expect(
      isSitemapUrlAllowed('https://comfy.org/workflows/my-workflow-C0D1253E51DD/', defaultOptions)
    ).toBe(true);
  });

  it('excludes localized workflow URLs when the locale is not flipped indexable', () => {
    // 'ja' is not in defaultOptions.indexableLocales
    expect(
      isSitemapUrlAllowed(
        'https://comfy.org/ja/workflows/my-workflow-111111111111/',
        defaultOptions
      )
    ).toBe(false);
  });

  it('globally excludes any page under an unreviewed/non-indexable locale', () => {
    expect(isSitemapUrlAllowed('https://comfy.org/ja/workflows/', defaultOptions)).toBe(false);
    expect(
      isSitemapUrlAllowed('https://comfy.org/ja/workflows/category/image/', defaultOptions)
    ).toBe(false);
    expect(isSitemapUrlAllowed('https://comfy.org/ja/workflows/model/wan/', defaultOptions)).toBe(
      false
    );
  });

  it('handles case-insensitive locale prefixes like pt-br', () => {
    // pt-BR is in indexableLocales, test lowercase in URL
    expect(isSitemapUrlAllowed('https://comfy.org/pt-br/workflows/', defaultOptions)).toBe(true);
  });

  it('excludes localized workflow URLs when the workflow translation is held/non-indexable', () => {
    // 'es' is indexable, but shareId '222222222222' resolves to false
    expect(
      isSitemapUrlAllowed(
        'https://comfy.org/es/workflows/my-workflow-222222222222/',
        defaultOptions
      )
    ).toBe(false);
  });

  it('includes localized workflow URLs when the workflow translation is indexable', () => {
    // 'es' is indexable, and shareId '111111111111' resolves to true
    expect(
      isSitemapUrlAllowed(
        'https://comfy.org/es/workflows/my-workflow-111111111111/',
        defaultOptions
      )
    ).toBe(true);
  });

  it('allows creator profile pages when listed in creatorUsernames', () => {
    expect(isSitemapUrlAllowed('https://comfy.org/workflows/comfyui/', defaultOptions)).toBe(true);
    expect(isSitemapUrlAllowed('https://comfy.org/workflows/purzbeats/', defaultOptions)).toBe(
      true
    );
    // Non-creator, non-special, non-hex single segment is excluded as legacy redirect
    expect(
      isSitemapUrlAllowed('https://comfy.org/workflows/unknown-creator/', defaultOptions)
    ).toBe(false);
  });

  it('filters model pages based on indexableModelSlugs', () => {
    expect(isSitemapUrlAllowed('https://comfy.org/workflows/model/wan/', defaultOptions)).toBe(
      true
    );
    expect(
      isSitemapUrlAllowed('https://comfy.org/workflows/model/non-existent/', defaultOptions)
    ).toBe(false);
  });

  it('filters category pages based on hubCategories', () => {
    expect(isSitemapUrlAllowed('https://comfy.org/workflows/category/image/', defaultOptions)).toBe(
      true
    );
    expect(isSitemapUrlAllowed('https://comfy.org/workflows/category/3d/', defaultOptions)).toBe(
      false
    );
  });

  it('filters use-case pages based on indexableUseCaseSlugs', () => {
    expect(
      isSitemapUrlAllowed(
        'https://comfy.org/workflows/use-cases/restore-old-photos/',
        defaultOptions
      )
    ).toBe(true);
    expect(
      isSitemapUrlAllowed('https://comfy.org/workflows/use-cases/thin-use-case/', defaultOptions)
    ).toBe(false);
  });

  it('permits top-level and directory listing pages', () => {
    expect(isSitemapUrlAllowed('https://comfy.org/', defaultOptions)).toBe(true);
    expect(isSitemapUrlAllowed('https://comfy.org/workflows/', defaultOptions)).toBe(true);
    expect(isSitemapUrlAllowed('https://comfy.org/es/workflows/', defaultOptions)).toBe(true);
  });

  describe('checkRenderedHtmlDirectives', () => {
    let tmpDir: string;

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sitemap-filter-test-'));
      __resetHtmlDirectiveCache();
    });

    afterEach(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('excludes a page whose HTML contains meta robots noindex', () => {
      const pageDir = path.join(tmpDir, 'es', 'workflows', 'test-111111111111');
      fs.mkdirSync(pageDir, { recursive: true });
      fs.writeFileSync(
        path.join(pageDir, 'index.html'),
        `<!DOCTYPE html><html><head>
          <meta name="robots" content="noindex, follow">
          <link rel="canonical" href="https://comfy.org/es/workflows/test-111111111111/">
        </head><body></body></html>`
      );

      const allowed = checkRenderedHtmlDirectives(
        tmpDir,
        'https://comfy.org/es/workflows/test-111111111111/'
      );
      expect(allowed).toBe(false);

      expect(
        isSitemapUrlAllowed('https://comfy.org/es/workflows/test-111111111111/', {
          ...defaultOptions,
          distDir: tmpDir,
        })
      ).toBe(false);
    });

    it('excludes a page with inverted attribute order content before name="robots"', () => {
      const pageDir = path.join(tmpDir, 'es', 'workflows', 'test-111111111111');
      fs.mkdirSync(pageDir, { recursive: true });
      fs.writeFileSync(
        path.join(pageDir, 'index.html'),
        `<!DOCTYPE html><html><head>
          <meta content="noindex, follow" name="robots">
          <link rel="canonical" href="https://comfy.org/es/workflows/test-111111111111/">
        </head><body></body></html>`
      );

      expect(
        checkRenderedHtmlDirectives(tmpDir, 'https://comfy.org/es/workflows/test-111111111111/')
      ).toBe(false);
    });

    it('excludes a page with meta robots content="none"', () => {
      const pageDir = path.join(tmpDir, 'es', 'workflows', 'test-111111111111');
      fs.mkdirSync(pageDir, { recursive: true });
      fs.writeFileSync(
        path.join(pageDir, 'index.html'),
        `<!DOCTYPE html><html><head>
          <meta name="robots" content="none">
          <link rel="canonical" href="https://comfy.org/es/workflows/test-111111111111/">
        </head><body></body></html>`
      );

      expect(
        checkRenderedHtmlDirectives(tmpDir, 'https://comfy.org/es/workflows/test-111111111111/')
      ).toBe(false);
    });

    it('excludes a page with googlebot noindex', () => {
      const pageDir = path.join(tmpDir, 'es', 'workflows', 'test-111111111111');
      fs.mkdirSync(pageDir, { recursive: true });
      fs.writeFileSync(
        path.join(pageDir, 'index.html'),
        `<!DOCTYPE html><html><head>
          <meta name="googlebot" content="noindex">
          <link rel="canonical" href="https://comfy.org/es/workflows/test-111111111111/">
        </head><body></body></html>`
      );

      expect(
        checkRenderedHtmlDirectives(tmpDir, 'https://comfy.org/es/workflows/test-111111111111/')
      ).toBe(false);
    });

    it('excludes a page with meta http-equiv refresh redirect', () => {
      const pageDir = path.join(tmpDir, 'redirect-page');
      fs.mkdirSync(pageDir, { recursive: true });
      fs.writeFileSync(
        path.join(pageDir, 'index.html'),
        `<!DOCTYPE html><html><head>
          <meta http-equiv="refresh" content="0;url=/workflows/">
        </head><body></body></html>`
      );

      expect(checkRenderedHtmlDirectives(tmpDir, 'https://comfy.org/redirect-page/')).toBe(false);
    });

    it('excludes a page whose HTML canonical URL points to a different page (non-self canonical)', () => {
      const pageDir = path.join(tmpDir, 'es', 'workflows', 'test-111111111111');
      fs.mkdirSync(pageDir, { recursive: true });
      fs.writeFileSync(
        path.join(pageDir, 'index.html'),
        `<!DOCTYPE html><html><head>
          <link rel="canonical" href="https://comfy.org/workflows/test-111111111111/">
        </head><body></body></html>`
      );

      const allowed = checkRenderedHtmlDirectives(
        tmpDir,
        'https://comfy.org/es/workflows/test-111111111111/'
      );
      expect(allowed).toBe(false);

      expect(
        isSitemapUrlAllowed('https://comfy.org/es/workflows/test-111111111111/', {
          ...defaultOptions,
          distDir: tmpDir,
        })
      ).toBe(false);
    });

    it('handles relative canonical URLs', () => {
      const pageDir = path.join(tmpDir, 'es', 'workflows', 'test-111111111111');
      fs.mkdirSync(pageDir, { recursive: true });
      fs.writeFileSync(
        path.join(pageDir, 'index.html'),
        `<!DOCTYPE html><html><head>
          <link rel="canonical" href="/es/workflows/test-111111111111/">
        </head><body></body></html>`
      );

      const allowed = checkRenderedHtmlDirectives(
        tmpDir,
        'https://comfy.org/es/workflows/test-111111111111/'
      );
      expect(allowed).toBe(true);
    });

    it('allows a page with robots directive max-image-preview:none and prefixed attributes', () => {
      const pageDir = path.join(tmpDir, 'workflows', 'test-222222222222');
      fs.mkdirSync(pageDir, { recursive: true });
      fs.writeFileSync(
        path.join(pageDir, 'index.html'),
        `<!DOCTYPE html><html><head>
          <meta name="robots" content="index, follow, max-image-preview:none">
          <meta data-name="robots" content="noindex">
          <meta name="robots" data-content="noindex" content="index">
          <link rel="canonical" href="https://comfy.org/workflows/test-222222222222/">
        </head><body></body></html>`
      );

      const allowed = checkRenderedHtmlDirectives(
        tmpDir,
        'https://comfy.org/workflows/test-222222222222/'
      );
      expect(allowed).toBe(true);
    });

    it('excludes a page whose canonical URL has a different query string', () => {
      const pageDir = path.join(tmpDir, 'workflows', 'test-333333333333');
      fs.mkdirSync(pageDir, { recursive: true });
      fs.writeFileSync(
        path.join(pageDir, 'index.html'),
        `<!DOCTYPE html><html><head>
          <link rel="canonical" href="https://comfy.org/workflows/test-333333333333/?variant=1">
        </head><body></body></html>`
      );

      const allowed = checkRenderedHtmlDirectives(
        tmpDir,
        'https://comfy.org/workflows/test-333333333333/'
      );
      expect(allowed).toBe(false);
    });

    it('allows localhost self URL with production canonical in local test runs', () => {
      const pageDir = path.join(tmpDir, 'workflows', 'test-111111111111');
      fs.mkdirSync(pageDir, { recursive: true });
      fs.writeFileSync(
        path.join(pageDir, 'index.html'),
        `<!DOCTYPE html><html><head>
          <link rel="canonical" href="https://comfy.org/workflows/test-111111111111/">
        </head><body></body></html>`
      );

      const allowed = checkRenderedHtmlDirectives(
        tmpDir,
        'http://localhost:4321/workflows/test-111111111111/'
      );
      expect(allowed).toBe(true);
    });

    it('allows a page whose HTML is self-canonical and indexed', () => {
      const pageDir = path.join(tmpDir, 'es', 'workflows', 'test-111111111111');
      fs.mkdirSync(pageDir, { recursive: true });
      fs.writeFileSync(
        path.join(pageDir, 'index.html'),
        `<!DOCTYPE html><html><head>
          <link rel="canonical" href="https://comfy.org/es/workflows/test-111111111111/">
        </head><body></body></html>`
      );

      const allowed = checkRenderedHtmlDirectives(
        tmpDir,
        'https://comfy.org/es/workflows/test-111111111111/'
      );
      expect(allowed).toBe(true);

      expect(
        isSitemapUrlAllowed('https://comfy.org/es/workflows/test-111111111111/', {
          ...defaultOptions,
          distDir: tmpDir,
        })
      ).toBe(true);
    });
  });

  describe('createSitemapFilter', () => {
    it('creates a callable filter function', () => {
      const filter = createSitemapFilter(defaultOptions);
      expect(typeof filter).toBe('function');
      expect(filter('https://comfy.org/workflows/my-workflow-c0d1253e51dd/')).toBe(true);
      expect(filter('https://comfy.org/es/workflows/my-workflow-222222222222/')).toBe(false);
    });
  });
});
