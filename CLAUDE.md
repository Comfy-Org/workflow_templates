# CLAUDE.md — ComfyUI Workflow Templates Monorepo

## What This Repo Is

A monorepo managing **ComfyUI workflow templates** distributed as Python packages AND a public **Astro-based workflow hub website** at templates.comfy.org. Two distinct systems share the same template data.

## Repository Map

```
workflow_templates/
├── templates/              # SOURCE OF TRUTH: workflow JSONs, thumbnails, index metadata
│   ├── index.json          # Master template metadata (English)
│   ├── index.{locale}.json # 11 locale variants (zh, ja, ko, es, fr, ru, tr, ar, pt-BR, zh-TW)
│   ├── *.json              # ComfyUI workflow definitions
│   └── *-1.webp, *-2.webp # Template thumbnails
├── blueprints/             # Reusable subgraph blueprint definitions
├── bundles.json            # Maps template names → Python package bundles
├── blueprints_bundles.json # Maps blueprint names → package
├── packages/               # Python distribution packages (Nx monorepo)
│   ├── core/               # Loader + manifest
│   ├── media_api/          # API-calling templates (Replicate, BFL, etc.)
│   ├── media_image/        # Image generation templates
│   ├── media_video/        # Video generation templates
│   ├── media_other/        # Audio, 3D, utilities
│   ├── meta/               # Meta package aggregating all above
│   └── blueprints/         # Subgraph blueprints package
├── scripts/                # Python: validation, sync, i18n
├── site/                   # INDEPENDENT Astro 5 project (see "Site" section below)
├── docs/                   # Specs, i18n guide, publishing guide
├── .claude/skills/         # 6 Claude skill definitions
├── .github/workflows/      # CI/CD (validation, deploy, lint, tests)
├── pyproject.toml          # Python project version & config
├── package.json            # Nx monorepo root (npm run sync, etc.)
└── nx.json                 # Nx workspace config
```

## Two Distinct Systems

### System 1: Template Packages (Python/PyPI)
- Templates are grouped into 4 media bundles via `bundles.json`
- `scripts/sync_bundles.py` copies templates + thumbnails into package directories
- Published to PyPI as `comfyui-workflow-templates-*` packages
- Version lives in root `pyproject.toml` (currently 0.8.43)

### System 2: Astro Website (`site/`)
- **Independent project** — own `package.json`, `pnpm-lock.yaml`, tooling
- Consumes templates from `../templates/` via sync scripts
- AI content generation pipeline (GPT-4o) enriches template pages
- Deployed to Vercel

## Data Flow

```
templates/index.json + *.json + *.webp
  ├──→ scripts/sync_bundles.py ──→ packages/media_*/
  └──→ site/scripts/sync-templates.ts ──→ site/src/content/templates/
       └──→ site/scripts/generate-ai.ts ──→ AI-enriched content
            └──→ astro build ──→ templates.comfy.org (Vercel)
```

## Key Commands

### Root (template management)
```bash
npm run sync              # Sync bundle manifests + assets to packages
python scripts/validate_templates.py   # Validate template JSON
python scripts/sync_data.py --templates-dir templates  # Sync i18n translations
```

### Site (in site/ directory)
```bash
pnpm install              # Install deps (required first)
pnpm run dev              # Dev server at localhost:4321
pnpm run build            # Full build (prebuild + astro build)
pnpm run sync             # Sync templates from ../templates/
pnpm run sync -- --top-50 # Sync top 50 only (faster dev)
pnpm run generate:ai      # AI content generation (needs OPENAI_API_KEY)
pnpm run generate:ai -- --skip-ai  # Use placeholder content (no API key needed)
pnpm run lint             # ESLint
pnpm run format           # Prettier
pnpm run test:e2e         # Playwright E2E tests
```

## Template Structure

### index.json Entry
Each template in `templates/index.json` has:
- `name` — Must match the JSON filename (snake_case, no extension)
- `title`, `description` — Display metadata
- `mediaType` — "image" | "video" | "audio" | "3d"
- `mediaSubtype` — Usually "webp"
- `thumbnailVariant` — "compareSlider" | "hoverDissolve" | "hoverZoom" | "zoomHover" | null
- `tags`, `models`, `logos`, `date`, `usage`, `size`, `vram`, `searchRank`
- `tutorialUrl`, `openSource`, `requiresCustomNodes`, `io`

### Workflow JSON Files
Standard ComfyUI workflow format with embedded model metadata:
- `properties.models[]` — Download URLs, SHA256 hashes, target directories
- `properties.cnr_id` + `properties.ver` — Node version pinning

### Thumbnails
- Named `{template_name}-1.webp` (primary), `{template_name}-2.webp` (comparison)
- WebP format, target <1MB, 512×512 or 768×768

## Bundle Assignment
Templates in `bundles.json` map to Python packages:
| Bundle | Contents |
|--------|----------|
| `media-api` | Templates using external APIs |
| `media-image` | Image generation/editing |
| `media-video` | Video generation |
| `media-other` | Audio, 3D, utilities |

## Internationalization

### 11 Supported Languages
en (default), zh, zh-TW, ja, ko, es, fr, ru, tr, ar, pt-BR

### Template i18n
- Master: `templates/index.json` (English)
- Locales: `templates/index.{locale}.json`
- Translation tracking: `scripts/i18n.json`
- Sync: `python scripts/sync_data.py --templates-dir templates`

### Site i18n
- Config: `site/src/i18n/config.ts`
- UI strings: `site/src/i18n/ui.ts`
- URL pattern: English at `/templates/`, others at `/{locale}/templates/`
- SEO: Hreflang tags via `HreflangTags.astro`

## Site Architecture (Astro 5)

### Key Directories
- `site/src/pages/` — Route pages ([slug].astro, [locale]/templates/)
- `site/src/components/` — Astro components (TemplateCard, TemplateDetailPage, etc.)
- `site/src/lib/` — Utilities (templates.ts, urls.ts, slugify.ts, model-logos.ts)
- `site/src/content/` — Content collections (git-ignored, generated by sync)
- `site/scripts/` — Build scripts (sync, AI generation, previews, OG images)
- `site/knowledge/` — AI generation context (prompts, model docs, concepts)
- `site/overrides/templates/` — Human-edited content (survives AI regeneration)

### AI Content Pipeline
1. `sync-templates.ts` syncs metadata from `../templates/`
2. `generate-ai.ts` calls GPT-4o with context from `knowledge/`
3. Generates: extendedDescription, howToUse[], metaDescription, suggestedUseCases[], faqItems[]
4. Content templates: tutorial (default), showcase, comparison, breakthrough
5. Cached in `.content-cache/` with hash-based invalidation
6. Human overrides in `site/overrides/templates/{name}.json` (set `humanEdited: true`)

### Critical Site Components (DO NOT remove/modify without care)
- `SEOHead.astro` — Meta tags, structured data
- `HreflangTags.astro` — i18n SEO
- `t()` calls, `localizeUrl()` — i18n functions
- `<Analytics />` — Telemetry

## CI/CD

### Template Validation (triggers on templates/ changes)
- `validate-templates.yml` — JSON schema validation
- `validate-blueprints.yml` — Blueprint validation
- `validate-manifests.yml` — Manifest sync check
- `link-checker.yml` — Model download URL validation

### Site (triggers on site/ changes)
- `lint-site.yml` — ESLint + Prettier
- `e2e-tests-site.yml` — Playwright tests
- `visual-regression-site.yml` — Visual regression
- `seo-audit-site.yml` — SEO audit
- `lighthouse.yml` — Performance checks
- `deploy-site.yml` — Manual Vercel deploy

## Code Style
- **Python**: Ruff, line-length 100, py312, rules E/F
- **TypeScript/Astro**: ESLint + Prettier (configured in site/)
- **Templates**: snake_case naming, JSON format
- **Commits**: Bump version in `pyproject.toml` when modifying templates

## Claude Skills Available
- `/adding-templates` — Add new workflow templates (full workflow)
- `/managing-bundles` — Move templates between bundles, reorder
- `/managing-thumbnails` — Add/replace/audit thumbnails
- `/managing-translations` — Sync/check translations across 11 languages
- `/editing-site-content` — Edit site page content with overrides
- `/regenerating-ai-content` — Regenerate AI descriptions, manage cache

## Important Docs
- `docs/SPEC.md` — Formal template JSON schema
- `docs/BLUEPRINTS.md` — Subgraph blueprint spec
- `docs/I18N_GUIDE.md` — Translation management workflow
- `site/docs/PRD.md` — Product requirements for the site
- `site/docs/TDD.md` — Technical design document
- `site/docs/design-integration-guide.md` — REQUIRED when implementing Figma designs
