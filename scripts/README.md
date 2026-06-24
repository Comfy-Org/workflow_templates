# Scripts Index

Python maintenance scripts for ComfyUI workflow templates (packages, CI, i18n).

## Quick commands

| Task | Command |
|------|---------|
| Full local sync (i18n + bundles + validation) | `python scripts/sync/sync_data.py --templates-dir templates` |
| Sync bundles only | `python scripts/sync/sync_bundles.py` |
| Sync blueprints | `python scripts/sync/sync_blueprints.py` |
| Validate templates | `python scripts/validate/validate_templates.py` |
| Validate manifests | `python scripts/validate/validate_manifests.py` |
| Maintainer smoke check | `./scripts/maintenance/check_templates.sh` |

## Directory layout

| Directory | Purpose |
|-----------|---------|
| [`sync/`](sync/) | Data synchronization and generation |
| [`mcp/`](mcp/) | MCP index pipeline (`index.mcp.json`) |
| [`validate/`](validate/) | Validation and analysis (most run in CI) |
| [`blueprints/`](blueprints/) | Subgraph blueprint import |
| [`ci/`](ci/) | Release pipeline helpers (version, PyPI quota) |
| [`maintenance/`](maintenance/) | Local-only tools (archive, one-off fixes) |
| [`data/`](data/) | Config files (`i18n.json`, `whitelist.json`) |
| [`lib/`](lib/) | Shared modules (`locale_index_files.py`, `paths.py`) |
| [`docs/`](docs/) | Script-specific documentation |

## `sync_data.py` pipeline

When you run `scripts/sync/sync_data.py`, it orchestrates:

1. Sync English fields to `data/i18n.json`
2. Propagate translations to locale index files
3. Collect translations back to `i18n.json`
4. Sync bundles (`sync_bundles.py`)
5. Validate input assets (`check_input_assets.py`)
6. Analyze model references (`analyze_models.py`)
7. Spellcheck
8. Validate templates (`validate_templates.py`)

Also runs workflow I/O extraction via `generate_workflow_io.py` before locale sync.

## CI mapping

| Workflow | Scripts |
|----------|---------|
| `validate-templates.yml` | `validate/validate_templates.py`, `validate/validate_thumbnails.py`, `lib/locale_index_files.py` |
| `validate-manifests.yml` | `sync/sync_bundles.py`, `sync/sync_blueprints.py`, `validate/validate_manifests.py`, `validate/list_pip_excluded.py` |
| `validate-blueprints.yml` | `validate/validate_blueprints.py`, `blueprints/import_blueprints.py`, `sync/sync_blueprints.py` |
| `link-checker.yml` | `validate/check_links.py`, `data/whitelist.json` |
| `model-analysis.yml` | `validate/analyze_models.py`, `data/whitelist.json` |
| `check_input_assets.yml`, `generate-upload-json.yml` | `validate/check_input_assets.py` |
| `sync-custom-nodes.yml` | `sync/sync_custom_nodes.py` |
| `version-check.yml`, `publish.yml` | `ci/ci_version_manager.py`, `sync/sync_bundles.py`, `ci/*` |
| `build-test.yml` | `sync/sync_bundles.py` |

## Maintenance tools (not in CI)

| Script | Purpose |
|--------|---------|
| `maintenance/archive_templates.py` | Archive or restore templates (sole restore entry; sets `status: archived` / `active`) |
| `maintenance/fix_subgraph_bypass_modes.py` | Fix subgraph bypass modes in workflow JSONs |
| `maintenance/update_index_with_sizes.py` | Fetch HuggingFace model sizes into `index.json` |
| `maintenance/report_bundle_sizes.py` | Print bundle disk usage report |
| `maintenance/sync_registry_from_krea.py` | **One-off** — seed `models_registry.json` from Krea snapshots (temporary; remove with `krea_*` data files when done) |

MCP index pipeline (separate folder): see [`mcp/README.md`](mcp/README.md). Agent skill: [`.claude/skills/managing-mcp-index/SKILL.md`](../.claude/skills/managing-mcp-index/SKILL.md).

```bash
npm run mcp          # sync index.mcp.json
npm run mcp:check    # dry-run
npm run mcp:ai       # AI template descriptions (stale)
npm run mcp:models   # AI model registry
```

## Configuration files

- **`data/i18n.json`** — Translation strings and pending-translation tracking. See [`docs/I18N_GUIDE.md`](../docs/I18N_GUIDE.md).
- **`data/whitelist.json`** — URL skip list, model-check ignores, custom-node allowlist. See [`docs/whitelist.md`](docs/whitelist.md).
- **`data/mcp/api_node_model_options.json`** — Generated cache of API node `model` dropdown options (from ComfyUI source).
- **`data/mcp/models_registry.json`** — Model profiles (summary, strengths, capabilities) for AI description generation.
- **`data/mcp/template_cache.json`** — Per-template AI copy, versioned by workflow JSON hash.
- **`data/krea_registry_aliases.json`**, **`data/krea_*_models.json`** — Temporary Krea snapshots for one-off registry seeding (delete when seeding is complete).

Generated output goes to `scripts/.output/` (gitignored) or repo root (`model_analysis_report.md`, `asset_validation_report.md`).
