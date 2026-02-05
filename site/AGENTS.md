# Site Directory - Agent Instructions

## Overview

This directory contains the AI content generation pipeline for the ComfyUI template site.

## ⚠️ Scope Boundaries

**This `site/` package is independent from the parent `workflow_templates/` Nx monorepo.**

When adding CI workflows, scripts, or configuration:

- All CI workflows MUST use `paths: ['site/**']` triggers
- All CI jobs MUST use `working-directory: site`
- All `pnpm-lock.yaml` cache paths MUST reference `site/pnpm-lock.yaml`
- Do NOT modify parent monorepo configs (`nx.json`, root `package.json`, etc.)
- Do NOT add workflows that trigger on changes outside `site/`

## Commands

### Setup

```bash
# Install dependencies (required before any other command)
pnpm install
```

### Development

```bash
# Start Astro dev server (localhost:4321)
pnpm run dev

# Preview production build locally
pnpm run preview
```

### Build

```bash
# Full build (runs prebuild: sync + sync:tutorials + generate:ai + generate:previews)
pnpm run build

# Run Astro CLI directly
pnpm run astro
```

### Sync Commands

```bash
# Sync ALL templates for all locales (200+ templates × 11 languages)
pnpm run sync

# Sync top 50 templates by usage (faster for development)
pnpm run sync -- --top-50

# Sync top N templates by usage
pnpm run sync -- --limit 100

# Sync English only (faster for development)
pnpm run sync:en-only

# Sync a specific locale
pnpm run sync:locale zh
pnpm run sync:locale ja

# Sync tutorials from docs repo (builds knowledge base for AI context)
pnpm run sync:tutorials
```

### AI Content Generation

```bash
# Full AI generation for all templates (requires OPENAI_API_KEY)
pnpm run generate:ai

# Test mode - process first template only
pnpm run generate:ai:test

# Generate for specific template only
pnpm run generate:ai:template
# Or with explicit template name:
pnpm run generate:ai -- --template <name>

# Skip AI calls (use placeholder content)
pnpm run generate:ai -- --skip-ai

# Force regenerate all (ignore cache)
pnpm run generate:ai:force
# Or:
pnpm run generate:ai -- --force

# Dry run - show what would be regenerated without making changes
pnpm run generate:ai:dry-run
# Or:
pnpm run generate:ai -- --dry-run

# Combined: test specific template without AI
pnpm run generate:ai -- --template <name> --skip-ai
```

### Cache Management

```bash
# View cache statistics (entries, size, model usage, timeline)
pnpm run cache:status

# Clear all cached AI content (requires --force or -f)
pnpm run cache:clear --force
# Or preview what would be deleted:
pnpm run cache:clear --dry-run
```

### Preview Generation

```bash
# Generate preview images for templates
pnpm run generate:previews

# Generate OG (Open Graph) images for social sharing
pnpm run generate:og
```

### Testing

```bash
# Run E2E tests with Playwright
pnpm run test:e2e

# Run E2E tests in headed mode (visible browser)
pnpm run test:e2e:headed

# Run visual regression tests
pnpm run test:visual

# Update visual regression snapshots
pnpm run test:visual:update
```

### Code Quality

```bash
# Run ESLint (fails on warnings)
pnpm run lint

# Run ESLint with auto-fix
pnpm run lint:fix

# Format all files with Prettier
pnpm run format

# Check formatting without writing
pnpm run format:check
```

### SEO & Research Tools

```bash
# Validate sitemap structure and URLs (run after build)
pnpm run validate:sitemap

# Run SEO audit on built site (checks meta, OG, structured data)
pnpm run audit:seo

# Research competitor keywords (outputs to docs/competitor-analysis.md)
pnpm run research:competitors

# Research "People Also Ask" questions (outputs to docs/paa-research.md)
pnpm run research:paa
```

### Full Prebuild Pipeline

The `prebuild` script runs automatically before `build` and executes in parallel phases:

**Phase 1 (parallel):**

- `sync` - Sync template metadata
- `sync:tutorials` - Sync tutorial content

**Phase 2 (parallel):**

- `generate:ai` - Generate AI content
- `generate:previews` - Generate preview images
- `generate:og` - Generate OG images

### Build Profiling

```bash
# Run full build with detailed timing breakdown
pnpm run build:profile

# Run sequential prebuild (for debugging)
pnpm run prebuild:sequential
```

## Project Structure

```
site/
├── scripts/
│   ├── generate-ai.ts       # Main AI generation pipeline
│   └── sync-tutorials.ts    # Syncs tutorials from docs repo
├── knowledge/
│   ├── prompts/
│   │   ├── system.md        # Base system prompt
│   │   ├── tutorial.md      # Tutorial content template
│   │   ├── showcase.md      # Showcase content template
│   │   ├── comparison.md    # Comparison content template
│   │   └── breakthrough.md  # Breakthrough content template
│   ├── models/              # Model-specific documentation
│   ├── concepts/            # Domain concept documentation
│   └── tutorials/           # Synced tutorials from docs repo
├── overrides/templates/     # Human-edited content (preserved)
├── src/content/templates/   # Generated content (git-ignored)
└── .content-cache/          # AI generation cache (git-ignored)
```

## Content Template Types

When generating content, select appropriate template based on:

- **tutorial**: Default for most templates, step-by-step guides
- **showcase**: Templates with strong visual outputs
- **comparison**: Templates that compete with alternatives
- **breakthrough**: New model releases, cutting-edge features

## Key Features

- **Content template selection**: Automatically selects tutorial/showcase/comparison/breakthrough based on template metadata
- **Tutorial context injection**: Matches templates to relevant docs.comfy.org tutorials for better AI context
- **Quality validation**: Checks word count, step count, FAQ count, keyword presence, and meta description length
- **Smart caching with versioning**:
  - Cache manifest tracks template hash, prompt version hash, generation timestamp, and model used
  - Prompt changes automatically invalidate affected cache entries
  - `--force` flag to regenerate all content
  - `--dry-run` flag to preview what would be regenerated
  - Cache statistics output (hits, misses, regenerated)

## Key Files

- `generate-ai.ts` - Main generation pipeline with CLI options
- `sync-tutorials.ts` - Syncs tutorials from docs repo to knowledge base
- `sync-templates.ts` - Syncs template metadata (supports 11 languages)
- `knowledge/prompts/system.md` - Base GPT-4o system prompt
- `../docs/ai-content-generation-strategy.md` - Full strategy documentation

## Internationalization (i18n)

### Supported Languages

| Code  | Language              | Native Name | RTL |
| ----- | --------------------- | ----------- | --- |
| en    | English               | English     | No  |
| zh    | Chinese (Simplified)  | 简体中文    | No  |
| zh-TW | Chinese (Traditional) | 繁體中文    | No  |
| ja    | Japanese              | 日本語      | No  |
| ko    | Korean                | 한국어      | No  |
| es    | Spanish               | Español     | No  |
| fr    | French                | Français    | No  |
| ru    | Russian               | Русский     | No  |
| tr    | Turkish               | Türkçe      | No  |
| ar    | Arabic                | العربية     | Yes |
| pt-BR | Portuguese (Brazil)   | Português   | No  |

### URL Structure

- English (default): `/templates/`, `/templates/{slug}/`
- Other locales: `/{locale}/templates/`, `/{locale}/templates/{slug}/`

### Key i18n Files

- `src/i18n/config.ts` - Language definitions, locale list
- `src/i18n/utils.ts` - URL localization, locale detection
- `src/i18n/ui.ts` - UI string translations
- `src/components/HreflangTags.astro` - SEO hreflang tags
- `src/lib/templates.ts` - Template utilities with locale support

### Content Flow

1. Source data: `../templates/index.{lang}.json` (12 files)
2. Sync script reads all locale files and writes to `src/content/templates/`
3. English templates at root, localized at `src/content/templates/{locale}/`
4. Pages generated at `/{locale}/templates/` via `[locale]/templates/` routes

## Environment Variables

| Variable             | Required   | Description                     |
| -------------------- | ---------- | ------------------------------- |
| `OPENAI_API_KEY`     | For AI gen | OpenAI API key                  |
| `SKIP_AI_GENERATION` | Optional   | Set `true` for placeholder mode |

## CI/CD Workflows

GitHub Actions workflows in `.github/workflows/`:

| Workflow                | Trigger              | Description                             |
| ----------------------- | -------------------- | --------------------------------------- |
| `ci-lint-format.yml`    | Push/PR to `site/**` | Runs lint and format checks             |
| `e2e-tests.yml`         | Push/PR to `site/**` | Runs Playwright E2E tests               |
| `visual-regression.yml` | Push/PR to `site/**` | Runs visual regression tests            |
| `seo-audit.yml`         | Push/PR to `site/**` | Runs SEO audit on built site            |
| `i18n-update.yml`       | Manual / Scheduled   | Updates i18n translations automatically |

## Pre-commit Hooks

Husky + lint-staged is configured for pre-commit hooks:

- **JS/TS/Astro files**: ESLint fix + Prettier
- **JSON/MD/YAML/CSS files**: Prettier

Run `pnpm install` to set up hooks (via `prepare` script).

## Related Documentation

- `../docs/ai-content-generation-strategy.md` - Content strategy
- `../docs/template-site-prd.md` - Product requirements
- `../docs/template-site-design.md` - Technical design
- `docs/design-integration-guide.md` - **REQUIRED READING** when implementing Figma designs

## ⚠️ Design Implementation Warning

When implementing designs from Figma, **do NOT remove or modify** these critical components:

1. **SEO:** `SEOHead.astro`, `HreflangTags.astro`, `structuredData` prop
2. **i18n:** `t()` function calls, `localizeUrl()`, `lang`/`dir` attributes
3. **Telemetry:** `<Analytics />`, vitals script

See `docs/design-integration-guide.md` for the complete checklist.

## Build Optimization Notes

### Optimizations Applied (Feb 2026)

**Astro Config (`astro.config.mjs`):**

- Enabled `build.concurrency` using all available CPU cores for parallel page generation
- Configured Sharp image service with pixel limits to prevent memory issues
- Enabled `experimental.responsiveImages` for automatic srcset generation
- Added Vite optimizations: manual chunking, dependency pre-bundling, disabled dev sourcemaps

**Parallel Prebuild (`scripts/prebuild-parallel.ts`):**

- Phase 1 runs `sync` + `sync:tutorials` in parallel (independent data sources)
- Phase 2 runs `generate:ai` + `generate:previews` in parallel
- Outputs timing breakdown and time saved vs sequential execution

**Preview Generation (`scripts/generate-previews.ts`):**

- Uses parallel workers based on CPU count (`os.cpus().length - 1`)
- Incremental generation: only regenerates when workflow file is newer than preview
- Outputs timing summary

**Build Profiling (`pnpm run build:profile`):**

- Runs full build pipeline with detailed timing for each phase
- Reports output file count and size
- Useful for identifying bottlenecks

**Caching:**

- AI content cached in `.content-cache/` with hash-based invalidation
- Preview images regenerated only when source workflow changes
- Astro's built-in caching for content collections

**Tips for faster builds:**

- Use `--skip-ai` flag during development if AI content isn't needed
- Run `pnpm run build:profile` to identify slow phases
- Preview generation is I/O bound; consider SSD or ramdisk for large sites
