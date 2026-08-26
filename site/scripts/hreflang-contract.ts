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

/**
 * V8 returns a regex capture as a slice that keeps its entire source string
 * alive. Hub detail pages are ~1.6 MB of HTML each, so keeping a few hrefs from
 * every page retains the whole build: measured at 2.1 GB of heap for 1,400 pages,
 * which is what took CI past its 4 GB limit. Copying through a Buffer yields a
 * standalone string and lets the page be collected.
 */
function detached(value: string): string {
  return Buffer.from(value, 'utf8').toString('utf8');
}

export function parseAlternates(html: string): Alternate[] {
  const alternates: Alternate[] = [];
  for (const tag of html.match(ALTERNATE_TAG) ?? []) {
    const hreflang = tag.match(HREFLANG_ATTR)?.[1];
    const href = tag.match(HREF_ATTR)?.[1];
    // rel="alternate" also carries RSS and media links; only the tags that
    // declare an hreflang belong to the language cluster.
    if (hreflang && href) {
      alternates.push({ hreflang: detached(hreflang.toLowerCase()), href: detached(href) });
    }
  }
  return alternates;
}

export function parseCanonical(html: string): string | null {
  const href = html.match(CANONICAL_TAG)?.[0].match(HREF_ATTR)?.[1];
  return href === undefined ? null : detached(href);
}

export function parseNoindex(html: string): boolean {
  return NOINDEX_META.test(html);
}

export function normalizePath(pathname: string): string {
  const rooted = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return rooted.endsWith('/') ? rooted : `${rooted}/`;
}

/**
 * Site-relative path for an absolute href, or null when it is not on `origin`.
 * Compares parsed origins rather than raw strings, so an explicit default port or
 * an uppercased host is still recognised as the same site, and a host that merely
 * begins with the origin is still not.
 */
export function pathForHref(href: string, origin: string): string | null {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return null;
  }
  return url.origin === origin ? normalizePath(url.pathname) : null;
}

export function originOf(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

interface ResolvedAlternate extends Alternate {
  /** Site-relative target, or null when the href is not on `origin`. */
  path: string | null;
}

export interface ContractResult {
  problems: string[];
  /**
   * Alternates whose target is not in the build. Every localized route is
   * `prerender = false`, so its URL is served on demand and never becomes a file
   * here: absence proves nothing, and treating it as a broken link reported 920
   * false failures. Counted and printed rather than dropped, so the limit of what
   * this check can prove stays visible.
   */
  unverifiable: number;
}

export function checkHreflangContract(
  pages: readonly RenderedPage[],
  origin: string
): ContractResult {
  const problems: string[] = [];
  let unverifiable = 0;
  const byPath = new Map(pages.map((page) => [page.path, page]));
  // Resolved once per href: the reciprocity check reads every alternate of every
  // target, so parsing on demand would re-parse each href once per cluster member.
  const resolvedByPath = new Map<string, ResolvedAlternate[]>(
    pages.map((page) => [
      page.path,
      page.alternates.map((alternate) => ({
        ...alternate,
        path: pathForHref(alternate.href, origin),
      })),
    ])
  );

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
    for (const alternate of resolvedByPath.get(page.path) ?? []) {
      // A repeated hreflang value is ambiguous, so Google drops the whole cluster.
      if (seen.has(alternate.hreflang)) {
        problems.push(`${page.path}: duplicate hreflang "${alternate.hreflang}"`);
      }
      seen.add(alternate.hreflang);

      const target = alternate.path;
      if (target === null) {
        problems.push(
          `${page.path}: hreflang "${alternate.hreflang}" is off-origin: ${alternate.href}`
        );
        continue;
      }

      const targetPage = byPath.get(target);
      if (!targetPage) {
        // Server-rendered, so existence, indexability and the return link are all
        // unknowable from the build output.
        unverifiable += 1;
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
      const linksBack = (resolvedByPath.get(target) ?? []).some(
        (back) => back.hreflang !== 'x-default' && back.path === page.path
      );
      if (!linksBack) {
        problems.push(
          `${page.path}: hreflang "${alternate.hreflang}" (${target}) does not link back`
        );
      }
    }

    // Google requires a cluster member to name itself; without it the page is not
    // considered part of the set it is advertising.
    const languageAlternates = (resolvedByPath.get(page.path) ?? []).filter(
      (a) => a.hreflang !== 'x-default'
    );
    if (languageAlternates.length > 0 && !languageAlternates.some((a) => a.path === page.path)) {
      problems.push(`${page.path}: emits alternates but none point back at itself`);
    }
  }

  return { problems: problems.sort(), unverifiable };
}
