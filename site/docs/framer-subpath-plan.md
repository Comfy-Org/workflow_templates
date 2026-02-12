# Framer Subpath Integration — Implementation Plan

> Serve the Astro SSG templates site at `https://comfy.org/templates/` via Framer Multi-Site rewrite to consolidate domain authority and improve SEO.

**Branch**: `feat/framer-subpath-seo`
**Status**: Ready to implement
**Last Updated**: 2026-02-06

---

## Context

The templates site has never launched on `templates.comfy.org` — the only live URL is the Vercel default (`workflow-templates.vercel.app`). The main marketing site at `comfy.org` is a Framer site with existing domain authority.

We'll serve the templates site at `https://comfy.org/templates/` using Framer's Multi-Site rewrite feature (Option A). This means:
- Framer owns `comfy.org` and serves all marketing pages
- Framer rewrites `/templates/*` → the Astro site on Vercel
- Visitors see `comfy.org/templates/...` in the browser — no redirect
- All SEO authority consolidates under `comfy.org`

Config is driven by environment variables so the same codebase can work mounted at root (for local dev / preview) or under `/templates` (for production via Framer).

---

## Routing: Framer Multi-Site Rewrite

Framer's Multi-Site feature handles the routing:

1. In Framer dashboard → select `comfy.org` domain → **Multi Site** tab
2. Add rewrite rule: path `/templates/*` → **External** → Vercel deployment URL
3. Publish the Framer project

Framer serves all marketing pages at root. Requests to `/templates/*` are rewritten (not redirected) to the Astro site on Vercel. The URL stays as `comfy.org/templates/...` in the browser.

No gateway app, reverse proxy, or Vercel domain ownership needed.

---

## Environment Variables

Add to `.env.example` and document:

| Variable | Purpose | Production Value | Default (dev) |
|---|---|---|---|
| `PUBLIC_SITE_ORIGIN` | Canonical origin (scheme+host, no path) | `https://comfy.org` | `https://comfy.org` |

The `PUBLIC_` prefix makes these available in Astro components via `import.meta.env`.

Since Framer passes the full path through, we do NOT need a `PUBLIC_BASE_PATH` / Astro `base` config. The routes already match the desired URL structure.

---

## Implementation Tasks

### Task 1: Create centralized URL helper module

**New file**: `src/config/site.ts`

```ts
function normalizeBase(base?: string): string {
  if (!base || base === '/') return '';
  let b = base.trim();
  if (!b.startsWith('/')) b = '/' + b;
  if (b.endsWith('/')) b = b.slice(0, -1);
  return b;
}

function normalizeOrigin(origin?: string): string {
  if (!origin) return '';
  return origin.endsWith('/') ? origin.slice(0, -1) : origin;
}

export const SITE_ORIGIN = normalizeOrigin(
  import.meta.env.PUBLIC_SITE_ORIGIN || 'https://comfy.org'
);
export const BASE_PATH = normalizeBase(import.meta.env.PUBLIC_BASE_PATH);

/** Prefix a site-root path with BASE_PATH (deduplicates if already prefixed). */
export function withBase(pathname: string): string {
  const p = pathname.startsWith('/') ? pathname : `/${pathname}`;
  if (!BASE_PATH) return p;
  if (p.startsWith(BASE_PATH + '/') || p === BASE_PATH) return p;
  return `${BASE_PATH}${p}`;
}

/** Build absolute canonical URL from a site-root path. */
export function absoluteUrl(pathname: string): string {
  return `${SITE_ORIGIN}${withBase(pathname)}`;
}
```

**Why**: Single source of truth for all URL construction. Avoids drift between SEOHead, hreflang, sitemap, robots, and i18n.

---

### Task 2: Update `astro.config.mjs` — env-driven `site` + `base`

**File**: `site/astro.config.mjs`

Changes:
- Replace hardcoded `site: 'https://comfy.org'` with env-driven value
- Add `base` config from `PUBLIC_BASE_PATH`

```js
const siteOrigin = (process.env.PUBLIC_SITE_ORIGIN || 'https://comfy.org').replace(/\/$/, '');
const rawBase = (process.env.PUBLIC_BASE_PATH || '').trim().replace(/\/$/, '');
const base = rawBase && rawBase !== '/' ? (rawBase.startsWith('/') ? rawBase : `/${rawBase}`) : undefined;

export default defineConfig({
  site: siteOrigin,
  ...(base ? { base } : {}),
  // ... rest unchanged
});
```

**Effect**: Astro's sitemap integration automatically uses `site + base` for URL generation. Asset paths in the build output respect `base`. `import.meta.env.BASE_URL` becomes available in components.

**Note on sitemap**: With `site='https://comfy.org'` and `base='/templates'`, the sitemap integration will emit URLs like `https://comfy.org/templates/...` — exactly what we need.

---

### Task 3: Update `SEOHead.astro` — canonical URLs via helper

**File**: `site/src/components/SEOHead.astro`

Current logic (line 28–34):
```astro
const siteUrl = Astro.site?.origin || 'https://comfy.org';
const pathname = Astro.url.pathname;
const fullCanonicalUrl = canonicalUrl
  ? canonicalUrl
  : `${siteUrl}${pathname}${pathname.endsWith('/') ? '' : '/'}`;
const fullOgImage = ogImage.startsWith('http') ? ogImage : `${siteUrl}${ogImage}`;
```

**Change to**:
```astro
import { absoluteUrl, withBase, SITE_ORIGIN } from '../config/site';

// Astro.url.pathname already includes base when base is set
const pathname = Astro.url.pathname;
const fullCanonicalUrl = canonicalUrl
  ? canonicalUrl
  : absoluteUrl(pathname.replace(import.meta.env.BASE_URL, '/'))
    + (pathname.endsWith('/') ? '' : '/');
const fullOgImage = ogImage.startsWith('http') ? ogImage : `${SITE_ORIGIN}${withBase(ogImage)}`;
```

**Key detail**: When `base` is set, `Astro.url.pathname` already includes the base prefix. We strip it before passing to `absoluteUrl()` (which adds it back) to avoid double-prefixing. Or we can just use `Astro.url.pathname` directly with `SITE_ORIGIN` since it already has base. Need to test both approaches.

**Constraint**: Per site/AGENTS.md, do NOT remove or modify the `structuredData` prop, `t()` calls, or Analytics component. This change only touches canonical/OG computation.

---

### Task 4: Update `HreflangTags.astro` — use absoluteUrl helper

**File**: `site/src/components/HreflangTags.astro`

Current logic (line 17–31):
```astro
const siteUrl = Astro.site?.origin || 'https://comfy.org';
const href = `${siteUrl}${localizeUrl(basePath, locale as Locale)}`;
const xDefaultHref = `${siteUrl}${basePath}`;
```

**Change to**:
```astro
import { absoluteUrl } from '../config/site';

const href = absoluteUrl(localizeUrl(basePath, locale as Locale));
const xDefaultHref = absoluteUrl(basePath);
```

**Note**: `basePath` here is the hreflang base path (e.g. `/templates/flux_schnell/`), not the Astro base config. The naming collision is unfortunate. `localizeUrl()` returns a path like `/zh/templates/flux_schnell/`. Then `absoluteUrl()` prepends origin + base.

---

### Task 5: Update `localizeUrl()` — decide on base-awareness

**File**: `site/src/i18n/utils.ts`

**Decision needed**: Should `localizeUrl()` include the base path in its output?

**Recommended approach**: `localizeUrl()` returns **logical paths** (no base prefix). Base is added by callers (`absoluteUrl()` for canonical/hreflang, or `import.meta.env.BASE_URL` prefix for `<a href>` in templates).

**Why**: Keeps `localizeUrl()` pure — it only handles locale prefixing. Base path concerns stay centralized in `site.ts`.

**Impact on callers**:
- `HreflangTags.astro`: Already uses `absoluteUrl()` (task 4) ✅
- `SEOHead.astro`: Uses `absoluteUrl()` (task 3) ✅
- `BaseLayout.astro`: Uses `localizeUrl()` for nav hrefs (lines 39-40). Since Astro auto-prefixes `BASE_URL` for `<a href>` in static builds when using `base`, these should work. **Needs testing.**
- `TemplateCard.astro`: Same situation — uses `localizeUrl()` for template links
- Page files (`templates/index.astro`, `tag/[tag].astro`, etc.): Mix of canonical URLs (use `absoluteUrl()`) and navigation links (test with base)

**If Astro does NOT auto-prefix href in .astro components** (which the docs suggest it doesn't), then we need `localizeUrl()` to include base, OR wrap all `localizeUrl()` calls in navigation contexts with `withBase()`.

**Safest approach**: Add a `localizeHref()` variant that includes base for navigation, keep `localizeUrl()` for canonical/SEO:

```ts
import { withBase } from '../config/site';

// For SEO (canonical, hreflang) — no base
export function localizeUrl(path: string, locale: Locale): string { /* unchanged */ }

// For navigation hrefs — includes base
export function localizeHref(path: string, locale: Locale): string {
  return withBase(localizeUrl(path, locale));
}
```

---

### Task 6: Replace static `robots.txt` with dynamic endpoint

**Remove**: `site/public/robots.txt`
**New file**: `site/src/pages/robots.txt.ts`

```ts
import type { APIRoute } from 'astro';
import { absoluteUrl } from '../config/site';

export const GET: APIRoute = () => {
  const body = [
    'User-agent: *',
    'Allow: /',
    '',
    `Sitemap: ${absoluteUrl('/sitemap-index.xml')}`,
    '',
  ].join('\n');

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
```

**Why**: Static `robots.txt` can't reflect env-driven domain/path changes. The endpoint generates correct sitemap URLs at build time.

---

### Task 7: Fix root-relative asset references

**Files with root-relative `src=` or `href=` for static assets**:

| File | Line | Current | Fix |
|---|---|---|---|
| `BaseLayout.astro` | 86 | `src="/brand/comfy-wordmark-yellow.svg"` | Prefix with `BASE_URL` |
| `SEOHead.astro` | 79 | `href="/favicon.svg"` | Prefix with `BASE_URL` |
| `TemplateDetailPage.astro` | 197 | `src="/brand/comfy-c-blue.svg"` | Prefix with `BASE_URL` |
| `TemplateDetailPage.astro` | 499 | `src="/brand/comfy-c-blue.svg"` | Prefix with `BASE_URL` |

**Pattern**:
```astro
<!-- Before -->
<img src="/brand/comfy-c-blue.svg" />

<!-- After -->
<img src={`${import.meta.env.BASE_URL}brand/comfy-c-blue.svg`} />
```

**Note**: `import.meta.env.BASE_URL` includes trailing slash when using default trailingSlash config, so no extra `/` needed between base and path.

**Also audit**: CSS `url()` references, any `fetch()` calls to local assets, structured data image URLs.

---

### Task 8: Vercel hostname de-duplication

**File**: `vercel.json` (repo root)

Add header rules to prevent `*.vercel.app` from being indexed:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": null,
  "installCommand": "pnpm install --frozen-lockfile",
  "buildCommand": "pnpm build",
  "outputDirectory": "dist",
  "headers": [
    {
      "source": "/(.*)",
      "has": [{ "type": "host", "value": ".*\\.vercel\\.app$" }],
      "headers": [
        { "key": "X-Robots-Tag", "value": "noindex, nofollow" }
      ]
    }
  ]
}
```

**Why**: Prevents Google from treating the Vercel deployment URL as a competing canonical source. This works immediately, even before the Framer domain is configured.

**Future enhancement**: Once canonical domain is known, add 301 redirects from vercel.app → canonical domain. This can be done via a build-time generated vercel.json or additional redirect rules.

---

### Task 9: Framer Dashboard Configuration (no code changes)

1. Go to Framer dashboard → select `comfy.org` domain → **Multi Site** tab
2. Add rewrite rule:
   - Path: `/templates/*`
   - Type: **External**
   - Target: `https://workflow-templates.vercel.app` (or production Vercel URL)
3. Publish the Framer project

The Vercel deployment URL can be updated in the Framer dashboard without code changes.

---

### Task 10: Update .env.example

**File**: `site/.env.example`

Add the new env vars with documentation:

```bash
# === Domain Configuration ===
# Canonical origin for SEO (scheme+host, no trailing slash, no path)
# Default: https://comfy.org
# Production: https://comfy.org
# PUBLIC_SITE_ORIGIN=https://comfy.org

# === AI Content Generation ===
# OpenAI API key for AI content generation
OPENAI_API_KEY=sk-...

# Skip AI generation (use placeholder content)
# SKIP_AI_GENERATION=true
```

---

## Verification Checklist

### Local Development
- [ ] `pnpm dev` works with `PUBLIC_SITE_ORIGIN=https://comfy.org`
- [ ] Pages accessible at `http://localhost:4321/templates/`
- [ ] Assets load correctly (no 404s for CSS/JS/images)
- [ ] Navigation links work (locale switching, template links)
- [ ] `pnpm dev` still works without `PUBLIC_SITE_ORIGIN` set (backward compat)

### Build Output
- [ ] `pnpm build` succeeds with `PUBLIC_SITE_ORIGIN=https://comfy.org`
- [ ] View page source: canonical URLs point to `https://comfy.org/templates/...`
- [ ] View page source: hreflang URLs use `https://comfy.org/templates/...`
- [ ] View page source: OG URLs use `https://comfy.org`
- [ ] `sitemap-index.xml` lists URLs under `https://comfy.org/...`
- [ ] `robots.txt` references correct sitemap URL
- [ ] Build still works without `PUBLIC_SITE_ORIGIN` (backward compat)

### Vercel Deployment
- [ ] Preview deploy loads correctly
- [ ] `*.vercel.app` URLs return `X-Robots-Tag: noindex` header
- [ ] No console errors on deployed pages

### SEO Post-Launch
- [ ] Visiting canonical URL returns 200
- [ ] No redirect to vercel.app
- [ ] Google Search Console: add domain property
- [ ] Google Search Console: submit sitemap
- [ ] Monitor for duplicate canonical warnings

---

## Internal Linking Strategy (Post-Launch)

To pass authority from Framer → Astro pages:
- Add nav links from Framer marketing pages → key `/templates/` pages
- Add footer links to template categories
- Include "Back to main site" links from Astro pages to Framer
- Sitemap discovery alone is insufficient — internal links signal crawl priority

---

## Risk Register

| Risk | Mitigation |
|---|---|
| Framer rewrite doesn't forward all headers/cookies correctly | Test with preview deploy first; Framer docs confirm cookies are forwarded |
| Assets on Vercel fail to load through Framer proxy | Framer docs say "non-HTML content" is passed through without rewriting; test CSS/JS/images |
| Sitemap URL mismatch (vercel.app vs comfy.org) | Changing `site` config to `https://comfy.org` fixes this; verify after build |
| Backward compatibility regression | Default env values use `comfy.org` (production domain) |
| Framer locale expansion conflicts with Astro i18n | Test localized pages (`/zh/templates/...`) through the rewrite; may need per-locale rewrite rules |

---

## Files Modified Summary (Simplified — no `base` needed)

| File | Change Type | Task |
|---|---|---|
| `src/config/site.ts` | **New** | 1 |
| `astro.config.mjs` | Modified | 2 |
| `src/components/SEOHead.astro` | Modified | 3 |
| `src/components/HreflangTags.astro` | Modified | 4 |
| `public/robots.txt` | **Removed** | 6 |
| `src/pages/robots.txt.ts` | **New** | 6 |
| `site/.env.example` | Modified | 10 |
| `vercel.json` (repo root) | Modified | 8 |

**Not needed** (since no `base` config): Task 5 (localizeUrl changes), Task 7 (root-relative asset fixes)

---

## Decisions Made

| Question | Answer |
|---|---|
| Framer domain | `comfy.org` |
| Subpath | `/templates` |
| Routing method | Framer Multi-Site rewrite (Option A) |
| Old domain migration | Not needed — `templates.comfy.org` was never launched |
| Current live URL | `workflow-templates.vercel.app` (Vercel default only) |

## Resolved Questions

**Q: Does Framer pass the full path to the external target?**
Yes. When you configure `/templates/*` → `https://workflow-templates.vercel.app`, a request to `comfy.org/templates/flux_schnell/` fetches `https://workflow-templates.vercel.app/templates/flux_schnell/`. The full path is forwarded.

**Q: Do we need Astro's `base` config?**
No. Since Framer passes the full path and the Astro routes already have `/templates/` in their structure, we do NOT need `base`. This avoids the double `/templates/templates/` problem entirely. We only need to change `site` to `https://comfy.org`.

**Q: Does Framer accept a `.vercel.app` URL as the external rewrite target?**
The docs say "Enter the full URL of the external site" — this should work with `https://workflow-templates.vercel.app`. Only HTTPS origins are supported.

**Q: What about sitemaps?**
Framer docs say "Framer automatically generates and merges sitemaps from all your rewrite sources." However, we should still ensure our sitemap URLs use `comfy.org` (not `vercel.app`) since that's the canonical domain.

## Implications for Implementation

Since `base` is NOT needed, the plan simplifies dramatically:
- **Task 1** (site.ts helper): Simplified — no `withBase()` needed for navigation links, only for canonical/sitemap URL origin
- **Task 2** (astro.config.mjs): Only change `site` to env-driven value, NO `base` config needed
- **Task 5** (localizeUrl): No changes needed — already correct
- **Task 7** (root-relative assets): No changes needed — assets stay at `/brand/...`, `/favicon.svg` etc.
- All other tasks (SEOHead canonicals, HreflangTags, robots.txt, vercel.json noindex) still apply but are simpler
