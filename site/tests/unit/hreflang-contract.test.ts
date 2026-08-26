import { describe, expect, it } from 'vitest';
import {
  checkHreflangContract,
  parseAlternates,
  parseCanonical,
  parseNoindex,
  pathForHref,
  type Alternate,
  type RenderedPage,
} from '../../scripts/hreflang-contract';

const ORIGIN = 'https://comfy.org';

function alt(hreflang: string, pathname: string): Alternate {
  return { hreflang, href: `${ORIGIN}${pathname}` };
}

function page(
  pathname: string,
  alternates: Alternate[],
  overrides: Partial<RenderedPage> = {}
): RenderedPage {
  return {
    path: pathname,
    alternates,
    canonical: `${ORIGIN}${pathname}`,
    noindex: false,
    ...overrides,
  };
}

/** The shape SEOHead + HreflangTags actually emit for a two-locale cluster. */
function reciprocalPair(): RenderedPage[] {
  const cluster = [alt('en', '/workflows/'), alt('ko', '/ko/workflows/')];
  const xDefault = alt('x-default', '/workflows/');
  return [
    page('/workflows/', [...cluster, xDefault]),
    page('/ko/workflows/', [...cluster, xDefault]),
  ];
}

describe('parsing built HTML', () => {
  it('reads hreflang alternates and lowercases the language tag', () => {
    const html = `<link rel="alternate" hreflang="zh-TW" href="${ORIGIN}/zh-TW/workflows/">`;
    expect(parseAlternates(html)).toEqual([
      { hreflang: 'zh-tw', href: `${ORIGIN}/zh-TW/workflows/` },
    ]);
  });

  it('ignores rel="alternate" tags that carry no hreflang', () => {
    const html = '<link rel="alternate" type="application/rss+xml" href="/rss.xml">';
    expect(parseAlternates(html)).toEqual([]);
  });

  it('reads the canonical and the robots noindex', () => {
    const html = `<link rel="canonical" href="${ORIGIN}/ko/workflows/"><meta name="robots" content="noindex, follow">`;
    expect(parseCanonical(html)).toBe(`${ORIGIN}/ko/workflows/`);
    expect(parseNoindex(html)).toBe(true);
  });

  it('treats a page with no robots meta as indexable', () => {
    expect(parseNoindex('<meta name="robots" content="index, follow">')).toBe(false);
    expect(parseNoindex('<title>x</title>')).toBe(false);
  });
});

describe('pathForHref', () => {
  it('returns a trailing-slashed site path', () => {
    expect(pathForHref(`${ORIGIN}/ko/workflows`, ORIGIN)).toBe('/ko/workflows/');
  });

  it('drops query and fragment', () => {
    expect(pathForHref(`${ORIGIN}/workflows/?a=1#b`, ORIGIN)).toBe('/workflows/');
  });

  it('rejects another origin rather than treating it as a path', () => {
    expect(pathForHref('https://staging.comfy.org/ko/workflows/', ORIGIN)).toBeNull();
    // A prefix match alone must not pass: this host merely starts with the origin.
    expect(pathForHref('https://comfy.org.evil.test/ko/', ORIGIN)).toBeNull();
  });
});

describe('checkHreflangContract', () => {
  it('accepts a reciprocal cluster', () => {
    expect(checkHreflangContract(reciprocalPair(), ORIGIN)).toEqual([]);
  });

  it('accepts an English-only page that emits x-default alone', () => {
    const pages = [page('/use-cases/upscaling/', [alt('x-default', '/use-cases/upscaling/')])];
    expect(checkHreflangContract(pages, ORIGIN)).toEqual([]);
  });

  it('catches a one-way declaration', () => {
    const [en] = reciprocalPair();
    const ko = page('/ko/workflows/', [
      alt('ko', '/ko/workflows/'),
      alt('x-default', '/workflows/'),
    ]);
    const problems = checkHreflangContract([en, ko], ORIGIN);
    expect(problems).toEqual(['/workflows/: hreflang "ko" (/ko/workflows/) does not link back']);
  });

  it('does not accept x-default as the return leg', () => {
    const en = page('/workflows/', [alt('en', '/workflows/'), alt('ko', '/ko/workflows/')]);
    // Points home, but only as a fallback declaration, not as a cluster member.
    const ko = page('/ko/workflows/', [
      alt('ko', '/ko/workflows/'),
      alt('x-default', '/workflows/'),
    ]);
    expect(checkHreflangContract([en, ko], ORIGIN)).toContain(
      '/workflows/: hreflang "ko" (/ko/workflows/) does not link back'
    );
  });

  it('catches an alternate pointing at a page that was never built', () => {
    const pages = reciprocalPair();
    pages[0].alternates.push(alt('ja', '/ja/workflows/'));
    expect(checkHreflangContract(pages, ORIGIN)).toEqual([
      '/workflows/: hreflang "ja" points at unbuilt /ja/workflows/',
    ]);
  });

  it('catches an alternate pointing at a noindexed page', () => {
    const [en, ko] = reciprocalPair();
    ko.noindex = true;
    expect(checkHreflangContract([en, ko], ORIGIN)).toEqual([
      '/workflows/: hreflang "ko" points at noindexed /ko/workflows/',
    ]);
  });

  it('catches a repeated hreflang value', () => {
    const [en, ko] = reciprocalPair();
    en.alternates.push(alt('ko', '/ko/workflows/'));
    expect(checkHreflangContract([en, ko], ORIGIN)).toEqual([
      '/workflows/: duplicate hreflang "ko"',
    ]);
  });

  it('catches an alternate on the wrong origin', () => {
    const pages = [
      page('/workflows/', [
        alt('en', '/workflows/'),
        { hreflang: 'ko', href: 'https://staging.comfy.org/ko/workflows/' },
      ]),
    ];
    expect(checkHreflangContract(pages, ORIGIN)).toEqual([
      '/workflows/: hreflang "ko" is off-origin: https://staging.comfy.org/ko/workflows/',
    ]);
  });

  it('catches a page that advertises a cluster it is not a member of', () => {
    const en = page('/workflows/', [alt('en', '/workflows/'), alt('ko', '/ko/workflows/')]);
    const ko = page('/ko/workflows/', [alt('en', '/workflows/')]);
    expect(checkHreflangContract([en, ko], ORIGIN)).toEqual([
      '/ko/workflows/: emits alternates but none point back at itself',
    ]);
  });

  it('catches a canonical left pointing at a preview origin', () => {
    const pages = reciprocalPair();
    pages[1].canonical = 'https://comfy-preview.vercel.app/ko/workflows/';
    expect(checkHreflangContract(pages, ORIGIN)).toEqual([
      '/ko/workflows/: canonical is not on https://comfy.org: https://comfy-preview.vercel.app/ko/workflows/',
    ]);
  });

  it('ignores the cluster a gated noindex page emits', () => {
    // The shape production actually ships: a locale detail page held back from the
    // index still renders alternates for the locales that are live, and none of
    // them name it back. Google drops the page and its annotations with it.
    const en = page('/workflows/x/', [alt('en', '/workflows/x/'), alt('ja', '/ja/workflows/x/')]);
    const ja = page('/ja/workflows/x/', [
      alt('en', '/workflows/x/'),
      alt('ja', '/ja/workflows/x/'),
    ]);
    const ru = page(
      '/ru/workflows/x/',
      [alt('en', '/workflows/x/'), alt('ja', '/ja/workflows/x/')],
      { noindex: true, canonical: `${ORIGIN}/workflows/x/` }
    );
    expect(checkHreflangContract([en, ja, ru], ORIGIN)).toEqual([]);
  });

  it('still reports an indexable page that advertises a gated one', () => {
    const en = page('/workflows/x/', [alt('en', '/workflows/x/'), alt('ru', '/ru/workflows/x/')]);
    const ru = page('/ru/workflows/x/', [alt('en', '/workflows/x/')], { noindex: true });
    expect(checkHreflangContract([en, ru], ORIGIN)).toEqual([
      '/workflows/x/: hreflang "ru" points at noindexed /ru/workflows/x/',
    ]);
  });

  it('holds for the full eleven-locale cluster the hub ships', () => {
    const locales = ['en', 'zh', 'zh-tw', 'ja', 'ko', 'es', 'fr', 'ru', 'tr', 'ar', 'pt-br'];
    const pathFor = (locale: string) => (locale === 'en' ? '/workflows/' : `/${locale}/workflows/`);
    const cluster = locales.map((locale) => alt(locale, pathFor(locale)));
    const pages = locales.map((locale) =>
      page(pathFor(locale), [...cluster, alt('x-default', '/workflows/')])
    );
    expect(checkHreflangContract(pages, ORIGIN)).toEqual([]);
  });
});
