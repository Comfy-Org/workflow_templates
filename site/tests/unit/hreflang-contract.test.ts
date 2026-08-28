import { describe, expect, it } from 'vitest';
import {
  checkHreflangContract,
  declaresOnDemandRendering,
  resolveSiteOrigin,
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

  it('accepts an equivalent origin written differently', () => {
    // Same origin once parsed: the explicit default port and the uppercased host
    // both normalise away, and rejecting them would fail CI on a correct build.
    expect(pathForHref('https://comfy.org:443/ko/workflows/', ORIGIN)).toBe('/ko/workflows/');
    expect(pathForHref('https://COMFY.ORG/ko/workflows/', ORIGIN)).toBe('/ko/workflows/');
  });

  it('rejects an href that is not absolute', () => {
    expect(pathForHref('/ko/workflows/', ORIGIN)).toBeNull();
    expect(pathForHref('not a url', ORIGIN)).toBeNull();
  });

  it('rejects another origin rather than treating it as a path', () => {
    expect(pathForHref('https://staging.comfy.org/ko/workflows/', ORIGIN)).toBeNull();
    // A prefix match alone must not pass: this host merely starts with the origin.
    expect(pathForHref('https://comfy.org.evil.test/ko/', ORIGIN)).toBeNull();
  });
});

/** The locales the hub routes, so a label can be checked against its target path. */
const LOCALES = ['en', 'zh', 'zh-TW', 'ja', 'ko', 'es', 'fr', 'ru', 'tr', 'ar', 'pt-BR'];

/** Detail pages are a prerendered route; the policy, not an observation. */
const DETAIL_PRERENDERED = true;

function problems(pages: RenderedPage[], origin = ORIGIN): string[] {
  return checkHreflangContract(pages, origin, LOCALES, DETAIL_PRERENDERED).problems;
}

describe('resolveSiteOrigin', () => {
  it('defaults to the production origin when nothing is configured', () => {
    expect(resolveSiteOrigin(undefined)).toBe(ORIGIN);
    expect(resolveSiteOrigin('')).toBe(ORIGIN);
    expect(resolveSiteOrigin('   ')).toBe(ORIGIN);
  });

  it('takes the configured origin, normalised the way the site normalises it', () => {
    expect(resolveSiteOrigin('https://preview.example.com')).toBe('https://preview.example.com');
    expect(resolveSiteOrigin('https://preview.example.com/some/path')).toBe(
      'https://preview.example.com'
    );
    expect(resolveSiteOrigin(' https://comfy.org/ ')).toBe(ORIGIN);
  });

  it('falls back rather than trusting an unparseable value', () => {
    expect(resolveSiteOrigin('not a url')).toBe(ORIGIN);
  });
});

describe('declaresOnDemandRendering', () => {
  it('reads the declaration that opts a route out of prerendering', () => {
    expect(declaresOnDemandRendering('---\nexport const prerender = false;\n---')).toBe(true);
  });

  it('reads it through a type annotation', () => {
    expect(declaresOnDemandRendering('export const prerender: boolean = false;')).toBe(true);
  });

  it('treats a route with no declaration as prerendered', () => {
    expect(declaresOnDemandRendering('---\nconst related = 4;\n---')).toBe(false);
  });

  it('does not take the opt-out from an assignment to true', () => {
    expect(declaresOnDemandRendering('export const prerender = true;')).toBe(false);
  });

  it('does not take the opt-out from a line comment', () => {
    expect(declaresOnDemandRendering('// export const prerender = false\nconst a = 1;')).toBe(
      false
    );
  });

  it('does not take the opt-out from a block comment', () => {
    // The real route's header comment is this shape: prose naming the sibling
    // route that is server-rendered, sitting above code that is not.
    const source = [
      '/**',
      ' * The sibling route declares export const prerender = false; this one does not.',
      ' */',
      'const a = 1;',
    ].join('\n');
    expect(declaresOnDemandRendering(source)).toBe(false);
  });

  it('does not take the opt-out from a string', () => {
    expect(declaresOnDemandRendering('const hint = "export const prerender = false";')).toBe(false);
  });

  it('does not read the // in a URL as the start of a comment', () => {
    const source = "const site = 'https://comfy.org'; export const prerender = false;";
    expect(declaresOnDemandRendering(source)).toBe(true);
  });
});

describe('checkHreflangContract', () => {
  it('accepts a reciprocal cluster', () => {
    expect(problems(reciprocalPair())).toEqual([]);
  });

  it('accepts an English-only page that emits x-default alone', () => {
    const pages = [page('/use-cases/upscaling/', [alt('x-default', '/use-cases/upscaling/')])];
    expect(problems(pages)).toEqual([]);
  });

  it('catches a one-way declaration', () => {
    const [en] = reciprocalPair();
    const ko = page('/ko/workflows/', [
      alt('ko', '/ko/workflows/'),
      alt('x-default', '/workflows/'),
    ]);
    expect(problems([en, ko])).toEqual([
      '/workflows/: hreflang "ko" (/ko/workflows/) does not link back',
    ]);
  });

  it('does not accept x-default as the return leg', () => {
    const en = page('/workflows/', [alt('en', '/workflows/'), alt('ko', '/ko/workflows/')]);
    // Points home, but only as a fallback declaration, not as a cluster member.
    const ko = page('/ko/workflows/', [
      alt('ko', '/ko/workflows/'),
      alt('x-default', '/workflows/'),
    ]);
    expect(problems([en, ko])).toContain(
      '/workflows/: hreflang "ko" (/ko/workflows/) does not link back'
    );
  });

  it('does not fail on an alternate whose target is server-rendered', () => {
    // Every localized route is prerender = false, so its URL is never a file in
    // the build. Absence proves nothing, and asserting on it reported 920 false
    // failures against a correct site.
    const pages = reciprocalPair();
    pages[0].alternates.push(alt('ja', '/ja/workflows/'));
    const result = checkHreflangContract(pages, ORIGIN, LOCALES, DETAIL_PRERENDERED);
    expect(result.problems).toEqual([]);
    expect(result.unverifiable).toBe(1);
  });

  it('counts every unverifiable target rather than dropping them silently', () => {
    const en = page('/workflows/', [
      alt('en', '/workflows/'),
      alt('ja', '/ja/workflows/'),
      alt('ko', '/ko/workflows/'),
      alt('x-default', '/workflows/'),
    ]);
    const result = checkHreflangContract([en], ORIGIN, LOCALES, DETAIL_PRERENDERED);
    expect(result.problems).toEqual([]);
    expect(result.unverifiable).toBe(2);
  });

  it('catches an alternate pointing at a noindexed page', () => {
    const [en, ko] = reciprocalPair();
    ko.noindex = true;
    expect(problems([en, ko])).toEqual([
      '/workflows/: hreflang "ko" points at noindexed /ko/workflows/',
    ]);
  });

  it('catches a repeated hreflang value', () => {
    const [en, ko] = reciprocalPair();
    en.alternates.push(alt('ko', '/ko/workflows/'));
    expect(problems([en, ko])).toEqual(['/workflows/: duplicate hreflang "ko"']);
  });

  it('catches an alternate on the wrong origin', () => {
    const pages = [
      page('/workflows/', [
        alt('en', '/workflows/'),
        { hreflang: 'ko', href: 'https://staging.comfy.org/ko/workflows/' },
      ]),
    ];
    expect(problems(pages)).toEqual([
      '/workflows/: hreflang "ko" is off-origin: https://staging.comfy.org/ko/workflows/',
    ]);
  });

  it('catches a page that advertises a cluster it is not a member of', () => {
    const en = page('/workflows/', [alt('en', '/workflows/'), alt('ko', '/ko/workflows/')]);
    const ko = page('/ko/workflows/', [alt('en', '/workflows/')]);
    expect(problems([en, ko])).toEqual([
      '/ko/workflows/: emits alternates but none point back at itself',
    ]);
  });

  it('catches a canonical left pointing at a preview origin', () => {
    const pages = reciprocalPair();
    pages[1].canonical = 'https://comfy-preview.vercel.app/ko/workflows/';
    expect(problems(pages)).toEqual([
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
    expect(problems([en, ja, ru])).toEqual([]);
  });

  it('still reports an indexable page that advertises a gated one', () => {
    const en = page('/workflows/x/', [alt('en', '/workflows/x/'), alt('ru', '/ru/workflows/x/')]);
    const ru = page('/ru/workflows/x/', [alt('en', '/workflows/x/')], { noindex: true });
    expect(problems([en, ru])).toEqual([
      '/workflows/x/: hreflang "ru" points at noindexed /ru/workflows/x/',
    ]);
  });

  it('catches a whole build emitted on a preview origin', () => {
    // The case an origin inferred from the build itself cannot see: every page
    // agrees with every other, so a self-consistent build passes while shipping
    // canonicals and alternates that hand the entire site to another host.
    const preview = 'https://workflow-templates-abc123.vercel.app';
    const previewAlt = (hreflang: string, pathname: string) => ({
      hreflang,
      href: `${preview}${pathname}`,
    });
    const cluster = [previewAlt('en', '/workflows/'), previewAlt('ja', '/ja/workflows/')];
    const pages: RenderedPage[] = [
      {
        path: '/workflows/',
        alternates: cluster,
        canonical: `${preview}/workflows/`,
        noindex: false,
      },
      {
        path: '/ja/workflows/',
        alternates: cluster,
        canonical: `${preview}/ja/workflows/`,
        noindex: false,
      },
    ];
    const result = checkHreflangContract(pages, ORIGIN, LOCALES, DETAIL_PRERENDERED);
    expect(result.problems).toContain(
      `/workflows/: canonical is not on ${ORIGIN}: ${preview}/workflows/`
    );
    expect(result.problems).toContain(
      `/ja/workflows/: canonical is not on ${ORIGIN}: ${preview}/ja/workflows/`
    );
    expect(result.problems.some((p) => p.includes('is off-origin'))).toBe(true);
  });

  it('catches a cluster whose labels are swapped', () => {
    // Reciprocity and self-reference both pass this: every link resolves, every
    // page lists the others, and every page is a member of the set. Only the
    // label is wrong, and it is the one thing Google reads as the language.
    const cluster = [
      alt('en', '/workflows/'),
      alt('ja', '/ko/workflows/'),
      alt('ko', '/ja/workflows/'),
    ];
    const pages = ['/workflows/', '/ko/workflows/', '/ja/workflows/'].map((path) =>
      page(path, cluster)
    );
    const result = checkHreflangContract(pages, ORIGIN, LOCALES, DETAIL_PRERENDERED);
    expect(result.problems).toContain(
      '/workflows/: hreflang "ja" points at /ko/workflows/, which is "ko"'
    );
    expect(result.problems).toContain(
      '/workflows/: hreflang "ko" points at /ja/workflows/, which is "ja"'
    );
  });

  it('reads an unprefixed path as English', () => {
    const pages = [page('/workflows/', [alt('ko', '/workflows/'), alt('en', '/workflows/')])];
    expect(checkHreflangContract(pages, ORIGIN, LOCALES, DETAIL_PRERENDERED).problems).toContain(
      '/workflows/: hreflang "ko" points at /workflows/, which is "en"'
    );
  });

  it('matches a mixed-case locale prefix against its lowercase label', () => {
    // The hub emits hreflang="zh-tw" for /zh-TW/, and "pt-br" for /pt-BR/.
    const cluster = [
      alt('en', '/workflows/'),
      alt('zh-tw', '/zh-TW/workflows/'),
      alt('pt-br', '/pt-BR/workflows/'),
    ];
    const pages = ['/workflows/', '/zh-TW/workflows/', '/pt-BR/workflows/'].map((path) =>
      page(path, cluster)
    );
    expect(checkHreflangContract(pages, ORIGIN, LOCALES, DETAIL_PRERENDERED).problems).toEqual([]);
  });

  it('leaves x-default alone, since it names a fallback and not a language', () => {
    const pages = [
      page('/workflows/', [alt('en', '/workflows/'), alt('x-default', '/workflows/')]),
    ];
    expect(checkHreflangContract(pages, ORIGIN, LOCALES, DETAIL_PRERENDERED).problems).toEqual([]);
  });

  it('checks the label even when the target is server-rendered', () => {
    // The label is settled by the path it names, so it holds whether or not that
    // page is a file. Behind the target lookup this was skipped for exactly the
    // routes nothing else can check.
    const en = page('/workflows/', [
      alt('en', '/workflows/'),
      alt('ja', '/ko/workflows/'), // wrong label, and /ko/workflows/ is on demand
    ]);
    const result = checkHreflangContract([en], ORIGIN, LOCALES, DETAIL_PRERENDERED);
    expect(result.problems).toContain(
      '/workflows/: hreflang "ja" points at /ko/workflows/, which is "ko"'
    );
    expect(result.unverifiable).toBe(1);
  });

  it('fails on a detail page the build should have produced', () => {
    // ja prerenders its detail pages, proven by the one that is here, so the
    // missing sibling is a broken cluster member rather than an unknown.
    const cluster = [
      alt('en', '/workflows/a/'),
      alt('ja', '/ja/workflows/a/'),
      alt('ko', '/ko/workflows/a/'),
    ];
    const pages = [
      page('/workflows/a/', cluster),
      page('/ja/workflows/a/', cluster),
      page('/ja/workflows/b/', [alt('ja', '/ja/workflows/b/')]),
    ];
    const result = checkHreflangContract(pages, ORIGIN, LOCALES, DETAIL_PRERENDERED);
    expect(result.problems).toContain(
      '/workflows/a/: hreflang "ko" points at /ko/workflows/a/, which this build did not produce'
    );
  });

  it('fails when a degraded build emitted no localized detail pages at all', () => {
    // getStaticPaths emits none when the hub index is unavailable. Reading the
    // policy off the emitted pages inverted here: zero pages looked like "served
    // on demand", so every absence an English page advertised was excused.
    const en = page('/workflows/a/', [alt('en', '/workflows/a/'), alt('ja', '/ja/workflows/a/')]);
    const result = checkHreflangContract([en], ORIGIN, LOCALES, DETAIL_PRERENDERED);
    expect(result.problems).toContain(
      '/workflows/a/: hreflang "ja" points at /ja/workflows/a/, which this build did not produce'
    );
    expect(result.unverifiable).toBe(0);
  });

  it('excuses the same absence when the route really is on demand', () => {
    const en = page('/workflows/a/', [alt('en', '/workflows/a/'), alt('ja', '/ja/workflows/a/')]);
    const result = checkHreflangContract([en], ORIGIN, LOCALES, false);
    expect(result.problems).toEqual([]);
    expect(result.unverifiable).toBe(1);
  });

  it('still treats an on-demand family as unverifiable', () => {
    // Listing, category, tag and model are prerender = false, so absence there
    // proves nothing no matter which locales prerender detail pages.
    const pages = [
      page('/workflows/category/video/', [
        alt('en', '/workflows/category/video/'),
        alt('ja', '/ja/workflows/category/video/'),
      ]),
      page('/ja/workflows/a/', [alt('ja', '/ja/workflows/a/')]),
    ];
    const result = checkHreflangContract(pages, ORIGIN, LOCALES, DETAIL_PRERENDERED);
    expect(result.problems).toEqual([]);
    expect(result.unverifiable).toBe(1);
  });

  it('reports a noindexed target once, without also asking it to link back', () => {
    // Google drops the noindexed page and its annotations together, so its return
    // leg is moot; two problems for one broken alternate is noise.
    const en = page('/workflows/', [alt('en', '/workflows/'), alt('ko', '/ko/workflows/')]);
    const ko = page('/ko/workflows/', [alt('ko', '/ko/workflows/')], { noindex: true });
    expect(problems([en, ko])).toEqual([
      '/workflows/: hreflang "ko" points at noindexed /ko/workflows/',
    ]);
  });

  it('holds for the full eleven-locale cluster the hub ships', () => {
    const locales = ['en', 'zh', 'zh-tw', 'ja', 'ko', 'es', 'fr', 'ru', 'tr', 'ar', 'pt-br'];
    const pathFor = (locale: string) => (locale === 'en' ? '/workflows/' : `/${locale}/workflows/`);
    const cluster = locales.map((locale) => alt(locale, pathFor(locale)));
    const pages = locales.map((locale) =>
      page(pathFor(locale), [...cluster, alt('x-default', '/workflows/')])
    );
    expect(problems(pages)).toEqual([]);
  });
});
