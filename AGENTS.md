# AGENTS.md

## Build & Run Commands
- `npm run sync` — Sync template bundles (run after editing templates/ or bundles.json)
- `npm run sync:templates` / `npm run i18n` — Hub i18n: `index.json` → `index.{locale}.json` (NOT MCP)
- `npm run sync:bundles` — Regenerate manifest and copy assets to packages
- `npm run mcp` — Sync `index.json` → `index.mcp.json` (MCP tool index)
- `npm run mcp:check` — MCP sync dry-run
- `npm run mcp:ai` — AI English descriptions for stale MCP templates
- `npm run mcp:models` — AI model profiles in `models_registry.json`
- `npm run validate:templates` — Validate template JSON files
- `npm run validate:manifests` — Validate package manifests
- `npm run validate:comfyui-nodes` — Compare templates to ComfyUI node baseline (local: live `/object_info`)
- `python scripts/sync/sync_bundles.py` — Same as `npm run sync:bundles`
- `python scripts/sync/sync_is_app.py` — Write `isApp` into `index.json` from each workflow's `extra.linearMode` (`--dry-run` to report, `--check` for the CI gate)
- `python scripts/validate/validate_templates.py` — Same as `npm run validate:templates`
- `python scripts/validate/check_duplicate_thumbnails.py --audit` — Report all byte-identical and visually equivalent cross-template thumbnails (requires Pillow)
- `python scripts/validate/check_duplicate_thumbnails.py --base-ref origin/main` — Fail only for duplicate groups involving thumbnail changes since the branch base
- `python scripts/comfyui_node_compat/check.py --static-scan --clone-comfyui --no-fail` — CI-style static compat scan
- `python scripts/sync/sync_frozen_inventory.py` — Regenerate frozen bundle template inventory from `bundles.json`
- `python scripts/ci/check_frozen_policy.py --base-ref origin/main` — Dry-run frozen-bundle PR reminder locally

**MCP index pipeline:** see skill `.claude/skills/managing-mcp-index/SKILL.md` and `scripts/mcp/docs/MCP_AI_ENHANCEMENT.md`. Do not confuse with hub i18n (`i18n`) or site AI (`site/scripts/generate-ai.ts`).

**Frozen legacy media bundles:** see [`scripts/docs/frozen_bundles.md`](scripts/docs/frozen_bundles.md) (policy, inventory, CI reminders, publishing).

## Archiving templates

Sole entry point: `scripts/maintenance/archive_templates.py` (full docstring in that file; also listed in `scripts/README.md`).

**Archive** a template:

1. Add `"status": "archived"` to the template entry in `templates/index.json`
2. Run `python3 scripts/maintenance/archive_templates.py`

The script moves the workflow JSON and thumbnails to `archived/`, removes the entry from `bundles.json` and all `templates/index*.json` files, moves i18n to `archived/archived_i18n.json`, and adds entries to `archived/index*.json` (including MCP).

**Restore** a template:

1. Set `"status": "active"` on the template in `archived/index.json`
2. Run the same script (restore runs first, then any pending archives)

**After archive or restore:** if `bundles.json` frozen-bundle rows changed, run `python scripts/sync/sync_frozen_inventory.py`. See [`scripts/docs/frozen_bundles.md`](scripts/docs/frozen_bundles.md) — archive does not require a legacy media wheel bump unless you intend a PyPI release.

## Architecture
- **Monorepo** with Nx, Python packages, and Astro site
- `templates/` — Source workflow JSON files and thumbnails (index.json is the manifest)
- `packages/` — Python packages: core (loader + manifest), json (all workflow JSON), media_* (legacy frozen assets), media_assets_* (new assets)
- `site/` — Astro static site (independently managed; see below)
- `scripts/` — Python validation/sync scripts for CI and local dev (see `scripts/README.md`)

## Root `scripts/` layout (Python)

**Do not confuse with `site/scripts/`** — that is a separate TypeScript toolchain for the Astro site. Site CI never uses root `scripts/`.

Root `scripts/` is organized by role:

| Directory | Put here | Examples |
|-----------|----------|----------|
| `scripts/sync/` | Sync / generate data | `sync_data.py`, `sync_bundles.py` |
| `scripts/mcp/` | MCP index pipeline | `sync_index.py`, `enhance_descriptions.py` |
| `scripts/validate/` | Validation & analysis (CI) | `validate_templates.py`, `check_links.py`, `analyze_models.py` |
| `scripts/comfyui_node_compat/` | ComfyUI node baseline vs templates | `check.py` |
| `scripts/blueprints/` | Blueprint-specific import | `import_blueprints.py` |
| `scripts/ci/` | Release pipeline only | `ci_version_manager.py`, `check_frozen_policy.py`, `check_pypi_quota.py` |
| `scripts/data/` | Static config JSON | `i18n.json`, `whitelist.json`, `version_policy.json`, `frozen_bundle_inventory.json`, `mcp/*` |
| `scripts/lib/` | Shared importable modules | `paths.py`, `locale_index_files.py`, `ai/` |
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
| `scripts/sync-mcp-index.py` | `scripts/mcp/sync_index.py` |

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
- **Thumbnail changes**: Whenever adding or changing an implicit `{template}-N.webp` thumbnail or an image path in `templates/index.json`'s `thumbnail` field, run `python scripts/validate/check_duplicate_thumbnails.py --base-ref origin/main`. Install Pillow first if needed (`python -m pip install Pillow`). Use `--audit` to inspect all legacy duplicates.
- **Naming**: snake_case for Python/templates
- Bump root `pyproject.toml` version only when intentionally releasing to PyPI (`release` label). Template-only / archive PRs usually leave the root version unchanged.

### Vue 3 & Astro Standards (site/)
- All Vue components use `<script setup lang="ts">` with Composition API only — no Options API, no mixins
- Cross-component communication via shared composables (`site/src/composables/`) with module-level reactive refs — NEVER use `document.dispatchEvent(new CustomEvent(...))` or event bus patterns between Vue components
- Astro-to-Vue bridge: attach listeners to specific DOM elements by ID in `onMounted()`, not via inline `<script>` tags with `dispatchEvent`
- Props via `defineProps<T>()`, emits via `defineEmits<T>()`, reactivity via `ref()`, `computed()`, `watch()`
