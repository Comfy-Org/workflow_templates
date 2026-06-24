# MCP pipeline data

| File | Purpose |
|------|---------|
| `models_registry.json` | Model profiles — source of truth for model copy |
| `api_node_model_options.json` | Scanned API node `model` dropdown options |
| `template_cache.json` | Per-template AI `description` + `io`, versioned by workflow JSON `source_hash` |
| `template_cache.example.json` | Cache schema example |
| `template_overrides.json` | Manual `recommend` / `freshness` overrides (survives sync) |
| `template_overrides.example.json` | Overrides schema example |

**Template cache:** when `templates/{name}.json` changes, its SHA-256 hash no longer matches `source_hash` → `enhance_descriptions.py` re-runs for that template. Sync only merges cache entries with a matching hash.

**Template overrides:** edit `template_overrides.json` to pin `recommend` or `freshness` for specific templates. Use Cases category never syncs below `low` (no `not_recommended`).

See [`../mcp/docs/MCP_AI_ENHANCEMENT.md`](../mcp/docs/MCP_AI_ENHANCEMENT.md).
