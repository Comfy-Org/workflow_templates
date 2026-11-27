/**
 * Shared HTML directive parsing utilities (meta robots, canonical links, meta refresh, and attributes).
 * Used across build-time sitemap filtering and post-build SEO verification scripts.
 */

const ATTR_REGEX_CACHE = new Map<string, RegExp>();

function getAttrRegex(name: string): RegExp {
  let re = ATTR_REGEX_CACHE.get(name);
  if (!re) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    re = new RegExp(`(?:^|\\s)${escaped}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'>]+))`, 'i');
    ATTR_REGEX_CACHE.set(name, re);
  }
  return re;
}

/**
 * Extract an attribute value from an HTML tag string.
 * Anchors the attribute name at an HTML attribute boundary (preceded by whitespace or tag start),
 * and handles double-quoted, single-quoted, or unquoted values.
 */
export function getHtmlAttr(tag: string, name: string): string | null {
  const m = tag.match(getAttrRegex(name));
  return m ? (m[1] ?? m[2] ?? m[3] ?? '') : null;
}

/**
 * Copy string through Buffer or slice to avoid retaining the parent source string in V8.
 */
export function detached(value: string): string {
  return typeof Buffer !== 'undefined'
    ? Buffer.from(value, 'utf8').toString('utf8')
    : (' ' + value).slice(1);
}

/**
 * Extracts the canonical URL href from an HTML string, if present.
 */
export function parseCanonical(html: string): string | null {
  for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
    const rel = getHtmlAttr(tag, 'rel');
    if (rel) {
      const relTokens = rel
        .toLowerCase()
        .split(/\s+/)
        .map((t) => t.trim());
      if (relTokens.includes('canonical')) {
        const href = getHtmlAttr(tag, 'href')?.trim();
        return href ? detached(href) : null;
      }
    }
  }
  return null;
}

/**
 * Checks whether an HTML string declares "noindex" or "none" in robots or googlebot meta tags.
 */
export function parseNoindex(html: string): boolean {
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const name = getHtmlAttr(tag, 'name')?.trim().toLowerCase();
    if (name === 'robots' || name === 'googlebot') {
      const content = getHtmlAttr(tag, 'content') ?? '';
      const tokens = content
        .toLowerCase()
        .split(',')
        .map((t) => t.trim());
      if (tokens.includes('noindex') || tokens.includes('none')) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Checks whether an HTML string declares a meta refresh redirect.
 */
export function parseMetaRefresh(html: string): boolean {
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const httpEquiv = getHtmlAttr(tag, 'http-equiv')?.trim().toLowerCase();
    if (httpEquiv === 'refresh') {
      return true;
    }
  }
  return false;
}
