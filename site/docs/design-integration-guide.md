# Design Integration Guide

> **Purpose:** Protect SEO, i18n, and telemetry infrastructure when implementing Figma designs.

When implementing designs from Figma, you **MUST** preserve certain components and patterns that are critical for SEO ranking, internationalization, and analytics.

---

## 🚨 Protected Components (Do NOT Remove or Modify)

### 1. SEO Components

| Component            | Location                            | Purpose                               |
| -------------------- | ----------------------------------- | ------------------------------------- |
| `SEOHead.astro`      | `src/components/SEOHead.astro`      | Meta tags, Open Graph, canonical URLs |
| `HreflangTags.astro` | `src/components/HreflangTags.astro` | Multi-language SEO signals            |
| Structured data      | `structuredData` prop in layouts    | JSON-LD for rich results              |

**Rules:**

- Always pass `title`, `description`, `canonicalUrl` to `SEOHead`
- Never remove `<HreflangTags>` from pages
- Preserve `structuredData` prop for template pages (SoftwareApplication schema)

### 2. i18n Infrastructure

| File                 | Purpose                            |
| -------------------- | ---------------------------------- |
| `src/i18n/config.ts` | Language definitions, RTL support  |
| `src/i18n/utils.ts`  | URL localization, locale detection |
| `src/i18n/ui.ts`     | UI string translations             |

**Rules:**

- Use `t('key', locale)` for all UI strings—never hardcode text
- Use `localizeUrl(path, locale)` for internal links
- Preserve `lang` and `dir` attributes on `<html>`
- Keep hreflang base path computation in `SEOHead.astro`

### 3. Telemetry

| Component       | Location                | Purpose                   |
| --------------- | ----------------------- | ------------------------- |
| `<Analytics />` | `BaseLayout.astro`      | Vercel Analytics          |
| `vitals.ts`     | `src/scripts/vitals.ts` | Core Web Vitals reporting |

**Rules:**

- Keep `<Analytics />` at end of `<body>`
- Keep vitals script import in layout

### 4. UTM Parameter Tracking

> ⚠️ **Critical for Attribution:** UTM parameters on CTA links enable conversion analysis. Removing or hardcoding them breaks marketing attribution tracking.

| Utility            | Location                | Purpose                            |
| ------------------ | ----------------------- | ---------------------------------- |
| `getCloudCtaUrl()` | `src/utils/cloudCta.ts` | Generates CTA URLs with UTM params |

**Required UTM Parameters:**

| Parameter      | Purpose                                      |
| -------------- | -------------------------------------------- |
| `utm_source`   | Where traffic originates (e.g., `templates`) |
| `utm_medium`   | Marketing medium (e.g., `website`)           |
| `utm_campaign` | Campaign identifier                          |
| `utm_content`  | Specific CTA/element identifier              |

**Rules:**

- **Always** use `getCloudCtaUrl()` for CTA links—never hardcode URLs with UTM params
- Do not remove UTM parameters when updating link destinations
- Do not create new CTA links without calling the utility function

---

## ✅ Safe to Modify

These can be freely styled/restructured:

- Header/footer HTML structure and styling
- Card layouts, grids, spacing
- Colors, typography, animations
- Image presentation
- Navigation visual design

---

## Implementation Checklist

When implementing a new design:

```markdown
- [ ] `SEOHead.astro` is included with all props
- [ ] `HreflangTags.astro` renders in `<head>`
- [ ] All UI text uses `t('key', locale)` function
- [ ] Internal links use `localizeUrl(path, locale)`
- [ ] `<html lang={locale} dir={htmlDir}>` preserved
- [ ] `<Analytics />` component in layout
- [ ] Vitals script import preserved
- [ ] Template pages pass `structuredData` prop
- [ ] Canonical URLs are correct for localized pages
- [ ] CTA links use `getCloudCtaUrl()` utility
- [ ] UTM params are not hardcoded (use the utility)
```

---

## Component Integration Pattern

When creating new page layouts:

```astro
---
// REQUIRED: Import SEO and i18n utilities
import SEOHead from '../components/SEOHead.astro';
import HreflangTags from '../components/HreflangTags.astro';
import { getLocaleFromPath, localizeUrl } from '../i18n/utils';
import { t } from '../i18n/ui';
import { LANGUAGES } from '../i18n/config';
import Analytics from '@vercel/analytics/astro';

const locale = getLocaleFromPath(Astro.url.pathname);
const langInfo = LANGUAGES[locale];
---

<!doctype html>
<html lang={locale} dir={langInfo?.dir || 'ltr'}>
  <head>
    <SEOHead
      title={t('meta.title', locale)}
      description={t('meta.description', locale)}
      locale={locale}
      hreflangBasePath="/templates/"
    />
  </head>
  <body>
    <!-- Your design implementation here -->

    <!-- REQUIRED: Keep at end of body -->
    <Analytics />
    <script>
      import('../scripts/vitals');
    </script>
  </body>
</html>
```

---

## CI Enforcement

The following checks run automatically:

| Check                   | What it validates                            |
| ----------------------- | -------------------------------------------- |
| `pnpm audit:seo`        | Meta tags, OG tags, structured data presence |
| `pnpm validate:sitemap` | All pages in sitemap, correct localized URLs |
| `linkinator`            | No broken internal links                     |
| Visual regression       | Screenshots compared to baseline             |

If CI fails after design changes, check these areas first.

---

## Updating This Guide

When adding new protected infrastructure:

1. Add to the "Protected Components" table
2. Add to the "Implementation Checklist"
3. Add CI check if automatable
4. Update `AGENTS.md` with any new commands

---

_Last updated: February 2026_
