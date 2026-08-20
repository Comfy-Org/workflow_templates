/**
 * The footer switcher must never link a page that does not exist.
 *
 * Flipping zh to indexable made the switcher render on every hub page, including
 * the routes that have no localized variant, so the use-case pages and the two
 * index pages offered 中文 links to 404s in production. These lock the rule that
 * an English-only route gets no switcher.
 */
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { footerLanguageLinks, unprefixedPath } from '../../src/lib/i18n/footer-languages';

const ZH_ONLY = ['zh'] as const;

describe('footerLanguageLinks', () => {
  it('offers the rolled-out languages on a localized route', () => {
    const links = footerLanguageLinks('/workflows/', { indexableLocales: ZH_ONLY });

    expect(links.map((l) => l.locale)).toEqual(['en', 'zh']);
    expect(links.map((l) => l.url)).toEqual(['/workflows/', '/zh/workflows/']);
    expect(links.find((l) => l.locale === 'en')?.isCurrent).toBe(true);
  });

  it('marks the current language when already on a localized page', () => {
    const links = footerLanguageLinks('/zh/workflows/', { indexableLocales: ZH_ONLY });

    expect(links.find((l) => l.locale === 'zh')?.isCurrent).toBe(true);
    expect(links.find((l) => l.locale === 'en')?.url).toBe('/workflows/');
  });

  it('offers nothing on a route with no localized variant', () => {
    // The regression: these paths render the footer but have no [locale] route.
    for (const pathname of [
      '/workflows/use-cases/',
      '/workflows/use-cases/ai-headshot-generator/',
      '/workflows/model/',
    ]) {
      expect(
        footerLanguageLinks(pathname, { localized: false, indexableLocales: ZH_ONLY }),
        pathname
      ).toEqual([]);
    }
  });

  it('offers nothing before any language is rolled out', () => {
    expect(footerLanguageLinks('/workflows/', { indexableLocales: [] })).toEqual([]);
  });

  it('rebuilds alternates from the un-prefixed path', () => {
    expect(unprefixedPath('/zh/workflows/tag/character/', 'zh')).toBe('/workflows/tag/character/');
    expect(unprefixedPath('/workflows/', 'en')).toBe('/workflows/');
    expect(unprefixedPath('/zh', 'zh')).toBe('/');
  });
});

/**
 * A guard against forgetting: a route that tells HreflangTags it has no
 * localized variants must not then let the footer advertise them. Keyed off the
 * existing declaration so the two can never drift apart.
 */
describe('English-only routes', () => {
  const SRC = path.join(process.cwd(), 'src');

  function astroFilesIn(dir: string): string[] {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return astroFilesIn(full);
      return entry.name.endsWith('.astro') ? [full] : [];
    });
  }

  const declaringFiles = astroFilesIn(SRC)
    .map((file) => ({ file: path.relative(SRC, file), source: fs.readFileSync(file, 'utf-8') }))
    .filter(({ source }) => source.includes('hreflangLocalized={false}'));

  it('finds the routes it is meant to be checking', () => {
    // Without this the suite passes vacuously if the prop is ever renamed.
    expect(declaringFiles.length).toBeGreaterThan(0);
  });

  it('never render a language switcher', () => {
    for (const { file, source } of declaringFiles) {
      if (!source.includes('<SiteFooter')) continue;
      expect(source, `${file} renders SiteFooter without localized={false}`).toMatch(
        /<SiteFooter[^>]*localized={false}/
      );
    }
  });
});
