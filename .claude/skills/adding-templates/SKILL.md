---
name: adding-templates
description: "Adds new workflow templates to the ComfyUI template repository. Guides through creating workflow JSON, thumbnails, index.json entry, bundle assignment, model embedding, and i18n sync. Use when asked to: add a template, create a new template, submit a workflow, new workflow template, add a workflow, contribute a template, import a workflow, set up a new template, register a template, onboard a template, include a new workflow, publish a template, ship a template, upload a workflow, or make a new template available. Triggers on: add template, new template, new workflow, import workflow, contribute workflow, submit template, create template."
---

# Adding a Workflow Template

This skill walks through every step needed to add a new workflow template to the
ComfyUI workflow_templates repository.

## Rules

- **Never** modify scripts, build tooling, or CI configuration.
- **Always** validate after changes (see Step 7).
- Template file names **must** be `snake_case` — no spaces, dots, or special characters.
- **Always** run `python scripts/sync_bundles.py` after editing `bundles.json`.
- **Always** run `python scripts/sync_data.py --templates-dir templates` after editing `templates/index.json`.
- Bump the version in the root `pyproject.toml` before finalising.
- Use double-quotes `"` in all JSON files (never single-quotes).
- Ensure model download URLs produce filenames that **exactly** match the `widgets_values` entries in the workflow JSON.

---

## Step 1 — Obtain the Workflow JSON

The user provides (or the agent locates) a `.json` workflow file.

- The workflow must be exported from ComfyUI via **Save → Export**.
- Ideally, ComfyUI was started with `--disable-all-custom-nodes` when creating the file so custom extensions don't inject extra metadata.
- To extract a workflow embedded in an image or video, use <https://comfyui-embedded-workflow-editor.vercel.app/>.

**Naming:** choose a `snake_case` name with no spaces, dots, or special characters.

```
your_template_name.json
```

Place the file in `templates/`.

---

## Step 2 — Obtain and Prepare Thumbnails

Thumbnail files live in `templates/` and must be named:

```
{template_name}-1.webp          # required — primary thumbnail
{template_name}-2.webp          # optional — needed for compareSlider / hoverDissolve
```

### Thumbnail variant types

| Variant | Description | Files needed |
|---------|-------------|--------------|
| *(none / default)* | Static image, no effect | `-1` only |
| `video` | Animated webp video | `-1` only |
| `audio` | Audio playback controls | `-1` only |
| `compareSlider` | Before / after slider | `-1` and `-2` |
| `hoverDissolve` | Dissolves to 2nd image on hover | `-1` and `-2` |
| `zoomHover` | Zooms on hover | `-1` only |

### Preparation checklist

1. Convert to **webp** format (lossy ~65% quality is fine).
2. Resize to a reasonable resolution — thumbnails never fill the full screen.
3. Compress further if the file is large. [EzGif](https://ezgif.com/png-to-webp) works.
4. For video thumbnails, convert to animated webp **before** resizing.

---

## Step 3 — Add Entry to `templates/index.json`

Open `templates/index.json` and add the template object inside the appropriate
category's `templates` array. If no category fits, create a new category object.

### Required fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Must match the JSON filename (without `.json`) |
| `description` | string | Short human-readable description |
| `mediaType` | string | `"image"`, `"video"`, `"audio"`, or `"3d"` |
| `mediaSubtype` | string | File extension of the thumbnail, usually `"webp"` |

### Optional fields

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Display title (defaults to `name` if omitted) |
| `tags` | string[] | Searchable tags |
| `models` | string[] | Model display names |
| `logos` | object[] | Provider logos, e.g. `[{"provider": "Google"}]` |
| `date` | string | ISO date (`YYYY-MM-DD`) |
| `openSource` | boolean | Whether the models are open-source |
| `requiresCustomNodes` | string[] | Custom node package IDs |
| `thumbnailVariant` | string | See variant table above |
| `tutorialUrl` | string | Link to docs / tutorial |
| `usage` | number | Usage count (set `0` for new) |
| `size` | number | Model size in bytes (`0` if unknown) |
| `vram` | number | VRAM requirement in bytes (`0` if unknown) |
| `searchRank` | number | Manual ranking boost (`0` default) |

### Example entry

```json
{
  "name": "text_to_video_wan",
  "description": "Generate videos from text descriptions.",
  "mediaType": "image",
  "mediaSubtype": "webp",
  "tutorialUrl": "https://comfyanonymous.github.io/ComfyUI_examples/wan/"
}
```

---

## Step 4 — Assign to a Bundle in `bundles.json`

Open `bundles.json` and add the template name string to the correct bundle array:

| Bundle | When to use |
|--------|-------------|
| `media-image` | Image generation / editing workflows |
| `media-video` | Video generation workflows |
| `media-api` | Workflows that call external APIs |
| `media-other` | Audio, 3D, utilities, everything else |

Then sync:

```bash
python scripts/sync_bundles.py
```

---

## Step 5 — Embed Model Metadata

For **every** model-loading node in the workflow JSON (e.g. `UNETLoader`,
`VAELoader`, `CLIPLoader`), add a `"models"` array inside the node's
`"properties"` object.

Each model entry has these fields:

| Field | Required | Description |
|-------|----------|-------------|
| `name` | yes | Filename including extension — **must match `widgets_values`** |
| `url` | yes | Direct download URL (usually HuggingFace `?download=true`) |
| `hash` | yes | SHA-256 hash of the file |
| `hash_type` | yes | `"SHA256"` |
| `directory` | yes | Target subfolder, e.g. `"diffusion_models"`, `"vae"`, `"text_encoders"` |

### Example

```json
"properties": {
  "Node name for S&R": "VAELoader",
  "models": [
    {
      "name": "wan_2.1_vae.safetensors",
      "url": "https://huggingface.co/Comfy-Org/Wan_2.1_ComfyUI_repackaged/resolve/main/split_files/vae/wan_2.1_vae.safetensors?download=true",
      "hash": "2fc39d31359a4b0a64f55876d8ff7fa8d780956ae2cb13463b0223e15148976b",
      "hash_type": "SHA256",
      "directory": "vae"
    }
  ]
}
```

You can find model hashes on HuggingFace file pages or compute them locally.

---

## Step 6 — Embed Node Versions (Optional)

For nodes that require a specific ComfyUI or custom-node version, add `cnr_id`
and `ver` to the node's `"properties"`:

```json
"properties": {
  "Node name for S&R": "SaveWEBM",
  "cnr_id": "comfy-core",
  "ver": "0.3.26"
}
```

---

## Step 7 — Run Sync and Validation

```bash
python scripts/sync_bundles.py
python scripts/validate_templates.py
python scripts/validate_thumbnails.py
```

Fix any errors before continuing. CI will fail if bundles/manifests are out of
sync.

---

## Step 8 — Sync Translations (i18n)

```bash
python scripts/sync_data.py --templates-dir templates
```

This propagates the new template to all locale index files (`index.zh.json`,
`index.ja.json`, etc.) and updates `scripts/i18n.json` for translation tracking.

Optionally, add translations directly in `scripts/i18n.json`:

```json
{
  "templates": {
    "your_template_name": {
      "title": {
        "en": "Your Template Title",
        "zh": "您的模板标题"
      },
      "description": {
        "en": "Your template description",
        "zh": "您的模板描述"
      }
    }
  }
}
```

Then re-run `python scripts/sync_data.py --templates-dir templates` to apply.

---

## Step 9 — Bump Version

Increment the `version` field in the root `pyproject.toml`. CI uses this to
detect which subpackages changed and publishes only affected packages to PyPI.

---

## Common User Requests

| User says | Agent action |
|-----------|--------------|
| "Add this workflow as a template" | Steps 1–9 above |
| "I have a JSON file, make it a template" | Start at Step 1 with the provided file |
| "Add a thumbnail for template X" | Step 2 only — add/replace thumbnail, validate |
| "Register my template in the index" | Steps 3–4, then validate and sync |
| "Embed models into this workflow" | Step 5 only |
| "What bundle does this template go in?" | Inspect `mediaType` / tags; advise `media-image`, `media-video`, `media-api`, or `media-other` |
| "Validate my template" | Step 7 only |
| "Sync translations" | Step 8 only |
| "Bump the version" | Step 9 only |
| "Create a new category" | Add a new category object in `templates/index.json`, then Steps 4, 7, 8 |

---

## File Quick-Reference

| File / Dir | Purpose |
|------------|---------|
| `templates/` | Workflow JSON files and thumbnail images |
| `templates/index.json` | Master template manifest (English) |
| `bundles.json` | Maps template names → media-type bundles |
| `pyproject.toml` | Root package version (bump before PR) |
| `scripts/sync_bundles.py` | Regenerate manifest + copy assets to packages |
| `scripts/validate_templates.py` | Validate template JSON structure |
| `scripts/validate_thumbnails.py` | Validate thumbnail files |
| `scripts/sync_data.py` | Sync translations to all locale index files |
| `scripts/i18n.json` | Translation strings for template titles/descriptions |
