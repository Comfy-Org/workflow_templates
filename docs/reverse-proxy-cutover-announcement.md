# comfy.org Reverse Proxy Cutover

## What's happening

We're moving comfy.org DNS to Cloudflare and putting a CF Worker (`comfy-router`) in front as an edge router:

- `/templates/*` → Vercel (Astro site)
- Everything else → Framer (marketing site, unchanged)

## Why

- **SEO**: Templates inherit comfy.org domain authority instead of living on a separate domain
- **Extensibility**: Clean pattern for future routes (`/blog`, `/docs`, `/app`)
- **Architecture**: Single entry point, independent deploys per service

## What changes for users

**Nothing.** comfy.org serves the same content. Templates move to `comfy.org/templates/` instead of a separate domain.

## What changes for engineers

- **DNS** now managed in Cloudflare (was registrar/Framer)
- **Edge routing** handled by [`Comfy-Org/comfy-router`](https://github.com/Comfy-Org/comfy-router) (Cloudflare Worker)
- **Templates site** stays deployed on Vercel (`workflow-templates.vercel.app`) — no changes to dev workflow
- **Framer marketing site** unchanged, just proxied through the Worker

## Timeline

1. **Pre-cutover**: Point nameservers to Cloudflare, wait 48hr for TTL propagation
2. **Cutover**: Enable Worker route during low-traffic hours
3. **Post-cutover**: 48hr monitoring window

## Rollback (< 5 min)

- **Option A**: Remove the Worker route in Cloudflare → traffic goes direct to Framer
- **Option B**: Revert nameservers to previous provider

## Preview

Test now: **https://comfy-router.comfy-org.workers.dev**

## Questions?

Contact: **[TBD — add point person / Slack channel]**
