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
├── scripts/                # Python: validation, sync, i18n (see scripts/README.md)
│   ├── sync/               # sync_data, sync_bundles, sync_blueprints, etc.
│   ├── mcp/                # MCP index pipeline (index.mcp.json)
│   ├── validate/           # validate_templates, check_links, analyze_models, etc.
│   ├── ci/                 # ci_version_manager, PyPI quota, version helpers
│   ├── data/               # i18n.json, whitelist.json, models_capabilities.json
│   ├── lib/                # Shared modules (paths, locale_index_files, ai/)
│   ├── maintenance/        # archive_templates, local-only tools
│   ├── blueprints/         # import_blueprints
│   └── docs/               # Script-specific markdown (whitelist.md, etc.)
├── site/                   # INDEPENDENT Astro 5 project (see "Site" section below)
├── docs/                   # Specs, i18n guide, publishing guide
├── .claude/skills/         # Claude skill definitions (incl. managing-mcp-index)
├── .github/workflows/      # CI/CD (validation, deploy, lint, tests)
├── pyproject.toml          # Python project version & config
├── package.json            # Nx monorepo root (npm run sync, etc.)
└── nx.json                 # Nx workspace config
```

## Two Distinct Systems

### System 1: Template Packages (Python/PyPI)

- Templates are grouped into 4 media bundles via `bundles.json`
- `scripts/sync/sync_bundles.py` copies templates + thumbnails into package directories
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
  ├──→ scripts/sync/sync_bundles.py ──→ packages/media_*/
  └──→ site/scripts/sync-templates.ts ──→ site/src/content/templates/
       └──→ site/scripts/generate-ai.ts ──→ AI-enriched content
            └──→ astro build ──→ templates.comfy.org (Vercel)
```

## Key Commands

### Root (template management)

```bash
npm run sync                    # Sync bundle manifests + assets to packages
npm run sync:bundles            # Same as above (explicit)
npm run sync:templates          # Full i18n sync pipeline
npm run validate:templates      # Validate template JSON
npm run validate:manifests      # Validate package manifests

python scripts/validate/validate_templates.py
python scripts/sync/sync_data.py --templates-dir templates   # Sync i18n translations
python scripts/sync/sync_bundles.py
```

### Root `scripts/` (Python maintenance)

**Do not confuse with `site/scripts/`** — that is TypeScript for the Astro site. Site CI never uses root `scripts/`.

| Directory | Put here | Examples |
|-----------|----------|----------|
| `scripts/sync/` | Sync / generate data | `sync_data.py`, `sync_bundles.py` |
| `scripts/mcp/` | MCP index pipeline | `sync_index.py`, `enhance_descriptions.py` |
| `scripts/validate/` | Validation & analysis (CI) | `validate_templates.py`, `check_links.py`, `analyze_models.py` |
| `scripts/blueprints/` | Blueprint import | `import_blueprints.py` |
| `scripts/ci/` | Release pipeline only | `ci_version_manager.py`, `check_pypi_quota.py` |
| `scripts/data/` | Static config JSON | `i18n.json`, `whitelist.json`, `models_capabilities.json` |
| `scripts/lib/` | Shared importable modules | `paths.py`, `locale_index_files.py`, `ai/` |
| `scripts/maintenance/` | Local-only / one-off tools | `archive_templates.py`, `check_templates.sh` |
| `scripts/docs/` | Script-specific markdown | `whitelist.md`, `check_input_assets.md` |

**Path migration (old → new):**

| Old path | New path |
|----------|----------|
| `scripts/sync_bundles.py` | `scripts/sync/sync_bundles.py` |
| `scripts/sync_data.py` | `scripts/sync/sync_data.py` |
| `scripts/validate_templates.py` | `scripts/validate/validate_templates.py` |
| `scripts/i18n.json` | `scripts/data/i18n.json` |
| `scripts/whitelist.json` | `scripts/data/whitelist.json` |
| `scripts/locale_index_files.py` | `scripts/lib/locale_index_files.py` |
| `scripts/ci_version_manager.py` | `scripts/ci/ci_version_manager.py` |
| `scripts/sync-mcp-index.py` | `scripts/mcp/sync_index.py` |

Full index and CI mapping: [`scripts/README.md`](scripts/README.md). Agent quick reference: [`AGENTS.md`](AGENTS.md).

**Conventions when adding files:**

1. **New Python CLI** — place in the correct subdirectory (`sync/`, `validate/`, etc.), use `snake_case.py`, import paths from `scripts/lib/paths.py` (never hardcode `scripts/i18n.json` or use `Path(__file__).parents[1]` for repo root).
2. **New config JSON** — `scripts/data/`; add a constant to `paths.py` if other scripts need it.
3. **New shared module** — `scripts/lib/` (import-only, not a CLI).
4. **Generated output** — `scripts/.output/` (gitignored) or repo-root reports; never commit generated files into `scripts/data/`.
5. **CI workflows** — if sparse-checkout is used and the script imports `paths.py`, checkout the script **and** `scripts/lib/paths.py` (and any `scripts/data/*` it reads). Update `on.*.paths` triggers to the new file location.
6. **Cross-repo updates** — also update `.github/workflows/`, `.claude/skills/`, `docs/`, `packages/core/tests/` (importlib paths), `tools/project.json`, and root `package.json`.

Import pattern for `scripts/lib/`:

```python
import sys
from pathlib import Path

_lib_dir = Path(__file__).resolve().parent.parent / "lib"
if str(_lib_dir) not in sys.path:
    sys.path.insert(0, str(_lib_dir))

from paths import REPO_ROOT, TEMPLATES_DIR, I18N_FILE, WHITELIST_FILE  # noqa: E402
```

### Root (template + MCP index)

```bash
npm run sync              # Bundle sync (Nx)
npm run sync:bundles      # Copy templates into Python packages
npm run i18n              # Hub translations index.json → index.{locale}.json
npm run mcp               # MCP index: index.json → index.mcp.json
npm run mcp:check         # MCP sync dry-run
npm run mcp:ai            # AI English MCP template descriptions (stale only)
npm run mcp:models        # AI model profiles → models_registry.json
npm run validate:templates
```

MCP pipeline details: [`scripts/mcp/docs/MCP_AI_ENHANCEMENT.md`](scripts/mcp/docs/MCP_AI_ENHANCEMENT.md). Agent skill: `/managing-mcp-index`.

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


| Bundle        | Contents                      | PyPI status |
| ------------- | ----------------------------- | ----------- |
| `media-api`   | Templates using external APIs | **Frozen** (0.3.84, **95.5 MB** on PyPI) |
| `media-image` | Image generation/editing      | **Frozen** (0.3.160, **85.3 MB** on PyPI) |
| `media-video` | Video generation              | **Frozen** (0.3.101, **99.5 MB** on PyPI) |
| `media-other` | Audio, 3D, utilities          | **Frozen** (0.3.229, **85.0 MB** on PyPI) |
| `media-assets-01` | **New** template thumbnails/media | Active |

Frozen legacy `media-*` bundles: [`scripts/docs/frozen_bundles.md`](scripts/docs/frozen_bundles.md) (why frozen, CI, publishing).

## Internationalization

### 11 Supported Languages

en (default), zh, zh-TW, ja, ko, es, fr, ru, tr, ar, pt-BR

### Template i18n

- Master: `templates/index.json` (English)
- Locales: `templates/index.{locale}.json`
- Translation tracking: `scripts/data/i18n.json`
- Sync: `python scripts/sync/sync_data.py --templates-dir templates`

### Site i18n

- Config: `site/src/i18n/config.ts`
- UI strings: `site/src/i18n/ui.ts`
- URL pattern: English at `/templates/`, others at `/{locale}/templates/`
- SEO: Hreflang tags via `HreflangTags.astro`

## Site Architecture (Astro 5)

### Key Directories

- `site/src/pages/` — Route pages ([slug].astro, [locale]/templates/)
- `site/src/components/` — Astro (.astro) and Vue (.vue) components
- `site/src/composables/` — Shared Vue 3 composables for cross-island state
- `site/src/lib/` — Utilities (templates.ts, urls.ts, slugify.ts, model-logos.ts)
- `site/src/content/` — Content collections (git-ignored, generated by sync)
- `site/scripts/` — Build scripts (sync, AI generation, previews, OG images)
- `site/knowledge/` — AI generation context (prompts, model docs, concepts)
- `site/overrides/templates/` — Human-edited content (survives AI regeneration)

### Island Architecture (Astro + Vue 3)

Astro renders pages as static HTML. Interactive sections use Vue 3 components mounted as **islands** via `client:`* directives. Each island is a separate Vue app instance.

**When to use Astro vs Vue:**

- `.astro` — Static content, layouts, SEO markup, data fetching (`getCollection()`, API calls)
- `.vue` with `client:load` — Interactive UI that needs reactivity on page load (filters, search, drawers)
- `.vue` with `client:visible` — Interactive UI that can wait until scrolled into view (below-fold widgets)
- `.vue` without `client:`* — SSR-only Vue (renders HTML at build time, no client JS)

**Data flow — Astro page → Vue island:**

```
[page].astro                          Vue island
─────────────                         ──────────
getCollection('templates')
  → serialize to plain objects
  → pass as props via client:load  →  defineProps<T>()
```

Always serialize Astro content collection entries to plain objects before passing to Vue. Vue islands cannot receive Astro class instances, `Date` objects, or `Map`/`Set` — only JSON-serializable data.

**Cross-island communication — Vue island ↔ Vue island:**
Each `client:load` creates a separate Vue app, so `provide`/`inject` and `$emit` do NOT work across islands. Use shared composables with module-level reactive state:

```
site/src/composables/useHubStore.ts   (module-level refs)
   ├── HubBrowse.vue (island 1)      imports useHubStore()
   └── SearchPopover.vue (island 2)  imports useHubStore(), watches shared ref
```

Module-level `ref()` values are singletons in the browser bundle — all islands that import the same composable share the same reactive state.

**Astro → Vue runtime bridge:**
When a DOM element in Astro markup (e.g. a hamburger button) needs to trigger Vue state, the Vue island attaches a listener to that element by ID in `onMounted()`:

```ts
// In the Vue island's <script setup>
onMounted(() => {
  document.getElementById('some-astro-button')
    ?.addEventListener('click', store.someAction);
});
```

Do NOT use inline `<script>` tags in `.astro` files that `dispatchEvent(new CustomEvent(...))`. The Vue island owns the listener.

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
- **Commits**: Bump root `pyproject.toml` only for intentional PyPI releases (`release` label)

### Vue 3 & Astro Coding Standards

All Vue components MUST use standard Vue 3 Composition API and idiomatic Astro patterns. Write senior-level, production-quality code.

**Vue 3 — Required Patterns:**

- `<script setup lang="ts">` for all components — no Options API
- Standard reactivity: `ref()`, `computed()`, `watch()`, `watchEffect()`
- Props via `defineProps<T>()`, emits via `defineEmits<T>()`
- Cross-component state via shared composables in `site/src/composables/` using module-level reactive refs
- Template refs via `useTemplateRef()` or `ref<HTMLElement | null>(null)`
- Lifecycle: `onMounted()`, `onUnmounted()` — never raw `addEventListener` on `window`/`document` without cleanup

**Vue 3 — Forbidden Patterns:**

- `document.dispatchEvent(new CustomEvent(...))` for component communication — use composables
- `document.addEventListener(...)` to listen for custom events from other Vue components
- Event bus libraries or mitt — use shared composables with reactive state instead
- Options API (`data()`, `methods`, `computed:`, `watch:` as object)
- `this.$emit`, `this.$refs`, or any `this`-based API
- Mixins — use composables

**Astro — Required Patterns:**

- Astro components (`.astro`) for static/SSR content, Vue islands (`client:load`/`client:visible`) for interactivity
- Pass data from Astro to Vue via props only — serialize to plain objects
- For Astro-to-Vue runtime communication (e.g. a button in `.astro` triggering Vue state), attach event listeners to specific DOM elements by ID inside the Vue component's `onMounted()` — do NOT use inline `<script>` tags with `dispatchEvent`
- Cross-island state sharing via shared composables (module-level refs are singletons in the browser bundle)

## Claude Skills Available

- `/adding-templates` — Add new workflow templates (full workflow)
- `/managing-bundles` — Move templates between bundles, reorder
- `/managing-thumbnails` — Add/replace/audit thumbnails
- `/managing-mcp-index` — Sync and AI-enhance `index.mcp.json` for MCP tools
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
- `scripts/mcp/docs/MCP_AI_ENHANCEMENT.md` — MCP index sync + AI enhancement workflow
- `scripts/README.md` — Scripts directory index, CI mapping, commands
- `AGENTS.md` — Agent quick reference (commands, scripts layout, file conventions)

