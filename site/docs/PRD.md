# Template Blog Site — Product Requirements Document

## Press Release (PR)

**_Comfy Org Launches Template Gallery: Discover and Run 200+ AI Workflows Instantly_**

_Today, Comfy Org introduces the Template Gallery — a searchable, SEO-optimized catalog of ComfyUI workflow templates. Users searching for "how to remove objects from images with Flux" or "Wan 2.1 video generation workflow" will discover our templates, understand exactly what they do, and launch them on Comfy Cloud with one click. Each template page includes AI-generated explanations, interactive workflow previews, model requirements, and step-by-step guides. The Template Gallery transforms our existing 200+ production-ready workflows into discoverable, revenue-driving landing pages._

---

## Customer FAQs

**How is this different from the templates in ComfyUI?**

The in-app template browser is great for users already in ComfyUI. The Template Gallery is a public website optimized for search engines — people discover our templates via Google when searching for specific AI generation tasks. Each page has detailed explanations, previews, and a "Try on Cloud" button.

**Can I use these templates locally?**

Yes. Every page includes local installation instructions, model download links, and custom node requirements. The "Try on Cloud" button is prominently featured for users who want instant access.

**How do I know which template is right for my use case?**

Each template page includes an AI-generated description of what it does, suggested use cases, required hardware specs, and before/after examples. You can also browse by category (image/video/audio/3D), filter by model, or search for specific tasks.

**Will templates stay up to date?**

The Template Gallery automatically rebuilds when we release new templates. The content stays synchronized with our PyPI package.

---

## Internal FAQs

**Why not just link to docs.comfy.org?**

docs.comfy.org is great for tutorials but isn't structured for programmatic SEO. The Template Gallery creates one page per template, each targeting specific long-tail keywords. This scales our SEO footprint from ~10 tutorial pages to 200+ template landing pages.

**Won't AI-generated content get penalized by Google?**

Google's stance is clear: AI content is fine if it's helpful and grounded in real data. Our AI generates descriptions from structured template metadata (models, tags, requirements), not hallucinated content. Each page also includes unique elements: workflow previews, thumbnails, usage stats.

**How does this integrate with the existing release process?**

The site builds automatically after our existing PyPI publish workflow completes. No manual intervention required once set up.

**What if we need to edit content manually?**

An override system lets us add custom content without regenerating from AI. Manual edits are preserved across rebuilds.

---

## Launch Alignment

**OSS / Cloud alignment:**

- Template Gallery is a static site — no ComfyUI version dependency
- "Try on Cloud" links include UTM parameters for attribution
- Cloud API changes don't affect the static site
- Templates must be published to PyPI before appearing on the site

**Dependencies:**

- OpenAI API key for content generation
- Vercel account (existing org account)
- Cloudflare Pages (future migration)
- No changes to ComfyUI core or frontend required

---

## Specific Requirements

### P0 (Launch Blockers)

1. **Template detail pages** — One page per template with title, description, thumbnails, and CTA
2. **"Try on Cloud" button** — Links to `cloud.comfy.org/?template={name}&utm_source=templates`
3. **Auto-build on release** — Site rebuilds when templates are published
4. **Basic SEO** — Meta tags, Open Graph, sitemap, robots.txt

### P1 (Fast Follow)

1. **AI-generated content** — Extended descriptions, how-to guides, meta descriptions
2. **Workflow preview** — LiteGraph canvas rendering of node graph
3. **Category/tag pages** — Landing pages for `/category/video/`, `/tag/inpainting/`
4. **Model pages** — Landing pages for `/model/flux/`, `/model/qwen/`
5. **Human override system** — Allow manual content edits that persist

### P2 (Future Milestones)

1. **i18n support** — Localized pages using existing translated index files
2. **Search functionality** — Client-side or Algolia-powered search
3. **Usage analytics** — Display cloud usage stats on pages
4. **Reviews/ratings** — User feedback on templates

---

## Success Metrics

| Metric               | Target                                         | Measurement                 |
| -------------------- | ---------------------------------------------- | --------------------------- |
| **Indexed pages**    | 50+ pages indexed within 30 days               | Google Search Console       |
| **Organic traffic**  | 5k monthly visits within 90 days               | Vercel Analytics / Mixpanel |
| **Cloud conversion** | 3%+ CTR on "Try on Cloud" buttons              | Mixpanel click events       |
| **Template loads**   | 500+ template loads/month from UTM source      | Cloud analytics             |
| **Core Web Vitals**  | All pages passing                              | PageSpeed Insights          |
| **SERP rankings**    | Top 10 for `{model} comfyui workflow` keywords | Search Console / Ahrefs     |

**Revenue Impact:**

- Primary: Direct cloud signups from template pages
- Secondary: Brand awareness, reduced support load (self-service discovery)
- Tertiary: SEO authority for comfy.org domain

---

## Milestones

**Milestone 1: Core Site (50 Templates)**

- Astro project with Content Collections
- Template detail pages for top 50 by usage
- Basic styling and responsive design
- "Try on Cloud" CTA
- Vercel deployment
- Manual GitHub Action dispatch
- Local development setup

**Milestone 2: Full Catalog + AI**

- All 200+ templates
- AI content generation pipeline
- Workflow preview rendering
- Category, tag, and model landing pages
- Human override system
- Automated release trigger

**Milestone 3: Growth**

- i18n support (Chinese, Japanese priority)
- Search functionality
- A/B testing for CTAs
- Performance optimization
- Migration to Cloudflare Pages (optional)

---

## Open Decisions

| Decision       | Owner           | Options                                        |
| -------------- | --------------- | ---------------------------------------------- |
| Domain         | Product + Infra | `comfy.org/templates` (decided)                |
| Initial scope  | Product         | Top 50 vs all templates for M1                 |
| Content review | Product         | Pre-deploy review vs post-deploy fixes         |

---

_Document Version: 1.0_
