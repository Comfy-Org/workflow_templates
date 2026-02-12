# SEO Setup Guide

Manual setup instructions for search engine optimization of `comfy.org/templates`.

## Table of Contents

- [Google Search Console Setup](#google-search-console-setup)
- [Bing Webmaster Tools](#bing-webmaster-tools)
- [Sitemap Submission](#sitemap-submission)
- [Framer Configuration](#framer-configuration)
- [Weekly Monitoring Checklist](#weekly-monitoring-checklist)

---

## Domain Architecture

The templates site is served at `https://comfy.org/templates/` via Framer Multi-Site rewrite:

- **Framer** owns `comfy.org` and serves all marketing pages
- Framer rewrites `/templates/*` → the Astro site on Vercel
- Visitors see `comfy.org/templates/...` in the browser (no redirect)
- All SEO authority consolidates under `comfy.org`

The Vercel deployment URL (`workflow-templates.vercel.app`) returns `X-Robots-Tag: noindex` to prevent duplicate indexing.

See `docs/framer-subpath-plan.md` for full architecture details.

---

## Framer Configuration

### Multi-Site Rewrite Setup

This is the key manual step that makes the subpath architecture work:

1. Go to the [Framer](https://framer.com) dashboard and select the `comfy.org` domain
2. Open the **Multi Site** tab
3. Add a rewrite rule:
   - **Path:** `/templates/*`
   - **Type:** External
   - **Destination:** `https://workflow-templates.vercel.app`
4. **Publish** the Framer project to apply changes

> The Vercel deployment URL can be updated in Framer at any time without code changes.

### Internal Linking

Internal links from the main site pass domain authority to the templates subpath. Sitemap discovery alone is insufficient for SEO — search engines weigh internal links heavily.

- Add navigation links from Framer marketing pages to key `/templates/` pages
- Add footer links to template categories (e.g., `/templates/?type=image`, `/templates/?type=video`)
- Include "Browse Templates" or similar CTA links from relevant pages (e.g., model pages, feature pages)

### Verification

After publishing the Framer project:

1. Visit `https://comfy.org/templates/` and confirm the page loads correctly
2. Check that all assets (CSS, JS, images) load without errors
3. Verify the URL bar shows `comfy.org/templates/...` (not a redirect to `workflow-templates.vercel.app`)

---

## Google Search Console Setup

Since the templates site lives under `comfy.org/templates/`, you use the existing `comfy.org` GSC property (or create one if it doesn't exist).

### 1. Add Property (if needed)

1. Go to [Google Search Console](https://search.google.com/search-console)
2. Click **Add property**
3. Choose **URL prefix** and enter: `https://comfy.org`
4. Click **Continue**

> If `comfy.org` is already verified (likely — it's the main marketing site), you can skip to step 3 (Submit Sitemap).

### 2. Verification Methods

Choose one of these verification methods:

#### Option A: DNS Record (Recommended)

1. Copy the TXT record provided by Google
2. Add it to your domain's DNS settings at your registrar
3. Wait for DNS propagation (can take up to 48 hours)
4. Click **Verify** in GSC

#### Option B: HTML File Upload

1. Download the verification file from GSC (e.g., `google1234567890abcdef.html`)
2. Place it in `site/public/` directory
3. Deploy the site — Framer should pass through the file at `comfy.org/templates/google1234567890abcdef.html`
4. Click **Verify** in GSC

> Note: Since the file is served under `/templates/`, this method only works if GSC accepts it at a subpath. DNS verification is more reliable for subpath setups.

#### Option C: HTML Meta Tag

1. Copy the meta tag from GSC
2. Add to `src/layouts/BaseLayout.astro` in the `<head>`:

```html
<meta name="google-site-verification" content="YOUR_VERIFICATION_CODE" />
```

### 3. Submit Sitemap

1. In GSC, go to **Sitemaps** in the left sidebar
2. Enter the sitemap URL: `https://comfy.org/templates/sitemap-index.xml`
3. Click **Submit**

### 4. Set Up Monitoring Alerts

1. Go to **Settings** → **Email preferences**
2. Enable:
   - Performance on Search issues
   - Coverage issues
   - Enhancement issues
3. Recommended: Set up weekly email digests

### 5. Key Metrics to Track

| Metric          | What It Measures                        | Good Target                    |
| --------------- | --------------------------------------- | ------------------------------ |
| **Impressions** | How often your pages appear in search   | Increasing trend               |
| **Clicks**      | Visits from search results              | Increasing trend               |
| **CTR**         | Click-through rate (clicks/impressions) | 2-5% for informational content |
| **Position**    | Average ranking position                | <20 for main keywords          |

---

## Bing Webmaster Tools

### 1. Add Site

1. Go to [Bing Webmaster Tools](https://www.bing.com/webmasters)
2. Sign in with Microsoft account
3. Click **Add a site**

### 2. Import from Google Search Console (Easiest)

1. Select **Import from GSC**
2. Authenticate with your Google account
3. Select `comfy.org`
4. Click **Import**

This automatically imports your sitemap and verification.

### 3. Manual Setup (Alternative)

1. Enter `https://comfy.org`
2. Verify using one of:
   - XML file (add to `public/`)
   - Meta tag (add to layout)
   - CNAME record
3. Submit sitemap: `https://comfy.org/templates/sitemap-index.xml`

---

## Sitemap Submission

### Sitemap Location

- **Index:** `https://comfy.org/templates/sitemap-index.xml`
- Generated automatically by `@astrojs/sitemap` during build
- Uses `PUBLIC_SITE_ORIGIN` env var (`https://comfy.org`) for canonical URLs
- Framer also auto-merges sitemaps from Multi-Site rewrite sources

### Direct Submission URLs

Use these URLs to ping search engines after sitemap updates:

```bash
# Google
curl "https://www.google.com/ping?sitemap=https://comfy.org/templates/sitemap-index.xml"

# Bing
curl "https://www.bing.com/ping?sitemap=https://comfy.org/templates/sitemap-index.xml"
```

### Verify Indexing Status

#### In Google Search Console

1. Go to **Indexing** → **Pages**
2. Check:
   - **Indexed** pages count
   - **Not indexed** pages and reasons
   - **Crawl** issues

#### In Bing Webmaster Tools

1. Go to **Configure My Site** → **Sitemaps**
2. View submitted URLs vs indexed URLs

#### URL Inspection

Test specific pages:

1. In GSC, use **URL Inspection** tool
2. Enter a page URL (e.g., `https://comfy.org/templates/flux_schnell/`)
3. Check if it's indexed
4. Request indexing if needed

---

## Weekly Monitoring Checklist

### Quick Health Check (5 min)

- [ ] Check GSC for any new errors (red alerts)
- [ ] Review indexing coverage (no sudden drops)
- [ ] Check for manual actions (should be none)

### Performance Review (10 min)

- [ ] Compare last 7 days vs previous 7 days:
  - Total clicks
  - Total impressions
  - Average CTR
  - Average position
- [ ] Identify top 10 queries and pages
- [ ] Note any significant changes (±20%)

### Technical Check (5 min)

- [ ] Core Web Vitals status in GSC
- [ ] Mobile usability issues
- [ ] Any new crawl errors

### Monthly Deep Dive

- [ ] Review full indexing report
- [ ] Check for pages stuck in "Discovered - not indexed"
- [ ] Review backlinks in GSC
- [ ] Compare month-over-month trends

### Common Issues and Fixes

| Issue                        | Likely Cause                     | Fix                                  |
| ---------------------------- | -------------------------------- | ------------------------------------ |
| Sudden drop in indexed pages | Sitemap issue, robots.txt change | Check sitemap, verify robots.txt     |
| Low CTR                      | Poor meta descriptions           | Improve title/description            |
| High impressions, low clicks | Ranking for wrong queries        | Review content targeting             |
| "Crawled - not indexed"      | Low content quality              | Improve page content                 |
| Slow indexing                | New site, low authority          | Build backlinks, submit in GSC       |
| Duplicate content warnings   | Vercel URL indexed               | Verify X-Robots-Tag: noindex header  |
| Pages not found by crawler   | Framer rewrite misconfigured     | Check Multi-Site rules in Framer     |

### Performance Benchmarks

For a template/resource site like this:

| Metric          | Baseline          | Good | Excellent |
| --------------- | ----------------- | ---- | --------- |
| Pages indexed   | 80% of total      | 90%  | 95%+      |
| Avg CTR         | 1%                | 3%   | 5%+       |
| Avg Position    | 30                | 15   | <10       |
| Core Web Vitals | Needs Improvement | Good | All green |

---

## Official Documentation

- [Google Search Console Help](https://support.google.com/webmasters)
- [Google SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide)
- [Bing Webmaster Tools Help](https://www.bing.com/webmasters/help/)
- [Sitemaps Protocol](https://www.sitemaps.org/protocol.html)
- [Framer Multi-Site Docs](https://www.framer.com/help/articles/multi-site/)

---

## Related Files

- `astro.config.mjs` - Sitemap generation config (`site` uses `PUBLIC_SITE_ORIGIN`)
- `src/config/site.ts` - Centralized URL helper (`SITE_ORIGIN`, `absoluteUrl()`)
- `src/pages/robots.txt.ts` - Dynamic robots.txt with correct sitemap URL
- `src/layouts/BaseLayout.astro` - Meta tag placement
- `docs/framer-subpath-plan.md` - Full Framer subpath architecture
