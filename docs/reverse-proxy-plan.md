# Reverse Proxy Setup: Comprehensive Plan

**Branch:** `feat/reverse-proxy-setup`
**Date:** February 13, 2026
**Status:** Planning — Approach decided (Cloudflare Worker, separate repo)

---

## Goal

Serve the templates site at `comfy.org/templates/` (and `/{locale}/templates/`) via a reverse proxy so that:

1. All template pages inherit `comfy.org` domain authority for SEO
2. The Framer marketing site continues to serve all other paths
3. The architecture is extensible for future services (`/blog`, `/docs`, `/app`)
4. The setup is the long-term entry point for the entire web app surface

---

## Decision: Cloudflare Worker vs Vercel Edge

### Recommendation: **Cloudflare Worker as the front door**

After thorough analysis, Cloudflare Worker is the stronger choice for this use case. Here's the full comparison:

### Architecture Comparison

```
┌─── OPTION A: Cloudflare Worker (RECOMMENDED) ───┐
│                                                   │
│  User → Cloudflare Edge (DNS + Worker)            │
│           ├─ /templates/* → Vercel (Astro)        │
│           ├─ /category/*  → Vercel (Astro)        │
│           ├─ /model/*     → Vercel (Astro)        │
│           ├─ /tag/*       → Vercel (Astro)        │
│           └─ /*           → Framer                │
│                                                   │
└───────────────────────────────────────────────────┘

┌─── OPTION B: Vercel Edge (NOT RECOMMENDED) ──────┐
│                                                   │
│  User → Vercel Edge (DNS + Rewrites/Middleware)   │
│           ├─ /templates/* → Astro static (local)  │
│           └─ /*           → Framer (proxied)      │
│                                                   │
└───────────────────────────────────────────────────┘
```

### Detailed Comparison

| Dimension | Cloudflare Worker | Vercel Edge |
|---|---|---|
| **Cost** | ~$0-5/mo (Workers free tier: 100K req/day) | $0-20/mo (already on Pro) but bandwidth for proxied Framer traffic adds up |
| **Framer compatibility** | Official Framer documentation exists for CF proxy | Not a documented Framer integration path |
| **Framer breakage risk** | Low — CF preserves headers, no injection of Astro headers | Medium-High — `vercel.json` headers (CSP, X-Frame-Options) would apply to Framer responses |
| **Extensibility** | Excellent — add `/blog`, `/docs`, `/app` routing by editing Worker | Requires restructuring rewrites, potential conflict with Astro static routing |
| **Latency** | 1 extra hop (CF edge → origin), CF has 300+ PoPs | 1 extra hop for Framer traffic through Vercel |
| **Operational complexity** | New provider (Cloudflare account + Worker deployment) | Single platform but complex config (Astro rewrite warnings, header isolation) |
| **DNS ownership** | Cloudflare becomes authoritative DNS | Vercel becomes authoritative DNS |
| **Astro compatibility** | N/A — Astro stays on Vercel as-is, CF just routes to it | Vercel warns "Rewrites only work for static files with Astro. You must use Routing Middleware." |
| **Bandwidth cost risk** | Low — CF doesn't charge egress for Worker responses | High — all Framer marketing traffic counts as Vercel bandwidth |
| **Rollback** | Point DNS back to Framer — instant revert | Must reconfigure DNS + remove domain from Vercel |
| **Future-proofing** | Clean separation: router is independent of any origin | Couples routing to Vercel; hard to add non-Vercel origins later |

### Resolved Blockers

- ✅ **Framer add-on purchased** — Custom Proxy add-on ($300/mo) is active on Scale plan
- ✅ **Worker repo decision** — Separate `comfy-router` repo (see rationale below)

### Why NOT Vercel Edge

1. **Header contamination**: The existing `site/vercel.json` sets CSP, X-Frame-Options, X-Content-Type-Options globally. These would apply to proxied Framer responses, potentially breaking Framer's scripts, forms, and anti-bot systems.
2. **Astro static rewrite warning**: Vercel explicitly warns that rewrites don't work cleanly with Astro static output — you'd need Edge Middleware, which is essentially writing the same proxy code as a CF Worker but inside Vercel's ecosystem.
3. **Bandwidth trap**: Proxying all non-template traffic through Vercel means paying Vercel bandwidth for the entire marketing site.
4. **Framer domain conflict**: Adding `comfy.org` to Vercel while Framer also claims it creates verification conflicts.

---

## Implementation Scope

### Phase 1: Pre-Migration Preparation

#### 1.1 Framer Configuration (Manual — Framer Dashboard)
- [x] ~~Verify Framer Scale plan supports reverse proxy hosting~~ — Custom Proxy add-on purchased
- [ ] Set canonical URL in Framer Site Settings → Domains → Advanced to `https://comfy.org`
- [ ] Ensure Framer site is accessible via `comfy.framer.website` (free subdomain)
- [ ] Document current Framer DNS settings for rollback

#### 1.2 Cloudflare Account Setup (Manual — Cloudflare Dashboard)
- [ ] Create Cloudflare account (or use existing)
- [ ] Add `comfy.org` zone to Cloudflare
- [ ] Do NOT change nameservers yet — just set up the zone
- [ ] Create a Worker named `comfy-router` or similar

#### 1.3 Vercel Project Configuration
- [ ] Ensure the Astro site Vercel project has a stable deployment URL (e.g., `comfyui-templates.vercel.app`)
- [ ] Optionally add a custom domain like `templates-origin.comfy.org` pointing to Vercel (useful for origin identification)
- [ ] Verify the current deployment is accessible and thumbnails work

### Phase 2: Worker Development

#### 2.1 Cloudflare Worker Code

The Worker needs to handle:

```
Routes to Vercel (Astro site):
  /templates/*                  (listing, detail, category, model, tag, og, thumbnails)
  /templates                    (no trailing slash)
  /{locale}/templates/*         (11 locales)
  /_astro/*                     (Astro build assets)
  /sitemap*.xml                 (sitemap - needs merging strategy)
  /robots.txt                   (from Astro site, or merged)

301 Redirects (old paths → new paths under /templates/):
  /category/*                   → /templates/category/*
  /model/*                      → /templates/model/*
  /tag/*                        → /templates/tag/*
  /og/*                         → /templates/og/*
  /thumbnails/*                 → /templates/thumbnails/*
  /{locale}/category/*          → /{locale}/templates/category/*
  /{locale}/model/*             → /{locale}/templates/model/*
  /{locale}/tag/*               → /{locale}/templates/tag/*

Routes to Framer (everything else):
  /
  /pricing
  /about
  /blog/*
  /* (catch-all)
```

Key requirements for the Worker:
- Preserve `Host` header or set appropriately for each origin
- Pass through `Set-Cookie` headers unchanged
- Don't modify response bodies
- Respect origin cache headers (don't override)
- Add `X-Served-By: cloudflare-worker` header for debugging
- Handle redirects (301/302) from origins correctly
- Support `www.comfy.org` → `comfy.org` canonicalization (or vice versa)

#### 2.2 Worker Code (Production-Ready)

```javascript
// comfy-router worker
// Routes requests to Vercel (templates) or Framer (marketing)

const VERCEL_ORIGIN = 'https://comfyui-templates.vercel.app';
const FRAMER_ORIGIN = 'https://comfy.framer.website';

// Supported locales (must match Astro i18n config)
const LOCALES = ['zh', 'zh-TW', 'ja', 'ko', 'es', 'fr', 'ru', 'tr', 'ar', 'pt-BR'];

// Paths served by Vercel (Astro templates site)
const VERCEL_PATH_PREFIXES = [
  '/templates',
  '/category/',
  '/model/',
  '/tag/',
  '/thumbnails/',
  '/_astro/',
  '/og/',
];

function shouldRouteToVercel(pathname) {
  // Check direct path prefixes
  for (const prefix of VERCEL_PATH_PREFIXES) {
    if (pathname === prefix || pathname.startsWith(prefix)) {
      return true;
    }
  }

  // Check localized paths: /{locale}/templates/*, /{locale}/category/*, etc.
  for (const locale of LOCALES) {
    const localePrefix = `/${locale}`;
    if (pathname.startsWith(localePrefix)) {
      const rest = pathname.slice(localePrefix.length);
      if (rest === '' || rest === '/') continue; // /{locale}/ alone goes to Framer
      for (const prefix of VERCEL_PATH_PREFIXES) {
        if (rest === prefix || rest.startsWith(prefix)) {
          return true;
        }
      }
    }
  }

  // Sitemap files from templates site
  if (pathname === '/sitemap-templates.xml' || pathname === '/sitemap-index.xml') {
    return true;
  }

  return false;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // Determine origin
    const origin = shouldRouteToVercel(pathname) ? VERCEL_ORIGIN : FRAMER_ORIGIN;

    // Build origin URL
    const originUrl = new URL(pathname + url.search, origin);

    // Create new request with appropriate headers
    const headers = new Headers(request.headers);

    // Preserve the original host for the origin to generate correct URLs
    // But set the actual fetch to the origin hostname
    headers.set('X-Forwarded-Host', url.hostname);
    headers.set('X-Forwarded-Proto', 'https');

    // Debug header
    const isVercel = origin === VERCEL_ORIGIN;

    try {
      const response = await fetch(originUrl.toString(), {
        method: request.method,
        headers: headers,
        body: request.body,
        redirect: 'manual', // Don't follow redirects — pass them through
      });

      // Clone response and add debug header
      const newHeaders = new Headers(response.headers);
      newHeaders.set('X-Served-By', isVercel ? 'vercel-templates' : 'framer-marketing');

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });
    } catch (error) {
      // If origin fails, return a meaningful error
      return new Response(`Origin unavailable: ${origin}`, {
        status: 502,
        headers: { 'Content-Type': 'text/plain' },
      });
    }
  },
};
```

#### 2.3 Wrangler Configuration

```toml
# wrangler.toml
name = "comfy-router"
main = "src/index.js"
compatibility_date = "2024-01-01"

[env.production]
routes = [
  { pattern = "comfy.org/*", zone_name = "comfy.org" },
  { pattern = "www.comfy.org/*", zone_name = "comfy.org" }
]

[env.staging]
routes = [
  { pattern = "staging.comfy.org/*", zone_name = "comfy.org" }
]
```

### Phase 3: Astro Site Changes

#### 3.1 Confirm `site` Config
The Astro config already has:
```javascript
site: (process.env.PUBLIC_SITE_ORIGIN || 'https://comfy.org').replace(/\/$/, ''),
```
This is correct — canonical URLs, sitemaps, and OG images will reference `comfy.org`.

#### 3.2 Sitemap Strategy
Two options:
- **Option A (Simple)**: Worker serves Astro's sitemap at `/sitemap-templates.xml` and Framer's at `/sitemap.xml`. Add a `sitemap-index.xml` that references both.
- **Option B (Advanced)**: Worker intercepts `/sitemap.xml` and stitches both sitemaps together at the edge.

**Recommendation**: Option A — simpler, less error-prone.

#### 3.3 Robots.txt
The Worker should serve a merged `robots.txt` or let one origin handle it. Simplest: let Framer serve `/robots.txt` and add `Sitemap: https://comfy.org/sitemap-templates.xml` via the Worker.

#### 3.4 Asset Path Verification
Verify all asset paths in the Astro site use root-relative URLs that will work under `comfy.org`:
- `/thumbnails/*` — ✅ already root-relative
- `/_astro/*` — ✅ Astro build output
- `/og/*` — ✅ OG images

#### 3.5 CSP Header Isolation
The `site/vercel.json` CSP header should remain — it only applies to responses from the Vercel origin. The Cloudflare Worker passes through origin headers without modification, so Framer responses will have Framer's headers and Vercel responses will have Vercel's headers. No changes needed.

### Phase 4: DNS Migration

#### 4.1 Pre-Migration Checklist
- [ ] Lower TTL on current DNS records to 60s (do this 48h before cutover)
- [ ] Document all current DNS records for rollback
- [ ] Test Worker in staging with a staging subdomain
- [ ] Verify Framer site loads correctly through the Worker
- [ ] Verify templates site loads correctly through the Worker
- [ ] Verify forms on Framer site still work through the Worker
- [ ] Check Framer client-side navigation (SPA transitions)
- [ ] Verify thumbnails load with correct Content-Type

#### 4.2 DNS Cutover Steps
1. Change `comfy.org` nameservers to Cloudflare
2. In Cloudflare DNS, set up:
   - `A` record for `comfy.org` → `192.0.2.1` (dummy, Worker handles all traffic)
   - `AAAA` record for `comfy.org` → `100::` (dummy IPv6)
   - `CNAME` for `www` → `comfy.org` (if using www canonicalization)
3. Assign Worker route: `comfy.org/*` and `www.comfy.org/*`
4. Enable Cloudflare proxy (orange cloud) on DNS records
5. Disable Cloudflare "Rocket Loader" (per Framer docs)
6. Monitor for 24-48h

#### 4.3 Post-Migration Verification
- [ ] All Framer pages load (/, /pricing, /about, etc.)
- [ ] Templates pages load at comfy.org/templates/
- [ ] Localized templates load (e.g., /ja/templates/)
- [ ] Thumbnails load correctly
- [ ] Framer forms submit successfully
- [ ] Framer animations and interactions work
- [ ] Google Search Console: submit updated sitemap
- [ ] Check `X-Served-By` header to verify routing

### Phase 5: Monitoring & Observability

- [ ] Set up Cloudflare Worker analytics (built-in)
- [ ] Set up alerts for Worker errors (502s, timeouts)
- [ ] Monitor Vercel analytics for templates traffic
- [ ] Track Google Search Console for indexing changes

---

## Risk Mitigation

### Rollback Plan
**Time to rollback: < 5 minutes**
1. In Cloudflare DNS, remove Worker route
2. Change DNS records to point directly to Framer (or revert nameservers)
3. Everything reverts to pre-migration state

### Risk Matrix

| Risk | Severity | Likelihood | Mitigation |
|---|---|---|---|
| Framer forms break | High | Low | Test forms on staging; Worker passes headers unchanged |
| Framer client-side routing breaks | High | Low | Worker doesn't modify response bodies; Framer's JS loads from their CDN |
| SEO ranking drop | Medium | Medium | Keep canonical URLs correct; submit sitemap to GSC; expect 2-6 week adjustment |
| DNS propagation delays | Medium | Medium | Lower TTL 48h before; cutover during low-traffic hours |
| ~~Framer requires expensive add-on~~ | ~~High~~ | ~~N/A~~ | ✅ Resolved — add-on purchased |
| Worker errors/downtime | Medium | Very Low | CF Workers have 99.99% SLA; add error handling with fallback |
| Double CDN caching issues | Low | Low | Start with no forced caching; add cache rules incrementally |

### Framer Domains to Allowlist (if custom CSP needed)
- `*.framer.com`
- `*.framerstatic.com`
- `*.framercanvas.com`
- `*.framerusercontent.com`
- `*.framercdn.com`
- `*.framer.app`
- `*.jspm.io`

---

## Changes Required in This Repository

### Site Changes (Phase 3)
1. **Route restructuring** — Moved `/category/`, `/model/`, `/tag/`, `/og/` pages under `/templates/` prefix to avoid conflicting with Framer routes and future services
2. **Thumbnail path migration** — Moved `/thumbnails/` to `/templates/thumbnails/` for clean Worker routing
3. **Sitemap config updated** — Regex patterns in `astro.config.mjs` updated for new paths
4. **No vercel.json changes needed** — headers stay scoped to Vercel responses
5. **No deploy workflow changes needed** — continues to deploy to Vercel as-is
6. **301 redirects in Worker** — Old paths redirect to new paths for SEO continuity

### Separate Repository: `comfy-router`

The Cloudflare Worker lives in its own repo, **not** in `workflow_templates/`.

**Rationale:**
- The Worker is the front door for **all of comfy.org** — not just templates. It routes to Framer, Vercel, and future origins (`/blog`, `/docs`, `/app`). Coupling it to the templates repo creates a false dependency.
- **Deploy isolation**: Template content changes (daily) should never risk redeploying the edge router. The Worker changes rarely — only when adding new origin routes.
- **Ownership clarity**: Routing changes have blast radius across the entire site. A separate repo with its own PR review and deploy pipeline enforces deliberate changes.
- **Multi-team extensibility**: When `/blog` or `/app` teams need to add their routes, they don't need access to the templates repo.
- **Simplicity**: The Worker is ~60 lines of code + `wrangler.toml`. A small, focused repo is a feature — critical infrastructure should be minimal and auditable.

**Repo structure:**
```
comfy-router/
├── src/
│   └── index.js          # Worker routing logic
├── wrangler.toml          # Cloudflare config (routes, env)
├── package.json           # Wrangler dependency
├── .github/
│   └── workflows/
│       └── deploy.yml     # Wrangler deploy on push to main
├── README.md              # Setup, architecture, runbook
└── AGENTS.md              # Agent instructions
```

### Optional Enhancements
1. Add health check endpoint in Worker (`/__health` → 200 with routing table info)
2. Add sitemap index generation/stitching
3. Add Cloudflare Worker analytics dashboard

---

## Timeline Estimate

| Phase | Effort | Dependencies |
|---|---|---|
| 1. Pre-Migration Prep | 2-4 hours | Framer support verification (BLOCKER) |
| 2. Worker Development | 2-3 hours | Cloudflare account setup |
| 3. Astro Site Changes | 30 min | Verify asset paths |
| 4. DNS Migration | 1-2 hours | TTL lowered 48h prior |
| 5. Monitoring Setup | 1 hour | Post-migration |
| **Total** | **~8-12 hours** | Spread across a few days for TTL propagation |

---

## Open Questions

1. ~~**Framer plan verification**~~ — ✅ Resolved. Custom Proxy add-on purchased.
2. **www vs non-www canonicalization**: Which should be the canonical domain? Currently `comfy.org` redirects to `www.comfy.org` via Framer.
3. ~~**Where should the Worker code live?**~~ — ✅ Resolved. Separate `comfy-router` repo.
4. ~~**Staging strategy**~~ — ✅ Resolved. See "Staging & Testing Strategy" section below.
5. **Sitemap merging**: Do we need a unified sitemap index, or is it acceptable to have separate sitemaps submitted to GSC?

## Scale & Cost Projections

Cloudflare Workers are battle-tested at massive scale (Discord, Shopify, and thousands of production sites). Key numbers:

| Traffic Level | Requests/month | CF Workers Cost | Notes |
|---|---|---|---|
| 100K visitors/day | ~10M req/mo | $5/mo (Paid plan) | Included in base plan |
| 1M visitors/day | ~100M req/mo | ~$50/mo | $0.50 per million after 10M |
| 5M visitors/day | ~500M req/mo | ~$250/mo | Still cheaper than Vercel bandwidth |
| 10M visitors/day | ~1B req/mo | ~$500/mo | Enterprise tier available if needed |

- **No cold starts** — Workers use V8 isolates, not containers
- **99.99% uptime SLA** on the Paid plan
- **300+ edge locations** globally
- **Sub-millisecond routing overhead** — the Worker is just a `fetch()` passthrough

---

## Staging & Testing Strategy

This is the plan for demonstrating the setup works before any DNS cutover, so the entire team can verify.

### Layer 1: Local Development (`wrangler dev`)

Cloudflare provides `wrangler dev` which runs the Worker locally using the same `workerd` runtime used in production (via Miniflare). This means:

```bash
cd comfy-router
npx wrangler dev
# Worker runs at http://localhost:8787
# curl http://localhost:8787/templates/ → proxies to Vercel
# curl http://localhost:8787/ → proxies to Framer
```

This lets developers verify routing logic instantly without any deployment.

### Layer 2: Deployed Preview URLs (share with team)

Cloudflare Workers support **preview URLs** — every `wrangler versions upload` generates a unique URL:

```
<version-hash>-comfy-router.<subdomain>.workers.dev
```

You can also create **aliased previews** for stable sharing:

```bash
wrangler versions upload --preview-alias staging
# Creates: staging-comfy-router.<subdomain>.workers.dev
```

Team members can visit `staging-comfy-router.<subdomain>.workers.dev/templates/` and see the Vercel site proxied through the Worker. The root path will show Framer proxied through.

**Limitation**: Preview URLs run on `*.workers.dev`, not on `comfy.org`. This means Framer's canonical URL checks and some client-side routing may behave differently. Good for verifying basic routing; not a perfect production replica.

### Layer 3: Staging Subdomain (production-like)

For a true production test, use a staging subdomain **before** touching the main domain:

1. In Cloudflare DNS, add `staging.comfy.org` with a proxied `AAAA` record pointing to `100::` (dummy)
2. Deploy the Worker with a staging environment route:

```toml
[env.staging]
routes = [
  { pattern = "staging.comfy.org/*", zone_name = "comfy.org" }
]
```

3. Deploy: `wrangler deploy --env staging`
4. Visit `staging.comfy.org/templates/` — full production routing through CF edge
5. Visit `staging.comfy.org/` — Framer marketing site via proxy

This is the **key demo for other engineers**: a real Cloudflare edge deployment, real DNS, real proxying, before touching the production domain.

### Layer 4: Unit Tests (`@cloudflare/vitest-pool-workers`)

The `@cloudflare/vitest-pool-workers` package runs tests inside the actual Workers runtime (`workerd`), catching issues that Node.js tests miss:

```typescript
import { describe, it, expect } from 'vitest';
import worker from '../src/index';

describe('routing', () => {
  it('routes /templates/ to Vercel', async () => {
    const request = new Request('https://comfy.org/templates/');
    const response = await worker.fetch(request, {}, {});
    expect(response.headers.get('X-Served-By')).toBe('vercel-templates');
  });

  it('routes / to Framer', async () => {
    const request = new Request('https://comfy.org/');
    const response = await worker.fetch(request, {}, {});
    expect(response.headers.get('X-Served-By')).toBe('framer-marketing');
  });

  it('routes /ja/templates/ to Vercel', async () => {
    const request = new Request('https://comfy.org/ja/templates/');
    const response = await worker.fetch(request, {}, {});
    expect(response.headers.get('X-Served-By')).toBe('vercel-templates');
  });
});
```

### Verification Checklist (for staging demo)

- [ ] `staging.comfy.org/` loads Framer homepage
- [ ] `staging.comfy.org/pricing` loads Framer pricing page
- [ ] `staging.comfy.org/templates/` loads templates listing from Vercel
- [ ] `staging.comfy.org/templates/flux_schnell` loads template detail page
- [ ] `staging.comfy.org/ja/templates/` loads Japanese templates
- [ ] `staging.comfy.org/thumbnails/*.webp` loads images (200 status, correct Content-Type)
- [ ] `staging.comfy.org/_astro/*` loads JS/CSS assets
- [ ] Framer forms submit successfully (test any contact/signup forms)
- [ ] Framer page transitions (SPA navigation) work smoothly
- [ ] Framer animations render correctly
- [ ] `X-Served-By` response header shows correct origin for each path
- [ ] No console errors in browser dev tools
- [ ] Lighthouse score on templates pages matches pre-proxy baseline

---

## Research Findings & Gotchas

Comprehensive findings from Cloudflare docs, Framer docs, and community reports (Feb 2026).

### Critical: Framer-Specific Gotchas

From [Framer's reverse proxy docs](https://www.framer.com/help/articles/how-to-self-host-using-reverse-proxy/) (updated Jan 28, 2026):

1. **Do NOT modify `<head>` tags** — Framer's JavaScript manages some `<head>` tags. Changing or removing them breaks the site. Adding tags is safe.
2. **Do NOT modify `<div id="main">`** — This is React-managed content. Our Worker doesn't touch response bodies, so this is fine.
3. **Trailing slashes break Framer** — Framer's client-side routing expects no trailing slashes. `/pricing/` can break navigation. Our Worker must NOT add trailing slashes to Framer requests.
4. **CSP must allowlist `worker-src 'self' blob:`** — Framer's anti-bot system uses web workers for form submissions. If we ever add a custom CSP to the Worker, this is mandatory.
5. **Set canonical URL in Framer** — In Site Settings → Domains → Advanced, set the canonical to `comfy.org` (or `www.comfy.org`). This makes Framer generate correct `<link rel="canonical">` and sitemap URLs.
6. **Use `*.framer.website` as origin** — Never point DNS directly at Framer when proxying. Use the free subdomain (e.g., `comfy.framer.website`) as the fetch origin.
7. **No AAAA records** — Framer doesn't support IPv6. Remove any `AAAA` records when setting up Cloudflare DNS to avoid TLS certificate issues.

### Critical: Cloudflare-Specific Gotchas

From [Cloudflare Workers best practices](https://developers.cloudflare.com/workers/best-practices/workers-best-practices/) (updated Feb 12, 2026):

1. **Use ES modules syntax, NOT Service Worker syntax** — Framer's docs show the old `addEventListener('fetch', ...)` pattern. This is deprecated. Use `export default { async fetch() {} }` instead.
2. **Set `compatibility_date` to today** — Gets the latest runtime behavior and bug fixes.
3. **Enable observability** — Enable Workers Logs and Traces in `wrangler.toml`. Use structured JSON logging with `console.log(JSON.stringify({...}))`. Without this, production issues are a black box.
4. **DNS records required for routes** — If using Worker routes (not custom domains), you MUST have a proxied (orange-cloud) DNS record for the hostname. Without it, requests return `ERR_NAME_NOT_RESOLVED`. Use a dummy `AAAA` record pointing to `100::`.
5. **Disable "Rocket Loader"** — Per Framer docs: Speed → Optimization → Content optimizations → disable Rocket Loader. Framer's JavaScript is already optimized.
6. **Disable "Always Online"** — A [known issue](https://community.cloudflare.com/t/cloudflare-worker-on-specific-path-failing-results-in-all-calls-to-also-fail/282606) causes Always Online to propagate 526 errors from one Worker route to all routes on the same hostname. Disable it.
7. **SSL mode must be "Full" or "Full (strict)"** — "Flexible" SSL causes 301 redirects that break CORS and proxied requests.
8. **Don't store request-scoped state globally** — Workers reuse V8 isolates across requests. Mutable globals leak between requests.
9. **Use `redirect: 'manual'` in `fetch()`** — Don't auto-follow redirects from origins. Pass them through to the client so the browser handles them correctly.
10. **Buffer POST request bodies** — When forwarding POST requests (e.g., Framer form submissions), read the body as `arrayBuffer()` first, not streaming. Streaming can break with encoded payloads.

### Worker Code Updates Based on Research

The Worker code in Phase 2 needs these updates from the research:

```javascript
// Updated based on research findings:
// 1. Use ES modules (NOT addEventListener)  ✅ already done
// 2. Buffer POST bodies for form submissions  ← NEW
// 3. Use redirect: 'manual'                   ✅ already done
// 4. Structured JSON logging                  ← NEW
// 5. Explicit error handling (no passThroughOnException) ✅ already done
// 6. Strip trailing slashes for Framer requests ← NEW

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    let pathname = url.pathname;

    const isVercel = shouldRouteToVercel(pathname);
    const origin = isVercel ? VERCEL_ORIGIN : FRAMER_ORIGIN;

    // Strip trailing slashes for Framer (their client-side routing breaks with them)
    if (!isVercel && pathname.length > 1 && pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1);
    }

    const originUrl = new URL(pathname + url.search, origin);

    const headers = new Headers(request.headers);
    headers.set('X-Forwarded-Host', url.hostname);
    headers.set('X-Forwarded-Proto', 'https');

    // Buffer request body for POST (fixes Framer form submissions)
    let body = null;
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      body = await request.arrayBuffer();
    }

    try {
      const response = await fetch(originUrl.toString(), {
        method: request.method,
        headers: headers,
        body: body,
        redirect: 'manual',
      });

      const newHeaders = new Headers(response.headers);
      newHeaders.set('X-Served-By', isVercel ? 'vercel-templates' : 'framer-marketing');

      // Structured logging for observability
      console.log(JSON.stringify({
        message: 'request routed',
        method: request.method,
        path: url.pathname,
        origin: isVercel ? 'vercel' : 'framer',
        status: response.status,
      }));

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(JSON.stringify({
        message: 'origin fetch failed',
        error: message,
        origin: origin,
        path: url.pathname,
      }));
      return new Response('Origin unavailable', {
        status: 502,
        headers: { 'Content-Type': 'text/plain' },
      });
    }
  },
};
```

### Updated Wrangler Config Based on Research

```toml
# wrangler.toml
name = "comfy-router"
main = "src/index.js"
compatibility_date = "2026-02-13"
compatibility_flags = ["nodejs_compat"]

# Observability — critical for production
[observability]
enabled = true
[observability.logs]
head_sampling_rate = 1  # 100% log capture; lower for high traffic
[observability.traces]
enabled = true
head_sampling_rate = 0.01  # 1% trace sampling

# Preview URLs for team testing
preview_urls = true

# Production environment
[env.production]
routes = [
  { pattern = "comfy.org/*", zone_name = "comfy.org" },
  { pattern = "www.comfy.org/*", zone_name = "comfy.org" }
]

# Staging environment (test before DNS cutover)
[env.staging]
routes = [
  { pattern = "staging.comfy.org/*", zone_name = "comfy.org" }
]
```

### Cloudflare Dashboard Settings Checklist

After adding the zone to Cloudflare, configure these in the dashboard:

- [ ] **SSL/TLS** → Mode: **Full (strict)**
- [ ] **Speed → Optimization → Content optimizations** → **Rocket Loader: OFF**
- [ ] **Caching → Configuration** → **Always Online: OFF**
- [ ] **DNS** → All records for `comfy.org` are **proxied** (orange cloud)
- [ ] **DNS** → No `AAAA` records (Framer doesn't support IPv6)
- [ ] **DNS** → CAA records allow `letsencrypt.org` and `sectigo.com` (for Framer TLS if still needed)

### Framer Migration Path (if ever needed)

Framer provides a documented [zero-downtime migration path](https://www.framer.com/help/articles/how-to-migrate-to-framer-from-an-external-proxy/) from external proxy back to Framer-managed hosting. Key points:
- Framer has separate staging (`*.framer.app`) and production (`*.framer.website`) domains
- You can route proxy traffic to staging during migration
- DNS rollback is instant by pointing back to the proxy
