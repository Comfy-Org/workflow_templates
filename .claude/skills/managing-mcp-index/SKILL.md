---
name: managing-mcp-index
description: "Builds and maintains templates/index.mcp.json for Comfy Cloud MCP tools. Covers deterministic sync from index.json, AI-generated English descriptions, model registry profiles, template cache, recommend/freshness overrides, and API node scanning. Use when asked to: sync MCP index, index.mcp.json, mcp sync, enhance MCP descriptions, AI template descriptions for MCP, models_registry, template_cache, recommend override, freshness, MCP pipeline, run mcp, mcp:ai, update MCP metadata, regenerate MCP copy, Use Cases MCP descriptions. NOT for site SEO (site/generate-ai) or hub i18n (sync:i18n / managing-translations). Triggers on: mcp index, index.mcp, mcp sync, template cache, models registry, mcp ai, recommend, MCP description."
---

# Managing MCP Index

## What This Is

`templates/index.mcp.json` is a **machine-oriented** template index for Comfy Cloud MCP tools. It is separate from:

| System | File(s) | Purpose |
|--------|---------|---------|
| **MCP index** (this skill) | `index.mcp.json` | English metadata for AI tool routing: `description`, `io`, `capabilities`, `recommend` |
| **Hub manifest** | `index.json` + `index.{locale}.json` | Human UI + 11-language titles/descriptions → skill: `managing-translations` |
| **Site SEO** | `site/` AI pipeline | Long-form page copy → skill: `regenerating-ai-content` |

**MCP descriptions are English only.** There is no MCP translation step. Multi-language hub copy uses `npm run i18n` (`sync_data.py`), not the MCP pipeline.

## Quick Commands (npm)

```bash
npm run mcp          # Step 1: sync index.json → index.mcp.json
npm run mcp:check    # Dry-run sync (no write)
npm run mcp:ai       # Step 2b: AI English descriptions (stale templates only)
npm run mcp:models   # Step 2a: AI model profiles in models_registry.json
npm run mcp:enhance  # Step 2a + Step 2b in the required order
npm run i18n         # Hub translations (NOT MCP — separate system)
```

Prerequisites for AI steps: copy `.env.example` → `.env`, set `AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL`. Optional: `COMFYUI_REPO_PATH` for API node dropdown scanning during `npm run mcp`.

Advanced flags (run Python directly): see `scripts/mcp/docs/MCP_AI_ENHANCEMENT.md`.

## Pipeline Overview

```text
templates/index.json
        │
        ▼  npm run mcp  (sync_index.py)
templates/index.mcp.json  ◄── merge description/io from template_cache (hash match)
        │
        ├── npm run mcp:models  → scripts/data/mcp/models_registry.json
        └── npm run mcp:ai      → scripts/data/mcp/template_cache.json → merge back to index.mcp.json
```

| Step | Script | Writes |
|------|--------|--------|
| 1 Sync | `scripts/mcp/sync_index.py` | `index.mcp.json`, refreshes `api_node_model_options.json` |
| 2a Models | `scripts/mcp/enhance_models_registry.py` | `models_registry.json` |
| 2b Templates | `scripts/mcp/enhance_descriptions.py` | `template_cache.json` + merge → `index.mcp.json` |

Run **2a before 2b** when both are needed. Run **sync before AI** after adding templates to `index.json`.
Sync automatically creates complete pending registry profiles for model names introduced by new
MCP templates. The normal `npm run sync` and release CI run MCP sync before bundle sync.

## Data Files (`scripts/data/mcp/`)

| File | Role |
|------|------|
| `models_registry.json` | Model profiles: `summary`, `strengths`, `capabilities` (AI context for descriptions) |
| `template_cache.json` | Per-template `description` + `io`, versioned by `source_hash` (SHA-256 of `templates/{name}.json`) |
| `template_overrides.json` | Manual `recommend` / `freshness` pins (survives sync) |
| `api_node_model_options.json` | Scanned ComfyUI API node model dropdowns |

**Do not mix layers:** model copy goes in `models_registry.json`, template copy in `template_cache.json`.

## Template Cache Versioning

- Each cache entry has `source_hash` = hash of workflow JSON.
- Hash match → sync merges cached `description` / `io` into `index.mcp.json`.
- Hash mismatch or missing entry → `npm run mcp:ai` targets that template.
- `enhance_descriptions.py` only updates `description`; it preserves existing `io` from cache or MCP entry.

## Fields: Who Owns What

| Field | Set by | Notes |
|-------|--------|-------|
| `name`, `title`, `task`, `model`, `usage` | Sync from `index.json` | |
| `capabilities`, `io` (default) | Sync | `workflow` from tags; `model_options` when single API model node |
| `freshness` | Sync from `date` | Override via `template_overrides.json` |
| `recommend` | Sync from `usage` tiers | Override via `template_overrides.json` |
| `description`, `io` (polished) | `template_cache.json` | AI or manual; hash-gated |
| `description` (AI only) | `enhance_descriptions.py` | English; references `models_registry.json` |

### `recommend` tiers (from `usage`)

| Usage | Label |
|-------|-------|
| ≥ 2500 | `highly_recommended` |
| ≥ 1000 | `top` |
| ≥ 500 | `high` |
| ≥ 200 | `medium` |
| ≥ 50 | `low` |
| < 50 | `not_recommended` |

**Use Cases category floor:** never below `low` (no `not_recommended`).

Manual override example (`template_overrides.json`):

```json
{
  "schema_version": 1,
  "templates": {
    "image_krea2_turbo_t2i": { "recommend": "high" }
  }
}
```

## Common Workflows

### After adding or editing templates in `index.json`

```bash
npm run mcp:check    # preview added/removed
npm run mcp
npm run mcp:ai       # only if --check shows stale templates (or workflow JSON changed)
```

### After editing a workflow JSON (`templates/foo.json`)

Hash changes → run `npm run mcp:ai` for that template (or all stale). Optionally:

```bash
python3 scripts/mcp/enhance_descriptions.py --template foo
```

### Pin recommend / freshness for a template

Edit `scripts/data/mcp/template_overrides.json`, then `npm run mcp`.

### Regenerate all MCP descriptions (expensive)

```bash
python3 scripts/mcp/enhance_descriptions.py --all
```

### One-time: seed cache from existing MCP copy

```bash
python3 scripts/mcp/import_template_cache.py
```

## Sync Exclusions

- **Categories skipped:** Node Basics, LLM, Getting Started
- **Local-only templates:** `includeOnDistributions: ["local"]` only — not in MCP index
- **Multi API model nodes:** `model_options` omitted (logged to `scripts/.output/sync_index.log`)

## What NOT To Do

- Do not put model profiles in `template_cache.json`.
- Do not expect `npm run i18n` to update `index.mcp.json`.
- Do not hand-edit `index.mcp.json` `description` without updating `template_cache.json` — next sync overwrites unless cache hash matches.
- Do not run `enhance_descriptions.py` before `enhance_models_registry.py` when model context is missing for new models.

## After Changes

1. `npm run mcp` — refresh structured fields and merge cache.
2. `npm run mcp:ai` / `npm run mcp:models` — if AI copy needed.
3. Commit `index.mcp.json` and relevant `scripts/data/mcp/*.json` files.
4. Bump `pyproject.toml` version if template assets changed (repo convention).

## Reference Docs

- Full spec: `scripts/mcp/docs/MCP_AI_ENHANCEMENT.md`
- Script layout: `scripts/mcp/README.md`
- Data files: `scripts/data/mcp/README.md`
