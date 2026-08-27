/**
 * The sitemap's hand-listed URLs must agree with what those pages say about
 * themselves.
 *
 * Localized directory routes and the English model route are on-demand rendered,
 * so `@astrojs/sitemap` never discovers them: it collects the pages the build
 * emits as files. They are supplied through `customPages`, and that hand-written
 * list had drifted from the gate the routes use, in both directions at once:
 *
 *   - every locale's listing root was advertised, including the nine that render
 *     `noindex` and canonical to English (sitemap said index, page said do not);
 *   - no launched locale's category/tag/model pages were advertised, though they
 *     self-canonical and invite indexing (page said index, sitemap never
 *     mentioned them).
 *
 * `listing-indexing.ts` exists to keep canonical, robots, hreflang and the
 * sitemap saying one thing; these lock the fourth surface to the same flag.
 */
import { describe, expect, it } from 'vitest';
import { buildCustomPages } from '../../src/lib/sitemap-custom-pages';

const base = {
  siteOrigin: 'https://comfy.org',
  creatorUsernames: ['comfyui'],
  indexableLocales: ['zh'],
  indexableModelSlugs: ['wan', 'flux'],
  tagSlugs: ['character', 'video'],
  categoryTypes: ['image', 'video', 'audio', '3d'],
};

describe('buildCustomPages', () => {
  it('advertises a locale only once it is flipped indexable', () => {
    const pages = buildCustomPages(base);

    expect(pages).toContain('https://comfy.org/zh/workflows/');
    // The regression: mapping every supported locale is what advertised the
    // gated roots that render noindex and canonical to English.
    expect(pages.some((url) => url.includes('/ja/'))).toBe(false);
    expect(pages.some((url) => url.includes('/es/'))).toBe(false);
  });

  it('advertises every localized directory page type, not just the listing root', () => {
    const pages = buildCustomPages(base);

    expect(pages).toContain('https://comfy.org/zh/workflows/category/video/');
    expect(pages).toContain('https://comfy.org/zh/workflows/tag/character/');
    expect(pages).toContain('https://comfy.org/zh/workflows/model/wan/');
  });

  it('lists all four category types', () => {
    const pages = buildCustomPages(base);

    for (const type of ['image', 'video', 'audio', '3d']) {
      expect(pages).toContain(`https://comfy.org/zh/workflows/category/${type}/`);
    }
  });

  it('lists English model pages, because that route no longer prerenders', () => {
    // The model route is on-demand rendered so it can 301 variant slugs. The
    // sitemap integration only discovers built files, so the moment that route
    // stopped prerendering its URLs left the sitemap silently.
    const pages = buildCustomPages(base);

    expect(pages).toContain('https://comfy.org/workflows/model/wan/');
    expect(pages).toContain('https://comfy.org/workflows/model/flux/');
  });

  it('never lets a locale advertise a model page English withholds', () => {
    // Model pages carry a second gate beyond the locale one: a family with no
    // passing landing content renders noindex in English too.
    const pages = buildCustomPages({ ...base, indexableModelSlugs: ['wan'] });

    expect(pages).toContain('https://comfy.org/zh/workflows/model/wan/');
    expect(pages.some((url) => url.endsWith('/workflows/model/flux/'))).toBe(false);
  });

  it('leaves the default locale out, since English lives at the root', () => {
    const pages = buildCustomPages({ ...base, indexableLocales: ['en', 'zh'] });

    expect(pages.some((url) => url.includes('/en/workflows'))).toBe(false);
  });

  it('emits no tag URLs at all when the hub manifest is missing', () => {
    // Guessing from the synced templates is what this replaced: those files are
    // the repo's own catalog, and four of their tag slugs match no hub workflow,
    // which the locale route answers with a 404. A sitemap that says nothing is
    // recoverable; one that advertises a 404 is the contradiction being fixed.
    const pages = buildCustomPages({ ...base, tagSlugs: [] });

    expect(pages.some((url) => url.includes('/workflows/tag/'))).toBe(false);
    expect(pages).toContain('https://comfy.org/zh/workflows/');
  });

  it('keeps creator pages and normalizes a trailing slash on the origin', () => {
    const pages = buildCustomPages({ ...base, siteOrigin: 'https://comfy.org/' });

    expect(pages).toContain('https://comfy.org/workflows/comfyui/');
    expect(pages.some((url) => url.includes('//workflows'))).toBe(false);
  });

  it('ends every URL in a trailing slash', () => {
    // The platform canonicalises requests to the slashed form, so a slashless
    // entry would advertise a URL that only ever answers with a redirect.
    for (const url of buildCustomPages(base)) {
      expect(url.endsWith('/'), `${url} has no trailing slash`).toBe(true);
    }
  });
});

describe('category gating', () => {
  it('advertises only the categories the hub index fills', () => {
    // The category route 404s a type with no matching workflows, exactly as the
    // tag route does, so an empty type must not reach the sitemap.
    const pages = buildCustomPages({ ...base, categoryTypes: ['image', 'audio'] });

    expect(pages).toContain('https://comfy.org/zh/workflows/category/image/');
    expect(pages).toContain('https://comfy.org/zh/workflows/category/audio/');
    expect(pages).not.toContain('https://comfy.org/zh/workflows/category/video/');
    expect(pages).not.toContain('https://comfy.org/zh/workflows/category/3d/');
  });

  it('advertises no category when the manifest is missing', () => {
    const pages = buildCustomPages({ ...base, categoryTypes: [] });

    expect(pages.some((url) => url.includes('/workflows/category/'))).toBe(false);
    expect(pages).toContain('https://comfy.org/zh/workflows/');
  });
});
