# MCP pipeline data

| File | Purpose |
|------|---------|
| `models_registry.json` | Model profiles — source of truth for model copy |
| `api_node_model_options.json` | Scanned API node `model` dropdown options |
| `template_cache.json` | Per-template AI `description` + `io`, versioned by workflow JSON `source_hash` |
| `template_cache.example.json` | Cache schema example |

**Template cache:** when `templates/{name}.json` changes, its SHA-256 hash no longer matches `source_hash` → `enhance_descriptions.py` re-runs for that template. Sync only merges cache entries with a matching hash.

See [`../mcp/docs/MCP_AI_ENHANCEMENT.md`](../mcp/docs/MCP_AI_ENHANCEMENT.md).
