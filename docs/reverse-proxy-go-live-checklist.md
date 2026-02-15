# Reverse Proxy Go-Live Checklist

> Condensed checklist of everything remaining to ship the CF Worker reverse proxy for comfy.org.
> For full context see [plan](./reverse-proxy-plan.md), [runbook](./reverse-proxy-deployment-runbook.md), [ADR](./reverse-proxy-adr.md).

---

## ✅ Already Done

- [x] Astro site restructured: all routes under `/templates/` prefix
- [x] Route helpers, sitemap, OG images, structured data updated
- [x] `comfy-router` Worker written, tested (57 tests passing), deployed to workers.dev preview
- [x] Workers.dev preview verified: templates → Vercel ✓, marketing → Framer ✓
- [x] CI/CD pipeline in `comfy-router` repo (GitHub Actions: test → staging → production)
- [x] DNS records documented (`docs/comfy-org-dns-records.bind`)
- [x] Framer canonical URL set to `https://comfy.org`
- [x] ADR, emergency runbook, TL announcement doc created

---

## Phase 1: Pre-Cutover (do now, before scheduling cutover)

### Code

- [ ] Merge `feat/reverse-proxy-setup` branch into `main` in `workflow_templates` repo
  - This deploys the `/templates/`-prefixed routes to Vercel production
  - Verify `workflow-templates.vercel.app/templates/` works after merge
- [ ] Push latest `comfy-router` changes to `Comfy-Org/comfy-router` main
- [ ] Add `CLOUDFLARE_API_TOKEN` as GitHub Actions secret in `comfy-router` repo

### Comms

- [ ] Share `docs/reverse-proxy-cutover-announcement.md` in eng Slack channel
- [ ] Distribute `docs/reverse-proxy-emergency-runbook.md` to on-call team
- [ ] Schedule cutover window (low-traffic hours, ideally weekday morning)

---

## Phase 2: Cutover Day

### 2a. Cloudflare DNS Setup

- [ ] Verify `comfy.org` zone exists in Cloudflare dashboard
- [ ] Add DNS records in Cloudflare:

  | Type   | Name             | Content           | Proxy       |
  |--------|------------------|-------------------|-------------|
  | A      | @                | 192.0.2.1         | ✅ Proxied  |
  | CNAME  | www              | comfy.org         | ✅ Proxied  |
  | CNAME  | framer-origin    | sites.framer.app  | ❌ DNS-only |

- [ ] Preserve existing records: MX (Google Workspace), TXT (SPF, Firebase, Stripe, etc.)
- [ ] Verify: **no AAAA records** (Framer doesn't support IPv6)

### 2b. Cloudflare Dashboard Settings

- [ ] SSL/TLS → Mode: **Full (strict)**
- [ ] Speed → Optimization → Rocket Loader: **OFF**
- [ ] Caching → Always Online: **OFF**

### 2c. Update Worker for Production

- [ ] Change `FRAMER_ORIGIN` in `comfy-router/src/index.js`:
  ```javascript
  const FRAMER_ORIGIN = 'https://framer-origin.comfy.org';
  ```
- [ ] Run tests: `npm test` (all 57 pass)
- [ ] Push to `comfy-router` main

### 2d. Switch Nameservers

- [ ] At domain registrar, change nameservers to Cloudflare-assigned values
- [ ] Wait for DNS propagation (~5-30 min):
  ```bash
  dig comfy.org @8.8.8.8 +short
  dig comfy.org @1.1.1.1 +short
  ```

### 2e. Deploy Worker to Production

- [ ] ```bash
  cd comfy-router && npx wrangler deploy --env production
  ```
- [ ] Verify Worker is bound to `comfy.org/*` and `www.comfy.org/*`

---

## Phase 3: Verification (immediately after cutover)

### CLI Smoke Tests

```bash
# Framer pages
curl -sI https://comfy.org/ | grep -E 'HTTP|X-Served-By'
curl -sI https://comfy.org/pricing | grep -E 'HTTP|X-Served-By'

# Templates pages
curl -sI https://comfy.org/templates/ | grep -E 'HTTP|X-Served-By'
curl -sI https://comfy.org/templates/flux_schnell | grep -E 'HTTP|X-Served-By'

# Localized
curl -sI https://comfy.org/ja/templates/ | grep -E 'HTTP|X-Served-By'

# Assets
curl -sI https://comfy.org/templates/thumbnails/flux_schnell-1.webp | grep -E 'HTTP|Content-Type'
curl -sI https://comfy.org/_astro/ | grep -E 'HTTP|X-Served-By'

# 301 redirects (old paths)
curl -sI https://comfy.org/category/image | grep -E 'HTTP|Location'
curl -sI https://comfy.org/model/flux | grep -E 'HTTP|Location'

# www redirect
curl -sI https://www.comfy.org/ | grep -E 'HTTP|X-Served-By'
```

### Browser Test Plan

#### Framer (marketing)
- [ ] `comfy.org/` — Homepage loads, animations play
- [ ] `comfy.org/pricing` — Pricing page loads
- [ ] Click navigation between marketing pages (SPA transitions work)
- [ ] Submit a form (contact/signup) — anti-bot + submission works
- [ ] No console errors in DevTools
- [ ] Check `X-Served-By: framer-marketing` in Network tab

#### Templates (Vercel/Astro)
- [ ] `comfy.org/templates/` — Listing page loads with thumbnails
- [ ] `comfy.org/templates/flux_schnell` — Detail page loads, thumbnails visible
- [ ] `comfy.org/templates/category/image/` — Category page loads
- [ ] `comfy.org/templates/model/flux/` — Model page loads
- [ ] `comfy.org/templates/tag/portrait/` — Tag page loads
- [ ] Check `X-Served-By: vercel-templates` in Network tab

#### i18n
- [ ] `comfy.org/ja/templates/` — Japanese templates load
- [ ] `comfy.org/zh/templates/` — Chinese templates load
- [ ] `comfy.org/ar/templates/` — Arabic templates load (RTL layout correct)

#### SEO
- [ ] View source on `/templates/` — `<link rel="canonical">` points to `https://comfy.org/templates/`
- [ ] View source on `/` — Framer canonical is `https://comfy.org`
- [ ] `comfy.org/sitemap-templates.xml` returns valid XML
- [ ] `comfy.org/sitemap.xml` (Framer) returns valid XML

#### 301 Redirects (old URLs)
- [ ] `comfy.org/category/image` → 301 to `comfy.org/templates/category/image`
- [ ] `comfy.org/model/flux` → 301 to `comfy.org/templates/model/flux`
- [ ] `comfy.org/thumbnails/img.webp` → 301 to `comfy.org/templates/thumbnails/img.webp`

#### Performance
- [ ] Run Lighthouse on `comfy.org/templates/` — compare to pre-proxy baseline
- [ ] Run Lighthouse on `comfy.org/` — Framer performance unchanged

#### Mobile
- [ ] Test `comfy.org/` on mobile browser
- [ ] Test `comfy.org/templates/` on mobile browser

---

## Phase 4: Post-Cutover (48 hours)

### Monitoring
- [ ] Cloudflare Workers Analytics: error rate < 1%, p99 latency < 2s
- [ ] Cloudflare Workers Logs: structured JSON logs showing routing decisions
- [ ] Vercel Analytics: templates traffic appearing
- [ ] Set up Cloudflare alert policies (error rate > 1%, 502 codes, latency > 2s)

### SEO
- [ ] Add/verify `comfy.org` in Google Search Console
- [ ] Submit sitemaps:
  - `https://comfy.org/sitemap-templates.xml`
  - `https://comfy.org/sitemap.xml`
- [ ] Request indexing: `/templates/`, top 5 template detail pages
- [ ] Monitor GSC Coverage report over next 2-6 weeks

### Cleanup
- [ ] Remove old DNS records from previous provider (if any remain)
- [ ] Update any internal docs/wikis that reference `workflow-templates.vercel.app` URLs
- [ ] Close the tracking ticket/issue

---

## Rollback (if anything goes wrong)

**Time: < 5 minutes.** See [emergency runbook](./reverse-proxy-emergency-runbook.md) for full details.

| Option | Action | Speed |
|--------|--------|-------|
| **A** | Remove Worker routes in CF dashboard + point DNS to Framer IPs | ~2 min |
| **B** | Revert nameservers at registrar | ~5 min + TTL |
| **C** | Deploy hotfix to Worker | Seconds |
