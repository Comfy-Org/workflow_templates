# ADR: Cloudflare Worker as Reverse Proxy for comfy.org

## Status

Accepted

## Date

2026-02-15

## Context

The Comfy Org operates two web properties:

- **Marketing site** (Framer): comfy.org — landing pages, pricing, about, blog
- **Templates site** (Astro on Vercel): workflow-templates.vercel.app — 200+ ComfyUI workflow templates in 11 languages

The templates site needs to be served at `comfy.org/templates/` to:

1. Inherit domain authority from comfy.org for SEO
2. Present a unified experience to users
3. Enable future expansion (e.g., /blog, /docs, /app under the same domain)

## Decision

Use a **Cloudflare Worker** as the front door for all comfy.org traffic, routing requests to the appropriate origin based on URL path.

Architecture:

```
User → Cloudflare Edge (Worker)
  ├─ /templates/*           → Vercel (Astro static site)
  ├─ /{locale}/templates/*  → Vercel (i18n, 11 locales)
  ├─ /_astro/*, static assets → Vercel
  └─ /* (everything else)   → Framer (marketing site)
```

The Worker lives in a separate repo (`Comfy-Org/comfy-router`) because it's the routing layer for ALL of comfy.org, not specific to templates.

## Alternatives Considered

### Alternative 1: Vercel Edge Middleware / Rewrites

- **Pros:** Single platform (Vercel already hosts Astro), no new provider
- **Cons:**
  - Header contamination: Vercel's CSP/security headers apply to proxied Framer responses, breaking Framer scripts
  - Astro static rewrite limitation: Vercel warns rewrites don't work cleanly with Astro static output
  - Bandwidth trap: all Framer marketing traffic counted as Vercel bandwidth
  - Domain conflict: adding comfy.org to Vercel while Framer claims it creates verification issues
  - Couples routing to Vercel — hard to add non-Vercel origins later

### Alternative 2: Framer Advanced Hosting (Multi Site)

- **Pros:** No external infrastructure, Framer handles everything, automatic sitemap merging
- **Cons:**
  - Enterprise-only feature (beta for Scale plans as of Jan 2026)
  - Framer becomes the front door — reverses the architecture (Framer owns the domain, Vercel is the external origin)
  - Less control over caching, headers, routing logic
  - Vendor lock-in to Framer for routing decisions

### Alternative 3: Subdomain approach (templates.comfy.org)

- **Pros:** Simplest — just point a subdomain to Vercel, no proxy needed
- **Cons:** Subdomains don't inherit parent domain SEO authority. Google treats subdomains as separate sites.

## Consequences

### Positive

- Clean separation: routing layer is independent of any origin
- Extensible: add `/blog`, `/docs`, `/app` by editing one Worker file
- Fast rollback: remove Worker route or revert nameservers in < 5 min
- Low cost: Cloudflare Workers free tier (100K req/day) is sufficient
- Framer site unchanged — no modifications to marketing content
- SEO benefit: templates pages on comfy.org domain

### Negative

- New provider (Cloudflare) to manage — account, billing, dashboard settings
- Extra network hop (user → CF edge → origin) adds ~5-20ms latency
- Framer origin complexity: `.framer.app` is auth-protected, `.framer.website` unavailable, required using `www.comfy.org` as origin (with grey-cloud CNAME for production)
- DNS migration risk: nameserver cutover is a single point of failure (mitigated by TTL lowering and instant rollback)

### Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Worker outage takes down all of comfy.org | Remove Worker route in Cloudflare dashboard (< 2 min) |
| DNS propagation issues during cutover | Lower TTL to 60s 48 hours before cutover |
| Framer forms/animations break through proxy | Worker does NOT modify response bodies; tested on workers.dev preview |
| Circular dependency after DNS cutover | Grey-cloud CNAME `framer-origin.comfy.org` → `sites.framer.app` bypasses Worker |

## Implementation Details

### Repos

| Repo | Purpose |
|------|---------|
| [`Comfy-Org/comfy-router`](https://github.com/Comfy-Org/comfy-router) | Cloudflare Worker — routing logic, tests, CI/CD |
| [`Comfy-Org/workflow_templates`](https://github.com/Comfy-Org/workflow_templates) | Astro site — routes nested under `/templates/` prefix |

### Key Worker Behaviors

- **Never modifies response bodies** — both Framer and Astro manage their own HTML
- **Strips trailing slashes for Framer** — Framer's client-side routing breaks with them
- **Buffers POST bodies** — uses `arrayBuffer()` not streaming (fixes Framer form submissions)
- **`redirect: 'manual'`** — passes origin redirects through to the browser
- **301 redirects** old paths (`/category/*`, `/model/*`, `/tag/*`, `/og/*`, `/thumbnails/*`) to `/templates/` equivalents
- **Health endpoint** at `/__health` returns JSON with origin config

### Sitemap Strategy

Astro generates `sitemap-templates-index.xml` and `sitemap-templates-0.xml` using `filenameBase: 'sitemap-templates'`. The index references both the templates sitemap and Framer's `/sitemap.xml` via `customSitemaps`. No sitemap stitching at the edge — both are submitted to GSC independently.

### Framer Origin Gotchas

- `.framer.app` staging subdomain is **auth-protected** (303 redirect to login)
- `.framer.website` free subdomain **cannot be added** while a custom domain is connected
- `sites.framer.app` with Host header override returns "Site Not Found" (Framer checks SNI)
- **Solution for workers.dev preview:** use `www.comfy.org` directly (no circular dependency)
- **Solution for production:** grey-cloud CNAME `framer-origin.comfy.org` → `sites.framer.app`

### Cloudflare Dashboard Settings (Required)

| Setting | Value | Why |
|---------|-------|-----|
| SSL/TLS Mode | Full (strict) | "Flexible" causes redirect loops |
| Rocket Loader | OFF | Breaks Framer's JavaScript |
| Always Online | OFF | Propagates 526 errors across all Worker routes |
| AAAA records | None | Framer doesn't support IPv6, causes TLS issues |

---

## Cutover Procedure

### DNS Records

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| A | @ | 192.0.2.1 | ✅ Proxied |
| CNAME | www | comfy.org | ✅ Proxied |
| CNAME | framer-origin | sites.framer.app | ❌ DNS-only |

Preserve existing MX (Google Workspace) and TXT (SPF, Firebase, Stripe) records. See `docs/comfy-org-dns-records.bind` for the full backup.

### Steps

1. Lower TTL to 60s on current DNS records (48 hours before cutover)
2. Add DNS records in Cloudflare (table above)
3. Configure dashboard settings (table above)
4. Update `FRAMER_ORIGIN` in Worker to `https://framer-origin.comfy.org`
5. Switch nameservers to Cloudflare at registrar
6. Wait for DNS propagation (~5–30 min)
7. Deploy Worker: `npx wrangler deploy --env production`
8. Run smoke tests, monitor for 48 hours

### Rollback (< 5 min)

| Option | Action | Speed |
|--------|--------|-------|
| A | Remove Worker routes in CF dashboard + point DNS to Framer | ~2 min |
| B | Revert nameservers at registrar | ~5 min + TTL |
| C | Deploy hotfix to Worker | Seconds |

---

## References

- [Framer Reverse Proxy Docs](https://www.framer.com/help/articles/how-to-self-host-using-reverse-proxy/)
- [Framer Cloudflare Guide](https://www.framer.com/help/articles/how-to-proxy-with-cloudflare/)
- [Cloudflare Workers Best Practices](https://developers.cloudflare.com/workers/best-practices/)
- PRs: [workflow_templates#595](https://github.com/Comfy-Org/workflow_templates/pull/595), [comfy-router#1](https://github.com/Comfy-Org/comfy-router/pull/1)
