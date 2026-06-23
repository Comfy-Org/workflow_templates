# AGENTS.md

## Build & Run Commands
- `npm run sync` — Sync template bundles (run after editing templates/ or bundles.json)
- `npm run sync:templates` — Full i18n sync pipeline (`scripts/sync/sync_data.py`)
- `npm run sync:bundles` — Regenerate manifest and copy assets to packages
- `npm run validate:templates` — Validate template JSON files
- `npm run validate:manifests` — Validate package manifests
- `python scripts/sync/sync_bundles.py` — Same as `npm run sync:bundles`
- `python scripts/validate/validate_templates.py` — Same as `npm run validate:templates`

## Architecture
- **Monorepo** with Nx, Python packages, and Astro site
- `templates/` — Source workflow JSON files and thumbnails (index.json is the manifest)
- `packages/` — Python packages: core (loader), media_* (templates by type: api, image, video, other)
- `site/` — Astro static site (independently managed; see below)
- `scripts/` — Python validation/sync scripts for CI and local dev (see `scripts/README.md`)

## Root `scripts/` layout (Python)

**Do not confuse with `site/scripts/`** — that is a separate TypeScript toolchain for the Astro site. Site CI never uses root `scripts/`.

Root `scripts/` is organized by role:

| Directory | Put here | Examples |
|-----------|----------|----------|
| `scripts/sync/` | Sync / generate data | `sync_data.py`, `sync_bundles.py`, `sync_mcp_index.py` |
| `scripts/validate/` | Validation & analysis (CI) | `validate_templates.py`, `check_links.py`, `analyze_models.py` |
| `scripts/blueprints/` | Blueprint-specific import | `import_blueprints.py` |
| `scripts/ci/` | Release pipeline only | `ci_version_manager.py`, `check_pypi_quota.py` |
| `scripts/data/` | Static config JSON | `i18n.json`, `whitelist.json`, `models_capabilities.json` |
| `scripts/lib/` | Shared importable modules | `paths.py`, `locale_index_files.py` |
| `scripts/maintenance/` | Local-only / one-off tools | `archive_templates.py`, `check_templates.sh` |
| `scripts/docs/` | Script-specific markdown docs | `whitelist.md`, `check_input_assets.md` |

### Path migration (old → new)

| Old path | New path |
|----------|----------|
| `scripts/sync_bundles.py` | `scripts/sync/sync_bundles.py` |
| `scripts/sync_data.py` | `scripts/sync/sync_data.py` |
| `scripts/validate_templates.py` | `scripts/validate/validate_templates.py` |
| `scripts/i18n.json` | `scripts/data/i18n.json` |
| `scripts/whitelist.json` | `scripts/data/whitelist.json` |
| `scripts/locale_index_files.py` | `scripts/lib/locale_index_files.py` |
| `scripts/ci_version_manager.py` | `scripts/ci/ci_version_manager.py` |
| `scripts/sync-mcp-index.py` | `scripts/sync/sync_mcp_index.py` |

Full index and CI mapping: [`scripts/README.md`](scripts/README.md).

### Conventions for adding files

**New Python CLI script**
1. Place it in the correct subdirectory (`sync/`, `validate/`, `maintenance/`, etc.) — not the `scripts/` root.
2. Use `snake_case.py` naming (no hyphens).
3. Derive repo root via `scripts/lib/paths.py` — do **not** hardcode `scripts/i18n.json` or rebuild paths from `Path(__file__).parent`.
4. If the script lives in a subdirectory, use `REPO_ROOT` from `paths.py` instead of `Path(__file__).parents[1]`.

**Importing shared modules from `scripts/lib/`**

```python
import sys
from pathlib import Path

_lib_dir = Path(__file__).resolve().parent.parent / "lib"
if str(_lib_dir) not in sys.path:
    sys.path.insert(0, str(_lib_dir))

from paths import REPO_ROOT, TEMPLATES_DIR, I18N_FILE, WHITELIST_FILE  # noqa: E402
```

**New config / data JSON** → `scripts/data/`. Update `scripts/lib/paths.py` if other scripts need the path.

**New shared Python module** (not a CLI) → `scripts/lib/`. Add `__init__.py` if needed; keep modules import-only.

**Generated output** → `scripts/.output/` (gitignored) or repo root reports (`model_analysis_report.md`). Never commit generated JSON into `scripts/data/`.

**CI workflow changes** — when a workflow uses sparse-checkout and the script imports `scripts/lib/paths.py`, include **both** the script path and `scripts/lib/paths.py` (and any `scripts/data/*` it reads). Update `on.*.paths` triggers to match the new file location.

**Docs & references** — update paths in: `.github/workflows/`, `.claude/skills/`, `docs/`, `packages/core/tests/` (if loading scripts via `importlib`), `tools/project.json`, root `package.json` scripts, and skills that mention commands.

**Tests loading scripts** — use the new path, e.g. `REPO_ROOT / "scripts" / "sync" / "sync_bundles.py"`.

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
