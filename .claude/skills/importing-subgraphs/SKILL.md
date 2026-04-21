---
name: importing-subgraphs
description: "Imports and registers subgraph blueprints into the ComfyUI workflow_templates repository. Handles placing blueprint JSON files, adding thumbnails, running the import/sync pipeline, and validating results. Use when asked to: import a subgraph, add a blueprint, register a blueprint, add a subgraph blueprint, import a subgraph blueprint, contribute a subgraph, add a new node component, publish a blueprint, upload a subgraph, create a blueprint, onboard a subgraph, add a reusable node. Triggers on: import subgraph, add blueprint, subgraph blueprint, new blueprint, register blueprint, blueprint import."
---

# Importing Subgraph Blueprints

Subgraph blueprints are pre-built ComfyUI node components stored in `blueprints/` and shipped via the `comfyui-subgraph-blueprints` package.

## Rules

- **Never** modify scripts, build tooling, or CI configuration.
- **Always** validate after changes (Step 4).
- Blueprint filenames **must** be `snake_case` — the import script handles renaming automatically.
- Use double-quotes `"` in all JSON files.
- Blueprint JSON **must** contain a `definitions.subgraphs` array with at least one entry.

---

## Step 1 — Obtain the Blueprint JSON

Two sources:

**Option A — Import from an external directory:**
```bash
python scripts/import_blueprints.py --source /path/to/external/blueprints/
```
The script copies all `*.json` files (skipping `index*.json`) into `blueprints/`, renames them to `snake_case`, regenerates `blueprints/index.json`, and updates `blueprints_bundles.json`.

**Option B — Manual placement (single file):**
1. Export the subgraph from ComfyUI (Save → Export workflow JSON).
2. Copy the `.json` file to `blueprints/` with a `snake_case` name, e.g. `my_blueprint.json`.
3. Run the import script (no `--source` needed) to normalize and regenerate index + bundles:
   ```bash
   python scripts/import_blueprints.py
   ```

### Required blueprint JSON structure

The file must contain `definitions.subgraphs[0]` with these fields:

| Field | Required |
|-------|----------|
| `name` | yes — display name shown in the node palette |
| `inputs` | yes — exposed input slots |
| `outputs` | yes — exposed output slots |
| `nodes` | yes — internal ComfyUI nodes |

---

## Step 2 — Add a Thumbnail (Optional)

Thumbnail files live in `blueprints/` and follow the naming pattern:

```
{blueprint_name}-1.webp     # primary (required for thumbnail display)
{blueprint_name}-2.webp     # secondary (optional, for compare/hover effects)
```

- Convert to **webp** format (lossy ~65% quality).
- The import script sets `"mediaSubtype": "webp"` in `index.json` automatically.

---

## Step 3 — Embed Model Metadata (Recommended)

For every model-loading node inside `definitions.subgraphs[0].nodes` (e.g. `UNETLoader`, `VAELoader`, `CLIPLoader`), add a `"models"` array to the node's `"properties"`:

```json
"properties": {
  "Node name for S&R": "UNETLoader",
  "cnr_id": "comfy-core",
  "ver": "0.3.40",
  "models": [
    {
      "name": "flux1-dev.safetensors",
      "url": "https://huggingface.co/.../resolve/main/flux1-dev.safetensors?download=true",
      "hash": "<sha256>",
      "hash_type": "SHA256",
      "directory": "diffusion_models"
    }
  ]
}
```

The `name` field **must exactly match** the corresponding `widgets_values` entry. The import script surfaces model names automatically in `index.json` (limited to first 5).

---

## Step 4 — Sync to Packages

After `import_blueprints.py` succeeds, push assets into the package directory and regenerate the manifest:

```bash
python scripts/sync_blueprints.py
```

This writes `packages/core/src/comfyui_workflow_templates_core/blueprints_manifest.json` and copies all blueprint files into `packages/blueprints/src/comfyui_subgraph_blueprints/blueprints/`.

---

## Step 5 — Validate

```bash
python scripts/validate_blueprints.py
```

Checks:
- JSON syntax for all blueprint files
- `index.json` against `index.schema.json`
- Blueprint structure (`definitions.subgraphs` present with required fields)
- `blueprints_bundles.json` consistency with files on disk

Fix all errors before continuing. CI will fail if bundles or manifests are out of sync.

---

## Step 6 — Bump Version

Increment the `version` field in the root `pyproject.toml`. CI uses this to detect changes and publishes affected packages to PyPI.

---

## Common Requests

| User says | Agent action |
|-----------|--------------|
| "Import blueprints from this folder" | Step 1 Option A, then Steps 4–6 |
| "Add this subgraph JSON as a blueprint" | Step 1 Option B, then Steps 4–6 |
| "Add a thumbnail for blueprint X" | Step 2 only, then re-run Step 4 |
| "Embed model info into this blueprint" | Step 3 only, then re-run Steps 1, 4, 5 |
| "Validate blueprints" | Step 5 only |
| "Sync blueprints to packages" | Step 4 only |
| "Why does the index not have my blueprint?" | Check filename is snake_case, re-run `import_blueprints.py` |

---

## File Quick-Reference

| File / Dir | Purpose |
|------------|---------|
| `blueprints/` | Blueprint JSON files and thumbnail images |
| `blueprints/index.json` | Generated metadata index (do not edit manually) |
| `blueprints/index.schema.json` | JSON schema for index validation |
| `blueprints_bundles.json` | Generated list of all blueprint IDs |
| `scripts/import_blueprints.py` | Normalize filenames, generate index.json and bundles |
| `scripts/sync_blueprints.py` | Generate manifest, copy assets to package directories |
| `scripts/validate_blueprints.py` | Validate all blueprints and consistency checks |
| `pyproject.toml` | Root package version (bump before PR) |
| `packages/blueprints/` | `comfyui-subgraph-blueprints` package (generated assets) |
| `packages/core/.../blueprints_manifest.json` | Generated manifest consumed by the Python API |
