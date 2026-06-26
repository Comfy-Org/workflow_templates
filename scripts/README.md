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
| ComfyUI node compatibility | `npm run validate:comfyui-nodes` |
| Maintainer smoke check | `./scripts/maintenance/check_templates.sh` |

## Directory layout

| Directory | Purpose |
|-----------|---------|
| [`sync/`](sync/) | Data synchronization and generation |
| [`mcp/`](mcp/) | MCP index pipeline (`index.mcp.json`) |
| [`validate/`](validate/) | Validation and analysis (most run in CI) |
| [`comfyui_node_compat/`](comfyui_node_compat/) | ComfyUI node baseline vs template workflows (informational) |
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
| `report-comfyui-node-compat.yml` | `comfyui_node_compat/check.py` (static scan; PR comment only) |
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

Generated output goes to `scripts/.output/` (gitignored) or repo root (`model_analysis_report.md`, `asset_validation_report.md`, `comfyui-node-compat.log`, `comfyui-node-compat.latest.log`).

## ComfyUI node compatibility check

Compares `templates/*.json` workflows against a ComfyUI node baseline. **Informational only** — does not block PR merges. On PRs that change `templates/`, [`report-comfyui-node-compat.yml`](../.github/workflows/report-comfyui-node-compat.yml) posts/updates a comment with findings.

### Local (recommended for full coverage)

Requires a running ComfyUI instance. Reads live `/object_info` (full combo lists, API nodes, inputs):

```bash
npm run validate:comfyui-nodes
# same as:
python3 scripts/comfyui_node_compat/check.py
```

If ComfyUI is not reachable, the script exits with a hint to start the server or use `--static-scan`.

Reports are written to repo root (gitignored):

- `comfyui-node-compat.latest.log` — latest run (overwrite)
- `comfyui-node-compat.log` — append-only history

### CI / static scan (no server, no torch)

Clones `Comfy-Org/ComfyUI` and AST-scans Python sources. Faster and dependency-free, but only reports **deprecated nodes** (skips missing-node / combo noise from incomplete static parsing):

```bash
python3 scripts/comfyui_node_compat/check.py --static-scan --clone-comfyui --no-fail
```

Use an existing checkout instead of cloning:

```bash
export COMFYUI_REPO_PATH=/path/to/ComfyUI
python3 scripts/comfyui_node_compat/check.py --static-scan --no-fail
```

### What it detects

| Issue kind | Severity | Local | Static |
|------------|----------|-------|--------|
| `invalid_api_model` | error | ✅ | — |
| `missing_node` | error | ✅ | — |
| `invalid_combo_value` | error | ✅ | — |
| `missing_input` | error | ✅ | — |
| `deprecated_node` | warning | ✅ | ✅ |

Log and PR reports group findings by priority:

1. **Critical** — API model slug no longer available (`invalid_api_model`)
2. **Errors** — removed nodes, invalid inputs, stale combo values
3. **Warnings** — deprecated nodes and other review items

### Useful flags

| Flag | Purpose |
|------|---------|
| `--static-scan` | Source scan without running ComfyUI |
| `--clone-comfyui` | Shallow-clone ComfyUI master for static scan |
| `--comfyui-dir PATH` | ComfyUI checkout for static scan |
| `--object-info-url URL` | Override live endpoint (default `http://127.0.0.1:8188/object_info`) |
| `--object-info-json PATH` | Debug with a saved `/object_info` JSON |
| `--strict-unknown` | Warn on unknown non-core custom nodes |
| `--no-log-file` | Skip writing log files (CI default) |
| `--no-fail` | Exit 0 even when errors are found |
| `--markdown-output PATH` | Write Markdown report (PR comments) |
| `--json-output PATH` | Write machine-readable JSON report |

### Environment variables

- `COMFYUI_REPO_PATH` — local ComfyUI checkout for `--static-scan`
- `COMFYUI_OBJECT_INFO_URL` — override live `/object_info` URL

See [`.env.example`](../.env.example).

### Layout

| File | Role |
|------|------|
| `comfyui_node_compat/check.py` | CLI entry point |
| `comfyui_node_compat/models.py` | Issue types, priority tiers |
| `comfyui_node_compat/registry.py` | Parse live `/object_info` |
| `comfyui_node_compat/static_registry.py` | AST scan of ComfyUI `.py` sources |
| `comfyui_node_compat/workflow.py` | Scan template JSON + subgraphs |
| `comfyui_node_compat/report.py` | Log/Markdown formatting |
| `comfyui_node_compat/clone.py` | Clone/resolve ComfyUI checkout |

