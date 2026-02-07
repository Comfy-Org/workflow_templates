# Hosting Comparison: Vercel vs Cloudflare Pages

**Purpose:** Help leadership decide on hosting platform for templates.comfy.org  
**Last Updated:** February 2026

---

## Table of Contents

1. [Current Setup (Vercel)](#current-setup-vercel)
2. [Cloudflare Pages Alternative](#cloudflare-pages-alternative)
3. [Cloudflare CDN (without full migration)](#cloudflare-cdn-without-full-migration)
4. [Recommendation](#recommendation)

---

## Current Setup (Vercel)

### Features Currently Used

| Feature                 | Usage                                   | Notes                                            |
| ----------------------- | --------------------------------------- | ------------------------------------------------ |
| **Vercel Analytics**    | `@vercel/analytics` in BaseLayout.astro | Client-side analytics integration                |
| **Web Vitals**          | Custom vitals.ts using `web-vitals`     | Performance monitoring                           |
| **OG Image Generation** | `@vercel/og` for dynamic images         | Server-side image generation at `/og/[slug].png` |
| **Static Output**       | `output: 'static'` in astro.config.mjs  | Pre-rendered static site                         |
| **Vercel Adapter**      | `@astrojs/vercel`                       | Build integration                                |
| **Sitemap**             | `@astrojs/sitemap`                      | SEO sitemap generation                           |

### Build/Deploy Workflow

```
GitHub Push → Vercel Auto-Deploy → Preview/Production
```

- Automatic CI/CD on git push
- Preview deployments for PRs
- Prebuild: `sync` → `sync:tutorials` → `generate:ai` → `generate:previews`
- Build: `astro build`

### Costs at Current Scale

| Tier             | Cost           | Included                                             |
| ---------------- | -------------- | ---------------------------------------------------- |
| **Hobby (Free)** | $0             | 100GB bandwidth, 1M edge requests, limited analytics |
| **Pro**          | $20/mo + usage | 1TB bandwidth, 10M edge requests, team features      |

**Vercel Pro Overage Rates:**

- Edge Requests: $2 per 1M (after 10M included)
- Fast Data Transfer: $0.15 per GB (after 1TB included)
- Function Invocations: $0.60 per 1M
- Image Optimization: $0.05 per 1K transformations

### Pros

- ✅ Zero-config Astro deployment
- ✅ Excellent DX with preview deployments
- ✅ Built-in analytics integration
- ✅ Native OG image generation (`@vercel/og`)
- ✅ Automatic HTTPS/SSL
- ✅ Global CDN
- ✅ Seamless GitHub integration

### Cons

- ❌ Overage costs can spike unexpectedly at scale
- ❌ Analytics requires Pro plan for advanced features
- ❌ Vendor lock-in with `@vercel/og` and analytics packages
- ❌ Limited geographic control over edge locations
- ❌ No built-in DDoS protection beyond basic

---

## Cloudflare Pages Alternative

### Feature Comparison

| Feature                 | Vercel                    | Cloudflare Pages                |
| ----------------------- | ------------------------- | ------------------------------- |
| **Static Hosting**      | ✅                        | ✅                              |
| **CDN**                 | Global                    | Global (330+ cities)            |
| **HTTPS/SSL**           | Auto                      | Auto                            |
| **Preview Deployments** | ✅                        | ✅                              |
| **Git Integration**     | GitHub, GitLab, Bitbucket | GitHub, GitLab                  |
| **Build Minutes**       | 100 hrs/mo (Pro)          | 500/mo (Free), unlimited (Paid) |
| **Bandwidth**           | 1TB (Pro)                 | Unlimited (Free)                |
| **Edge Functions**      | Vercel Functions          | Pages Functions (Workers)       |
| **Analytics**           | Vercel Analytics ($)      | Web Analytics (Free)            |
| **DDoS Protection**     | Basic                     | Enterprise-grade (Free)         |
| **WAF**                 | Pro add-on                | Included                        |

### Cloudflare Pages Pricing

| Tier             | Cost  | Includes                                               |
| ---------------- | ----- | ------------------------------------------------------ |
| **Free**         | $0    | 500 builds/mo, unlimited bandwidth, unlimited requests |
| **Workers Paid** | $5/mo | 10M requests, 30M CPU-ms, KV/D1 access                 |

**Key Difference:** Cloudflare's Free tier includes **unlimited bandwidth** vs Vercel's 100GB limit.

### Build/Deploy Workflow Differences

**Cloudflare Pages:**

```
GitHub Push → Cloudflare Build → Preview/Production
```

**Build Settings:**

- Framework preset: Astro
- Build command: `npm run build`
- Build output directory: `dist`

### Migration Effort Estimate

| Task                                                 | Effort          | Complexity  |
| ---------------------------------------------------- | --------------- | ----------- |
| Replace `@astrojs/vercel` with `@astrojs/cloudflare` | 1 hour          | Low         |
| Replace `@vercel/analytics`                          | 2-4 hours       | Medium      |
| Replace `@vercel/og` image generation                | 4-8 hours       | Medium-High |
| Update CI/CD and environment variables               | 1-2 hours       | Low         |
| Testing and validation                               | 4-8 hours       | Medium      |
| **Total**                                            | **12-23 hours** | Medium      |

### What Would Change in the Codebase

#### 1. Astro Config (`astro.config.mjs`)

```diff
- import vercel from '@astrojs/vercel';
+ import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
-   adapter: vercel({
-     webAnalytics: { enabled: true },
-   }),
+   adapter: cloudflare(),
});
```

#### 2. Analytics (`src/layouts/BaseLayout.astro`)

```diff
- import Analytics from '@vercel/analytics/astro';
+ // Use Cloudflare Web Analytics (add script in head)

- <Analytics />
+ <script defer src='https://static.cloudflareinsights.com/beacon.min.js'
+   data-cf-beacon='{"token": "YOUR_TOKEN"}'></script>
```

#### 3. OG Image Generation (`src/pages/og/[slug].png.ts`)

Replace `@vercel/og` with either:

- **Option A:** Pre-generate images at build time using `canvas` or `sharp`
- **Option B:** Use Cloudflare Workers with `@cloudflare/pages-plugin-static-forms` or custom image generation

#### 4. Package.json

```diff
-   "@astrojs/vercel": "^9.0.4",
-   "@vercel/analytics": "^1.6.1",
-   "@vercel/og": "^0.8.6",
+   "@astrojs/cloudflare": "^11.0.0",
```

#### 5. Wrangler Configuration (new file)

```jsonc
// wrangler.jsonc
{
  "name": "comfyui-template-site",
  "pages_build_output_dir": "./dist",
}
```

---

## Cloudflare CDN (without full migration)

### Overview

Use Cloudflare as a CDN/proxy in front of Vercel without migrating the hosting.

### Configuration Needed

1. **Add domain to Cloudflare** (Free)
2. **Update DNS to proxy through Cloudflare**
   - Set A/CNAME records to point to Vercel
   - Enable "Proxied" (orange cloud) status
3. **Configure caching rules**
   - Cache static assets (CSS, JS, images)
   - Bypass cache for API routes

### Benefits

| Benefit                      | Description                    |
| ---------------------------- | ------------------------------ |
| **DDoS Protection**          | Enterprise-grade, unmetered    |
| **Additional Caching Layer** | Reduce Vercel bandwidth costs  |
| **WAF**                      | Basic protection included free |
| **Bot Management**           | Basic bot fight mode           |
| **Faster Global Delivery**   | 330+ edge locations            |
| **SSL Flexibility**          | Full or Flexible SSL modes     |

### Considerations

- Adds complexity (two vendors to manage)
- Potential for cache invalidation issues
- Vercel still handles builds and core hosting
- Reduced Vercel analytics accuracy (Cloudflare caches)

### Cost Impact

- **Cloudflare:** Free tier sufficient for CDN/caching
- **Vercel:** Potential bandwidth cost reduction from caching

---

## Recommendation

### Summary

| Option                          | Cost Savings         | Migration Effort | Risk   |
| ------------------------------- | -------------------- | ---------------- | ------ |
| **Stay on Vercel**              | None                 | None             | Low    |
| **Migrate to Cloudflare Pages** | $15-20/mo + overages | 2-3 days         | Medium |
| **Add Cloudflare CDN**          | Variable (bandwidth) | 2-4 hours        | Low    |

### Recommended Approach: **Cloudflare Pages Migration**

**Reasoning:**

1. **Cost:** Cloudflare's unlimited bandwidth on Free tier eliminates unpredictable overage costs
2. **Performance:** 330+ edge locations vs Vercel's network
3. **Security:** Enterprise-grade DDoS and WAF included free
4. **Simplicity:** Static site is ideal migration candidate—no serverless complexity
5. **Analytics:** Cloudflare Web Analytics is free and privacy-focused

**When to stay on Vercel:**

- If OG image generation is critical and team lacks capacity to rebuild
- If Vercel-specific features become essential (Edge Config, etc.)
- If current costs are acceptable and predictable

### Migration Checklist

If proceeding with Cloudflare Pages migration:

- [ ] **Phase 1: Preparation**
  - [ ] Create Cloudflare account and add project
  - [ ] Audit all Vercel-specific code (`@vercel/*` packages)
  - [ ] Design OG image generation replacement strategy

- [ ] **Phase 2: Code Changes**
  - [ ] Replace `@astrojs/vercel` with `@astrojs/cloudflare`
  - [ ] Remove `@vercel/analytics`, add Cloudflare Web Analytics
  - [ ] Implement alternative OG image generation
  - [ ] Create `wrangler.jsonc` configuration
  - [ ] Update environment variables

- [ ] **Phase 3: Testing**
  - [ ] Local testing with `wrangler pages dev`
  - [ ] Deploy to Cloudflare Pages staging
  - [ ] Validate all pages render correctly
  - [ ] Test OG image generation
  - [ ] Verify analytics tracking

- [ ] **Phase 4: Cutover**
  - [ ] Update DNS to point to Cloudflare Pages
  - [ ] Monitor for 24-48 hours
  - [ ] Deprecate Vercel project

---

## References

- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- [Astro Cloudflare Deployment Guide](https://docs.astro.build/en/guides/deploy/cloudflare/)
- [Vercel Pricing](https://vercel.com/pricing)
- [Cloudflare Workers & Pages Pricing](https://www.cloudflare.com/plans/developer-platform/)
