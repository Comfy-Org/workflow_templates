# Template Site Roadmap

## Current State (Milestone 1 — Complete)

✅ Astro project with Tailwind CSS v4  
✅ Template listing page with thumbnail cards  
✅ Template detail pages with hero images  
✅ Sync script for top 50 templates  
✅ AI content generation pipeline (GPT-4o)  
✅ Workflow preview image generation  
✅ Human override system  
✅ Thumbnail variant support (compareSlider, hoverDissolve, zoomHover)  
✅ SEO meta tags and structured data  
✅ "Try on Cloud" CTA buttons  
✅ GitHub Actions CI/CD workflow  

---

## Milestone 2: Design & Polish

### 🎨 Professional Design (Priority: HIGH)

**Status**: Upwork designer being recruited

- [ ] Professional template detail page design
- [ ] Improved listing page grid layout
- [ ] Mobile-responsive refinements
- [ ] Dark mode support
- [ ] Animation and micro-interactions
- [ ] Consistent design system / component library

**Constraints for designer**:
- Must work as a template (same layout for all 200+ workflows)
- Must handle variable content lengths
- Must support all thumbnail variants
- Must pass Core Web Vitals

### 🖼️ Improved Workflow Previews

**Current**: Basic canvas rectangles (not representative of ComfyUI)

- [ ] Research ComfyUI node rendering approach
- [ ] Implement proper node styling (colors, titles, ports)
- [ ] Add edge/connection rendering
- [ ] Consider using LiteGraph renderer or SVG approach
- [ ] Fallback for complex workflows

### 📝 Content Improvements

- [ ] Better AI prompts for more engaging descriptions
- [ ] Add "What you'll create" section with example outputs
- [ ] Add estimated generation time
- [ ] Add hardware requirements display
- [ ] Add "Similar templates" recommendations

---

## Milestone 3: Full Catalog

### 📚 Scale to All Templates

- [ ] Sync all 200+ templates (not just top 50)
- [ ] Implement pagination or infinite scroll
- [ ] Add filtering by category, model, tags
- [ ] Add search functionality (client-side or Algolia)

### 🏷️ Aggregation Pages

- [ ] Category pages: `/category/video/`, `/category/image/`
- [ ] Model pages: `/model/flux/`, `/model/qwen/`, `/model/wan/`
- [ ] Tag pages: `/tag/inpainting/`, `/tag/portrait/`
- [ ] SEO-optimized landing pages for each

### 🔗 Internal Linking

- [ ] "Related templates" section on detail pages
- [ ] Breadcrumb navigation
- [ ] Model/tag links in template metadata
- [ ] Footer with category quick links

---

## Milestone 4: Internationalization

### 🌐 i18n Support

- [ ] Integrate with existing `index.{lang}.json` files
- [ ] Language switcher in header
- [ ] Localized URLs: `/zh/templates/`, `/ja/templates/`
- [ ] hreflang tags for SEO
- [ ] Priority languages: Chinese, Japanese, Korean

### 📊 Localized AI Content

- [ ] Generate descriptions in target languages
- [ ] Or: Use translation API for AI content
- [ ] Preserve human overrides per language

---

## Milestone 5: Growth & Analytics

### 📈 Analytics Integration

- [ ] Mixpanel or Vercel Analytics setup
- [ ] Track template views, CTA clicks
- [ ] Conversion funnel: View → CTA Click → Cloud Signup
- [ ] Popular templates dashboard

### 🔍 SEO Optimization

- [ ] Submit to Google Search Console
- [ ] Monitor indexing and rankings
- [ ] A/B test meta descriptions
- [ ] Add FAQ schema for "People Also Ask"
- [ ] Core Web Vitals monitoring

### ⚡ Performance

- [ ] Image optimization (srcset, lazy loading)
- [ ] Static asset CDN (Cloudflare)
- [ ] Prefetching for navigation
- [ ] Build time optimization

---

## Future Ideas (Backlog)

### Community Features
- [ ] User reviews/ratings for templates
- [ ] "Report issue" button
- [ ] Community-submitted templates (moderated)

### Enhanced Interactivity
- [ ] Interactive workflow preview (pan/zoom)
- [ ] Live demo with sample inputs
- [ ] Parameter customization preview

### Integrations
- [ ] ComfyUI Manager integration
- [ ] One-click local install button
- [ ] Export to workflow file download

### Content
- [ ] Video tutorials embedded
- [ ] Step-by-step animated guides
- [ ] "Tips & tricks" for each template

---

## Technical Debt

- [ ] Workflow preview generator needs complete rewrite for realistic rendering
- [ ] Consider migrating to Cloudflare Pages (from Vercel)
- [ ] Add E2E tests with Playwright
- [ ] Add visual regression testing
- [ ] Improve AI content caching strategy

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-01-20 | Use Astro + Tailwind | Best for static SEO sites, zero JS by default |
| 2026-01-20 | Top 50 templates first | Focus on high-value content, iterate |
| 2026-01-20 | AI content with human overrides | Scale content creation, preserve manual edits |
| 2026-01-20 | Thumbnail variants from source | Respect existing UX patterns from ComfyUI frontend |
| 2026-01-20 | Hire designer for UI | Need professional design, not DIY CSS |

---

*Last updated: January 2026*
