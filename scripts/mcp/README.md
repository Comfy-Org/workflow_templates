# MCP index pipeline

Scripts and libraries for building and enhancing `templates/index.mcp.json`.

Full workflow guide: [`docs/MCP_AI_ENHANCEMENT.md`](docs/MCP_AI_ENHANCEMENT.md).

## Layout

```
scripts/mcp/
  sync_index.py              # Step 1: index.json → index.mcp.json
  enhance_models_registry.py # Step 2a: AI model profiles → cache
  enhance_descriptions.py    # Step 2b: AI template descriptions → cache
  import_template_cache.py   # Seed cache from index.mcp.json + hashes
  apply_template_cache.py      # Merge cache into index.mcp.json
  scan_api_nodes.py          # Scan ComfyUI comfy_api_nodes for model dropdowns
  lib/                       # MCP-specific parsing helpers
  docs/

scripts/lib/ai/              # Shared OpenAI-compatible client (reusable outside MCP)
  config.py                  # .env (AI_API_KEY, AI_BASE_URL, AI_MODEL)
  client.py                  # chat_completion()
```

MCP data files live in [`../data/mcp/`](../data/mcp/) — see [`../data/mcp/README.md`](../data/mcp/README.md).

Manual `recommend` / `freshness` pins: [`../data/mcp/template_overrides.json`](../data/mcp/template_overrides.json) (see example file).

## Quick start

```bash
cp .env.example .env
# Set AI_API_KEY, AI_BASE_URL, AI_MODEL in .env

npm run mcp:check
npm run mcp
npm run mcp:models    # optional: model profiles first
npm run mcp:ai        # stale templates only
```

Or via Python: `python3 scripts/mcp/sync_index.py`, etc. Full guide: [`docs/MCP_AI_ENHANCEMENT.md`](docs/MCP_AI_ENHANCEMENT.md).

Agent skill: [`.claude/skills/managing-mcp-index/SKILL.md`](../../.claude/skills/managing-mcp-index/SKILL.md).

## Environment

| Variable | Purpose |
|----------|---------|
| `COMFYUI_REPO_PATH` | Local ComfyUI checkout (`scan_api_nodes.py`) |
| `AI_API_KEY` | API key for Step 2 and other `scripts/lib/ai` callers |
| `AI_BASE_URL` | OpenAI-compatible API root URL |
| `AI_MODEL` | LLM model id (e.g. `gpt-4o`) |

Model id lives in `.env` only — no separate config file.

## Reusing the AI library

From any script under `scripts/`:

```python
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "lib"))

from ai import chat_completion, load_ai_settings

settings = load_ai_settings()
text = chat_completion(settings, system="...", user="...")
```
