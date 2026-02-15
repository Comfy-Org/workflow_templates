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

Use a **Cloudflare Worker** ([`Comfy-Org/comfy-router`](https://github.com/Comfy-Org/comfy-router)) as the front door for all comfy.org traffic, routing requests to the appropriate origin based on URL path.

```
User → Cloudflare Edge (Worker)
  ├─ /templates/*           → Vercel (Astro static site)
  ├─ /{locale}/templates/*  → Vercel (i18n, 11 locales)
  ├─ /_astro/*, static assets → Vercel
  └─ /* (everything else)   → Framer (marketing site)
```

The Worker lives in a separate repo because it's the routing layer for ALL of comfy.org, not specific to templates. Operational docs (deployment, runbooks, DNS) live in that repo.

## Alternatives Considered

### Vercel Edge Middleware / Rewrites

- Header contamination: Vercel's CSP/security headers break proxied Framer responses
- Astro static rewrite limitation: Vercel warns rewrites don't work cleanly with Astro static output
- Bandwidth trap: all Framer marketing traffic counted as Vercel bandwidth
- Couples routing to Vercel — hard to add non-Vercel origins later

### Framer Advanced Hosting (Multi Site)

- Enterprise-only feature (beta for Scale plans as of Jan 2026)
- Framer becomes the front door — vendor lock-in for routing decisions
- Less control over caching, headers, routing logic

### Subdomain (templates.comfy.org)

- Subdomains don't inherit parent domain SEO authority — Google treats them as separate sites

## Consequences

### Positive

- Clean separation: routing layer is independent of any origin
- Extensible: add `/blog`, `/docs`, `/app` by editing one Worker file
- Fast rollback: remove Worker route or revert nameservers in < 5 min
- Low cost: Cloudflare Workers free tier (100K req/day) is sufficient
- Framer site unchanged — no modifications to marketing content

### Negative

- New provider (Cloudflare) to manage
- Extra network hop adds ~5-20ms latency
- DNS migration is a one-time risk (mitigated by TTL lowering and instant rollback)

## References

- [`Comfy-Org/comfy-router`](https://github.com/Comfy-Org/comfy-router) — Worker code, operational docs, deployment runbooks
- PRs: [workflow_templates#595](https://github.com/Comfy-Org/workflow_templates/pull/595), [comfy-router#1](https://github.com/Comfy-Org/comfy-router/pull/1)
