/**
 * The sitemap's localized URLs must agree with what those pages say about
 * themselves.
 *
 * Localized directory routes are on-demand rendered, so the sitemap integration
 * never discovers them: it collects the pages the build emits as files. They are
 * listed by hand in astro.config.mjs, and that hand-written list drifted from the
 * gate the routes use, in both directions at once:
 *
 *   - every locale's listing root was advertised, including the nine that render
 *     `noindex` and canonical to English (sitemap said index, page said do not);
 *   - no launched locale's category/tag/model pages were advertised, though they
 *     self-canonical and invite indexing (page said index, sitemap never mentioned
 *     them).
 *
 * `listing-indexing.ts` exists to keep canonical, robots, hreflang and the
 * sitemap saying one thing. This asserts the fourth surface reads the same flag,
 * by checking the construction rule rather than a built sitemap, so it runs
 * without a full build and fails on the edit that would reintroduce the drift.
 */
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const CONFIG = fs.readFileSync(path.join(process.cwd(), 'astro.config.mjs'), 'utf-8');

describe('localized sitemap URLs', () => {
  it('builds the locale list from INDEXABLE_LOCALES, never from the full locale set', () => {
    const assignment = CONFIG.match(/const localeCustomPages = ([\s\S]*?);\n\nconst customPages/);
    expect(assignment, 'localeCustomPages assignment not found').not.toBeNull();
    const body = assignment![1];

    // The gate: a locale earns sitemap entries only once it is flipped indexable.
    expect(body).toContain('indexableLocales');
    // The regression: mapping every supported locale is what advertised the nine
    // gated roots that render noindex.
    expect(body).not.toContain('nonDefaultLocales');
    expect(body).not.toMatch(/\blocales\b\s*\./);
  });

  it('advertises every localized directory page type, not just the listing root', () => {
    const assignment = CONFIG.match(/const localeCustomPages = ([\s\S]*?);\n\nconst customPages/);
    const body = assignment![1];

    for (const segment of ['/category/', '/tag/', '/model/']) {
      expect(body, `localized ${segment} pages missing from the sitemap`).toContain(segment);
    }
  });

  it('gates localized model pages on the same content check English uses', () => {
    const assignment = CONFIG.match(/const localeCustomPages = ([\s\S]*?);\n\nconst customPages/);
    const body = assignment![1];

    // Model pages carry a second gate beyond the locale one: a family with no
    // passing landing content renders noindex in English too, so a locale must
    // not advertise what English withholds.
    expect(body).toContain('indexableModelSlugs');
  });

  it('lists English model pages by hand, because that route no longer prerenders', () => {
    // The model route is on-demand rendered so it can 301 variant slugs. The
    // sitemap integration only discovers built files, so the moment that route
    // stopped prerendering its URLs left the sitemap silently. They have to be
    // supplied as custom pages or the 11 indexable model URLs vanish.
    expect(CONFIG).toMatch(/const modelPages = [\s\S]*?indexableModelSlugs/);
    expect(CONFIG).toMatch(/const customPages = \[[^\]]*modelPages/);
  });

  it('leaves the default locale out, since English lives at the root', () => {
    const assignment = CONFIG.match(/const localeCustomPages = ([\s\S]*?);\n\nconst customPages/);
    const body = assignment![1];
    expect(body).toMatch(/!==\s*'en'/);
  });
});
