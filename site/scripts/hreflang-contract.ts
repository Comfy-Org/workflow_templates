/**
 * hreflang is a mutual declaration. Google discards an entire language cluster
 * when one member fails to reciprocate, points at a URL that was never built, or
 * points at a noindexed page. None of those failures surface in the build, in the
 * rendered page, or as a Search Console error: the pages simply stop ranking in
 * their own language. The built artifacts are the only place they can be caught,
 * so the rules live here as pure functions and the verifier script supplies the
 * filesystem.
 */

export interface Alternate {
  hreflang: string;
  href: string;
}

export interface RenderedPage {
  /** Site-root-relative path with a trailing slash, e.g. "/ko/workflows/". */
  path: string;
  alternates: Alternate[];
  canonical: string | null;
  noindex: boolean;
}

const ALTERNATE_TAG = /<link\b[^>]*\brel="alternate"[^>]*>/gi;
const CANONICAL_TAG = /<link\b[^>]*\brel="canonical"[^>]*>/i;
const HREFLANG_ATTR = /\bhreflang="([^"]*)"/i;
const HREF_ATTR = /\bhref="([^"]*)"/i;
const NOINDEX_META = /<meta[^>]+name="robots"[^>]+content="[^"]*noindex/i;

export function parseAlternates(html: string): Alternate[] {
  const alternates: Alternate[] = [];
  for (const tag of html.match(ALTERNATE_TAG) ?? []) {
    const hreflang = tag.match(HREFLANG_ATTR)?.[1];
    const href = tag.match(HREF_ATTR)?.[1];
    // rel="alternate" also carries RSS and media links; only the tags that
    // declare an hreflang belong to the language cluster.
    if (hreflang && href) alternates.push({ hreflang: hreflang.toLowerCase(), href });
  }
  return alternates;
}

export function parseCanonical(html: string): string | null {
  return html.match(CANONICAL_TAG)?.[0].match(HREF_ATTR)?.[1] ?? null;
}

export function parseNoindex(html: string): boolean {
  return NOINDEX_META.test(html);
}

export function normalizePath(pathname: string): string {
  const rooted = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return rooted.endsWith('/') ? rooted : `${rooted}/`;
}

/** Site-relative path for an absolute href, or null when it is not on `origin`. */
export function pathForHref(href: string, origin: string): string | null {
  if (href !== origin && !href.startsWith(`${origin}/`)) return null;
  return normalizePath(href.slice(origin.length).split(/[?#]/)[0]);
}

export function originOf(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

export function checkHreflangContract(pages: readonly RenderedPage[], origin: string): string[] {
  const problems: string[] = [];
  const byPath = new Map(pages.map((page) => [page.path, page]));

  for (const page of pages) {
    if (page.canonical) {
      // A canonical left on a preview origin hands the whole page to another host.
      if (originOf(page.canonical) !== origin) {
        problems.push(`${page.path}: canonical is not on ${origin}: ${page.canonical}`);
      }
    }

    // Google drops a noindexed page from the index, and with it that page's
    // hreflang annotations. Its outgoing cluster therefore cannot break anything,
    // and the gated locale pages emit one by design. It stays in `byPath` so it is
    // still caught when an indexable page advertises it.
    if (page.noindex) continue;

    const seen = new Set<string>();
    for (const alternate of page.alternates) {
      // A repeated hreflang value is ambiguous, so Google drops the whole cluster.
      if (seen.has(alternate.hreflang)) {
        problems.push(`${page.path}: duplicate hreflang "${alternate.hreflang}"`);
      }
      seen.add(alternate.hreflang);

      const target = pathForHref(alternate.href, origin);
      if (target === null) {
        problems.push(
          `${page.path}: hreflang "${alternate.hreflang}" is off-origin: ${alternate.href}`
        );
        continue;
      }

      const targetPage = byPath.get(target);
      if (!targetPage) {
        problems.push(`${page.path}: hreflang "${alternate.hreflang}" points at unbuilt ${target}`);
        continue;
      }
      if (targetPage.noindex) {
        problems.push(
          `${page.path}: hreflang "${alternate.hreflang}" points at noindexed ${target}`
        );
      }

      // x-default is a one-way fallback declaration, not a cluster member, and a
      // page needs nothing back from itself.
      if (alternate.hreflang === 'x-default' || target === page.path) continue;

      // x-default declares a fallback, not a language pairing, so it does not
      // satisfy the return leg of a cluster.
      const linksBack = targetPage.alternates.some(
        (back) => back.hreflang !== 'x-default' && pathForHref(back.href, origin) === page.path
      );
      if (!linksBack) {
        problems.push(
          `${page.path}: hreflang "${alternate.hreflang}" (${target}) does not link back`
        );
      }
    }

    // Google requires a cluster member to name itself; without it the page is not
    // considered part of the set it is advertising.
    const languageAlternates = page.alternates.filter((a) => a.hreflang !== 'x-default');
    if (
      languageAlternates.length > 0 &&
      !languageAlternates.some((a) => pathForHref(a.href, origin) === page.path)
    ) {
      problems.push(`${page.path}: emits alternates but none point back at itself`);
    }
  }

  return problems.sort();
}
