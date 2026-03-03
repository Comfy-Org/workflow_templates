# AGENTS.md

## Build & Run Commands
- `npm run sync` — Sync template bundles (run after editing templates/ or bundles.json)
- `python scripts/validate_templates.py` — Validate template JSON files
- `python scripts/sync_bundles.py` — Regenerate manifest and copy assets to packages

## Architecture
- **Monorepo** with Nx, Python packages, and Astro site
- `templates/` — Source workflow JSON files and thumbnails (index.json is the manifest)
- `packages/` — Python packages: core (loader), media_* (templates by type: api, image, video, other)
- `site/` — Astro static site (independently managed; see below)
- `scripts/` — Python validation/sync scripts for CI and local dev

## Template Site
The `site/` directory is an independent Astro 5 project with Vue 3 interactive islands.
For full site-specific instructions, see `site/AGENTS.md`.

**Island architecture summary:**
- `.astro` for static/SSR content and data fetching — `.vue` with `client:load` for interactive UI
- Serialize content collections to plain JSON objects before passing as props to Vue islands
- Each `client:load` Vue component is a separate Vue app — `provide`/`inject`/`$emit` don't cross islands
- Cross-island state: shared composables in `site/src/composables/` with module-level `ref()` singletons
- Astro→Vue bridge: Vue island attaches `addEventListener` to Astro DOM elements by ID in `onMounted()` — no `<script>` tags with `dispatchEvent` in `.astro` files

## Code Style
- **Python**: Ruff linter, line-length 100, target py312. Select rules: E, F
- **Templates**: JSON workflow files with embedded model metadata. Thumbnails named `{template}-1.webp`
- **Naming**: snake_case for Python/templates
- Bump version in root `pyproject.toml` when adding/modifying templates

### Vue 3 & Astro Standards (site/)
- All Vue components use `<script setup lang="ts">` with Composition API only — no Options API, no mixins
- Cross-component communication via shared composables (`site/src/composables/`) with module-level reactive refs — NEVER use `document.dispatchEvent(new CustomEvent(...))` or event bus patterns between Vue components
- Astro-to-Vue bridge: attach listeners to specific DOM elements by ID in `onMounted()`, not via inline `<script>` tags with `dispatchEvent`
- Props via `defineProps<T>()`, emits via `defineEmits<T>()`, reactivity via `ref()`, `computed()`, `watch()`
