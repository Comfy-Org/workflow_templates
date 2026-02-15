# Reverse Proxy Deployment Runbook

**Date:** February 13, 2026
**Prerequisite:** [Reverse Proxy Plan](./reverse-proxy-plan.md)

---

## Current State

The Astro site is currently deployed at `workflow-templates.vercel.app`. It has never been on a custom domain — the reverse proxy will be its first exposure at `comfy.org/templates/`.

The Astro site in this repo has already been restructured:

- All routes nested under `/templates/` prefix (`/templates/category/`, `/templates/model/`, `/templates/tag/`, `/templates/og/`, `/templates/thumbnails/`)
- Centralized route helpers in `site/src/lib/routes.ts`
- Sitemap config updated for new paths
- `site/src/config/site.ts` default origin set to `https://comfy.org`
- All internal links, OG images, and structured data updated to new paths
- Commit: `fda6d27` on branch `feat/reverse-proxy-setup`

The Cloudflare Worker repo (`Comfy-Org/comfy-router`) has been created (private).

### Framer Configuration (Done)

- [x] Framer Scale plan with Custom Proxy add-on ($300/mo) is active
- [x] Canonical URL defaults to `https://comfy.org` (no change needed)
- [x] Framer staging subdomain: `https://significant-deck-845835.framer.app/` (auth-protected, staging only)
- [x] Framer origin resolved: `https://www.comfy.org` (production CNAME → `sites.framer.app`)
- [ ] Document current DNS records for rollback (see Step 6)

**Worker origin for Framer:** `https://www.comfy.org` (for workers.dev preview; switch to grey-cloud CNAME `framer-origin.comfy.org` after DNS cutover)

---

## Deployment Sequence

### ~~Step 1: Write Vitest Tests in comfy-router~~ ✅ Done

Tests already exist in `comfy-router/test/routing.test.js` — 33 tests covering Vercel routing, Framer routing, localized paths, and 301 redirects. All passing.

### ~~Step 2: Local Development Testing~~ ✅ Done

Origin URLs verified and fixed:
- `VERCEL_ORIGIN`: `https://workflow-templates.vercel.app` (confirmed 200)
- `FRAMER_ORIGIN`: `https://www.comfy.org` (confirmed working — resolves via CNAME → `sites.framer.app`)

Previous attempts:
- `.framer.app` staging subdomain is auth-protected (303 redirect to login)
- `.framer.website` free subdomain cannot be added while custom domain (`www.comfy.org`) is connected
- `sites.framer.app` with Host header override returns "Site Not Found" (Framer checks SNI, not just Host)
- Solution: use `www.comfy.org` directly as origin (no circular dependency on workers.dev)

Pushed fix to `comfy-router` main: `de92c8f`.

---

### ~~Step 3: Deploy to workers.dev Preview URL~~ ✅ Done

- API token generated (Edit Cloudflare Workers template, scoped to comfy.org, Comfy Org account)
- Worker deployed to workers.dev preview via `npx wrangler deploy`
- Preview URL: `https://comfy-router.comfy-org.workers.dev`
- ✅ Templates routing works: `/templates/` → Vercel (200)
- ✅ Framer routing works: `/` → Framer marketing site (200)
- ✅ Static asset routing: `/brand/`, `/logos/`, `/previews/`, `/workflows/`, `/favicon.svg`, `/_vercel/*` → Vercel
- ⚠️ Thumbnail 404s: expected — branch not merged to main yet (Vercel still serves old `/thumbnails/` paths)

**⚠️ Pre-production note:** `FRAMER_ORIGIN` is currently `https://www.comfy.org`. After DNS cutover to Cloudflare, this will create a circular loop (Worker → Worker). Before going live, add a grey-cloud (DNS-only) CNAME `framer-origin.comfy.org` → `sites.framer.app` and update `FRAMER_ORIGIN` to `https://framer-origin.comfy.org`.

**Test the preview URL:**

```bash
PREVIEW_URL="comfy-router.comfy-org.workers.dev"

# Templates
curl -sI "https://$PREVIEW_URL/templates/" | grep X-Served-By

# Marketing (Framer)
curl -sI "https://$PREVIEW_URL/" | grep X-Served-By

# Thumbnails
curl -sI "https://$PREVIEW_URL/templates/thumbnails/flux_schnell-1.webp" | grep -E 'status|Content-Type'
```

Open in browser and verify both Vercel and Framer responses render.

**Share this URL with the team for review.**

> **Limitation:** The hostname is `*.workers.dev`, not `comfy.org`. Framer's canonical URL checks and some client-side routing may behave slightly differently. This is good enough for verifying routing logic, not a perfect production replica.

---

### Step 4: (Optional) Staging Subdomain Test

> **⚠️ REQUIRES HUMAN ACTION:** Only possible if `comfy.org` DNS is already on Cloudflare.
>
> Skip this step if Cloudflare is not yet authoritative for `comfy.org`. Go directly to Step 5.

If `comfy.org` is already on Cloudflare (or you decide to add the zone first without changing nameservers):

#### 4a. Add comfy.org Zone to Cloudflare

> **⚠️ HUMAN ACTION REQUIRED**

1. In Cloudflare dashboard → **Add a Site** → enter `comfy.org`
2. Select the **Free** plan (Workers are billed separately)
3. Cloudflare will scan existing DNS records — review and import them
4. **DO NOT change nameservers yet** — just set up the zone

#### 4b. Create Staging DNS Record

> **⚠️ HUMAN ACTION REQUIRED**

In Cloudflare DNS for `comfy.org`:
1. Add an `AAAA` record: `staging` → `100::` (proxied / orange cloud)
2. **Do NOT add AAAA records for the root domain yet**

#### 4c. Deploy Worker to Staging

```bash
cd comfy-router
npx wrangler deploy --env staging
```

This binds the Worker to `staging.comfy.org/*` (as defined in `wrangler.toml`).

#### 4d. Verify Staging

Run the full verification checklist:

```bash
STAGE="staging.comfy.org"

# Framer pages
curl -sI "https://$STAGE/" | grep -E 'HTTP|X-Served-By'
curl -sI "https://$STAGE/pricing" | grep -E 'HTTP|X-Served-By'

# Templates pages
curl -sI "https://$STAGE/templates/" | grep -E 'HTTP|X-Served-By'
curl -sI "https://$STAGE/templates/flux_schnell" | grep -E 'HTTP|X-Served-By'

# Localized templates
curl -sI "https://$STAGE/ja/templates/" | grep -E 'HTTP|X-Served-By'

# Assets
curl -sI "https://$STAGE/templates/thumbnails/flux_schnell-1.webp" | grep -E 'HTTP|Content-Type'
curl -sI "https://$STAGE/_astro/" | grep -E 'HTTP|X-Served-By'
```

Browser checklist:

- [ ] `staging.comfy.org/` — Framer homepage loads, animations work
- [ ] `staging.comfy.org/pricing` — Framer pricing page loads
- [ ] `staging.comfy.org/templates/` — Template listing from Vercel
- [ ] `staging.comfy.org/templates/flux_schnell` — Template detail page
- [ ] `staging.comfy.org/ja/templates/` — Japanese templates
- [ ] Framer forms submit successfully
- [ ] Framer SPA navigation (click between pages) works
- [ ] No console errors in browser dev tools
- [ ] `X-Served-By` header shows correct origin for each path

---

### Step 5: Alternative — Test with a Throwaway Domain

> If you don't want to touch `comfy.org` DNS until you've seen a full production-like test:

> **⚠️ HUMAN ACTION REQUIRED**

1. Register a cheap domain (e.g., `comfy-test.xyz` for ~$2/yr) or use one you already own
2. Add it as a zone in Cloudflare, point nameservers to Cloudflare
3. Add proxied `AAAA` record: `@` → `100::`
4. Update `wrangler.toml` with a test environment:

```toml
[env.test]
routes = [
  { pattern = "comfy-test.xyz/*", zone_name = "comfy-test.xyz" }
]
```

5. Deploy: `npx wrangler deploy --env test`
6. Full production-like test at `comfy-test.xyz` — real Cloudflare edge, real DNS, real proxying

This gives you full confidence before touching the production domain.

---

### Step 6: Pre-Cutover DNS Preparation

> **⚠️ HUMAN ACTION REQUIRED — Do this 48 hours before Step 7**

- [x] **Document current DNS records** — saved in `docs/comfy-org-dns-records.bind`
- [x] **Verify Vercel origin** — `workflow-templates.vercel.app` loads templates (confirmed)
- [x] **Verify Framer origin** — `www.comfy.org` loads Framer site (confirmed)
- [ ] **Lower TTL** on current DNS records to **60 seconds**
  - Log into the current DNS provider (registrar managing `comfy.org`)
  - Set TTL to 60 on all A/AAAA/CNAME records for `comfy.org` and `www.comfy.org`
  - Wait 48 hours for the old TTL to expire from caches worldwide
- [ ] **Set Framer canonical URL:**
  - In Framer → Site Settings → Domains → Advanced → set canonical URL to `https://comfy.org`
- [ ] **Share cutover plan with TLs** — see `docs/reverse-proxy-cutover-announcement.md`
- [ ] **Distribute emergency runbook** — see `docs/reverse-proxy-emergency-runbook.md`

---

### Step 7: Production DNS Cutover

> **⚠️ HUMAN ACTION REQUIRED — Schedule during low-traffic hours**

#### 7a. Point Nameservers to Cloudflare

> **⚠️ HUMAN ACTION REQUIRED**

At your domain registrar (wherever `comfy.org` is registered):

1. Change nameservers to the ones Cloudflare assigned (e.g., `ada.ns.cloudflare.com`, `ben.ns.cloudflare.com`)
2. Save changes

#### 7b. Configure Cloudflare DNS Records

> **⚠️ HUMAN ACTION REQUIRED**

In Cloudflare DNS dashboard for `comfy.org`:

| Type  | Name  | Content       | Proxy | TTL  |
|-------|-------|---------------|-------|------|
| A     | @     | 192.0.2.1     | ✅ Proxied | Auto |
| CNAME | www   | comfy.org     | ✅ Proxied | Auto |

**Critical: Do NOT add any AAAA records** — Framer doesn't support IPv6 and it causes TLS issues.

Remove any DNS records that pointed to the old Framer hosting (they're no longer needed since the Worker handles routing).

#### 7c. Configure Cloudflare Dashboard Settings

> **⚠️ HUMAN ACTION REQUIRED**

| Setting | Location | Value |
|---------|----------|-------|
| SSL/TLS Mode | SSL/TLS → Overview | **Full (strict)** |
| Rocket Loader | Speed → Optimization → Content optimizations | **OFF** |
| Always Online | Caching → Configuration | **OFF** |
| Browser Integrity Check | Security → Settings | Leave ON (default) |

#### 7d. Deploy Worker to Production

```bash
cd comfy-router
npx wrangler deploy --env production
```

This binds the Worker to `comfy.org/*` and `www.comfy.org/*`.

#### 7e. Verify Immediately

```bash
# Wait for DNS propagation (check with multiple resolvers)
dig comfy.org @8.8.8.8 +short
dig comfy.org @1.1.1.1 +short

# Verify routing
curl -sI https://comfy.org/ | grep -E 'HTTP|X-Served-By'
curl -sI https://comfy.org/templates/ | grep -E 'HTTP|X-Served-By'
curl -sI https://comfy.org/pricing | grep -E 'HTTP|X-Served-By'
curl -sI https://comfy.org/ja/templates/ | grep -E 'HTTP|X-Served-By'
curl -sI https://comfy.org/templates/thumbnails/flux_schnell-1.webp | grep -E 'HTTP|Content-Type'
```

Browser verification:

- [ ] `comfy.org/` — Framer homepage loads
- [ ] `comfy.org/pricing` — Framer pricing loads
- [ ] `comfy.org/templates/` — Template listing loads
- [ ] `comfy.org/templates/flux_schnell` — Detail page loads with thumbnails
- [ ] `comfy.org/ja/templates/` — Localized templates load
- [ ] Framer SPA navigation works (click between marketing pages)
- [ ] Framer forms submit successfully
- [ ] Framer animations render correctly
- [ ] No console errors in browser dev tools
- [ ] Lighthouse score on template pages is acceptable

---

### Step 8: Post-Cutover

#### 8a. Google Search Console

> **⚠️ HUMAN ACTION REQUIRED**

1. Add `comfy.org` as a property in Google Search Console (if not already)
2. Submit sitemaps:
   - `https://comfy.org/sitemap-templates.xml` (Astro templates sitemap)
   - `https://comfy.org/sitemap.xml` (Framer marketing sitemap)
3. Request indexing of key pages: `/templates/`, top template detail pages
4. Monitor Coverage report over 2-6 weeks for indexing changes

#### 8b. Set Up Monitoring & Alerts

> **⚠️ HUMAN ACTION REQUIRED** (Cloudflare dashboard)

1. **Workers Analytics:** Cloudflare dashboard → Workers → comfy-router → Analytics
   - Monitor request count, error rate, latency
2. **Create notification policies** in Cloudflare dashboard:
   - Alert on Worker error rate > 1%
   - Alert on 502 status codes
   - Alert on p99 latency > 2s
3. **Verify Vercel analytics** still track templates traffic
4. **Check Worker logs:** Cloudflare dashboard → Workers → Logs
   - Structured JSON logs should show routing decisions

#### 8c. Monitor for 48 Hours

- Check Worker analytics for error spikes
- Check Vercel analytics for templates traffic
- Monitor Google Search Console for crawl errors
- Spot-check pages in multiple browsers
- Test on mobile devices

---

## Rollback Plan

**Time to rollback: < 5 minutes**

### Option A: Remove Worker Route (Fastest)

> **⚠️ HUMAN ACTION REQUIRED**

1. In Cloudflare dashboard → Workers → Routes → Delete the `comfy.org/*` route
2. Update DNS records to point directly to Framer's servers
3. Traffic immediately bypasses the Worker

### Option B: Revert Nameservers (Nuclear)

> **⚠️ HUMAN ACTION REQUIRED**

1. At your domain registrar, change nameservers back to the previous provider
2. Previous DNS records take effect within TTL (60s if you lowered it in Step 6)
3. Everything reverts to pre-migration state

---

## Quick Reference: What Needs Human Action

| Action | Why It Can't Be Automated |
|--------|--------------------------|
| Create Cloudflare account | Account ownership, billing |
| Generate `CLOUDFLARE_API_TOKEN` | Secret management |
| Add `comfy.org` zone to Cloudflare | Domain ownership verification |
| Change nameservers at registrar | Registrar login required |
| Configure Cloudflare dashboard settings (SSL, Rocket Loader, Always Online) | Dashboard-only settings |
| Set Framer canonical URL | Framer dashboard access |
| Verify Framer origin at `significant-deck-845835.framer.app` | Browser verification |
| Submit sitemaps to Google Search Console | GSC access |
| Set up Cloudflare alerts/notifications | Dashboard configuration |
| Register throwaway test domain (optional) | Payment/ownership |

## Quick Reference: What Can Be Automated / Done by Engineer

| Action | How |
|--------|-----|
| Write Worker code | Already done in `Comfy-Org/comfy-router` |
| Write Vitest tests | Step 1 of this doc |
| Run tests locally | `npx vitest run` |
| Test locally with `wrangler dev` | `npx wrangler dev` → `curl localhost:8787` |
| Deploy to workers.dev preview | `npx wrangler deploy` (default env) |
| Deploy to staging | `npx wrangler deploy --env staging` |
| Deploy to production | `npx wrangler deploy --env production` |
| Verify routing with curl | All curl commands in this doc |
| Set up CI/CD in comfy-router | GitHub Actions with `CLOUDFLARE_API_TOKEN` secret |
| Astro site restructuring | Already done on this branch |

---

## CI/CD for comfy-router

Add this GitHub Actions workflow to `comfy-router/.github/workflows/deploy.yml`:

```yaml
name: Deploy Worker
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npx vitest run

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - name: Deploy to Cloudflare Workers
        run: npx wrangler deploy --env production
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

> **⚠️ HUMAN ACTION REQUIRED:** Add `CLOUDFLARE_API_TOKEN` as a repository secret in `Comfy-Org/comfy-router` → Settings → Secrets → Actions.

---

## Timeline

| Step | Effort | Blocks on |
|------|--------|-----------|
| 1. Vitest tests | 30 min | Nothing |
| 2. Local `wrangler dev` testing | 15 min | Nothing |
| 3. Deploy to workers.dev preview | 15 min | Cloudflare account + token |
| 4/5. Staging or test domain | 1 hr | CF zone setup (human) |
| 6. Pre-cutover prep | 10 min + 48hr wait | DNS provider access (human) |
| 7. Production cutover | 30 min | Nameserver change (human) |
| 8. Post-cutover monitoring | 48 hrs passive | GSC access (human) |
