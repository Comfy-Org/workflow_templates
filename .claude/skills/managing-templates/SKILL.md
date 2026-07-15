---
name: managing-templates
description: "Manages ComfyUI workflow templates end-to-end: add new templates and rename existing ones (files, index metadata, bundles, i18n, package sync). Use when asked to: add a template, create a new template, submit a workflow, rename a template, retitle a template slug, change a template name, rename workflow template, onboard a template, register a template, ship a template. Triggers on: add template, new template, new workflow, rename template, rename workflow, change template name, template rename."
---

# Managing Templates

Covers **adding** new templates and **renaming** existing ones in this repository.

Related skills (do not replace this one):
- `/managing-bundles` — move between bundles / categories / order
- `/managing-thumbnails` — thumbnail-only work
- `/managing-translations` — broader i18n work
- `/managing-mcp-index` — MCP index only

## Shared Rules

- **Never** modify scripts, build tooling, or CI configuration.
- Template names **must** be `snake_case` — no spaces, dots, or special characters.
- `name` must match the workflow JSON filename (without `.json`).
- **Always** run `python3 scripts/sync/sync_bundles.py` after editing `bundles.json` or renaming template assets.
- **Always** validate after structural changes (see Validation below).
- For **new** templates, assign media to `media-assets-01` — see [`scripts/docs/frozen_bundles.md`](../../../scripts/docs/frozen_bundles.md).
- Bump root `pyproject.toml` only for intentional PyPI releases (`release` label).
- Use double-quotes `"` in all JSON files.
- Model download URLs must produce filenames that **exactly** match `widgets_values` in the workflow JSON.
- Package copies under `packages/*/src/**/templates/` are gitignored; regenerate via `sync_bundles.py`, do not hand-edit.

## Decide the operation

| User intent | Go to |
|-------------|--------|
| Add / create / register a new template | [Adding a Workflow Template](#adding-a-workflow-template) |
| Rename / change template slug / `old_name` → `new_name` | [Renaming a Template](#renaming-a-template) |

---

## Adding a Workflow Template

### Step 1 — Obtain the Workflow JSON

- Export from ComfyUI via **Save → Export**.
- Prefer ComfyUI started with `--disable-all-custom-nodes`.
- Embedded workflow in image/video: <https://comfyui-embedded-workflow-editor.vercel.app/>.

Place `your_template_name.json` in `templates/`.

### Step 2 — Thumbnails

In `templates/`:

```
{template_name}-1.webp          # required
{template_name}-2.webp          # optional — compareSlider / hoverDissolve
```

| Variant | Files needed |
|---------|--------------|
| *(default)* / `video` / `audio` / `zoomHover` | `-1` only |
| `compareSlider` / `hoverDissolve` | `-1` and `-2` |

Prepare as webp (lossy ~65%), reasonable resolution; animated webp for video thumbs before resize.

### Step 3 — Entry in `templates/index.json`

Add the object to the right category's `templates` array.

**Required:** `name`, `description`, `mediaType` (`image` \| `video` \| `audio` \| `3d`), `mediaSubtype` (usually `webp`).

**Common optional:** `title`, `tags`, `models`, `logos`, `date`, `openSource`, `requiresCustomNodes`, `thumbnailVariant`, `tutorialUrl`, `usage`, `size`, `vram`, `searchRank`, `io`, `thumbnail`.

```json
{
  "name": "text_to_video_wan",
  "description": "Generate videos from text descriptions.",
  "mediaType": "image",
  "mediaSubtype": "webp",
  "tutorialUrl": "https://comfyanonymous.github.io/ComfyUI_examples/wan/"
}
```

### Step 4 — Bundle

Add the name to the correct array in `bundles.json`. New media → `media-assets-01`.

```bash
python3 scripts/sync/sync_bundles.py
```

### Step 5 — Embed Model Metadata

For every model-loading node (`UNETLoader`, `VAELoader`, `CLIPLoader`, etc.), add `properties.models[]`:

| Field | Required | Notes |
|-------|----------|--------|
| `name` | yes | Must match `widgets_values` |
| `url` | yes | Direct download URL |
| `hash` | yes | SHA-256 |
| `hash_type` | yes | `"SHA256"` |
| `directory` | yes | e.g. `diffusion_models`, `vae`, `text_encoders` |

### Step 6 — Node Versions (Optional)

```json
"properties": {
  "Node name for S&R": "SaveWEBM",
  "cnr_id": "comfy-core",
  "ver": "0.3.26"
}
```

### Step 7 — Sync and Validation

```bash
python3 scripts/sync/sync_bundles.py
python3 scripts/validate/validate_templates.py
python3 scripts/validate/validate_thumbnails.py
```

### Step 8 — i18n

`sync_data.py` does **not** invent translations. It only **applies** `title` / `description` strings that already exist in `scripts/data/i18n.json` into `templates/index.{locale}.json`. Technical fields are copied from English `index.json`; tags use mappings also stored in `i18n.json`.

1. **Maintain translations in `scripts/data/i18n.json`** under `templates.{name}` (add or update locale strings). Until a locale string differs from English, that language stays pending / English fallback.

```json
{
  "templates": {
    "your_template_name": {
      "title": {
        "en": "Your Template Title",
        "zh": "您的模板标题",
        "ja": "テンプレートのタイトル"
      },
      "description": {
        "en": "Your template description",
        "zh": "您的模板描述",
        "ja": "テンプレートの説明"
      }
    }
  }
}
```

2. **Then** run sync so locale index files pick up the new/updated strings:

```bash
python3 scripts/sync/sync_data.py --templates-dir templates
```

Order matters: edit `i18n.json` first, then sync. Re-run sync after any later translation edits. For coverage checks and broader i18n work, use `/managing-translations`.

### Step 9 — Version (release PRs only)

See [`scripts/docs/frozen_bundles.md`](../../../scripts/docs/frozen_bundles.md).

---

## Renaming a Template

Rename the template **slug** (`name` / filenames), not just the display `title`.

Example: `audio_sync_so_lip_sync_video` → `api_sync_so_lip_sync_video`.

### Step 1 — Discover every reference

```bash
rg -l --glob '!**/node_modules/**' --glob '!**/.git/**' 'OLD_NAME'
# also list assets
ls templates/OLD_NAME* thumbnail/OLD_NAME* output/OLD_NAME* 2>/dev/null
```

Typical touch points:

| Location | What changes |
|----------|----------------|
| `templates/{name}.json` | rename file |
| `templates/{name}-1.webp` (and `-2.webp` if any) | rename file |
| `thumbnail/{name}_thumbnail.*` | rename if present |
| `output/{name}.*` | rename if present |
| `templates/index.json` | `name`, `io.outputs[].file`, `thumbnail[]` paths |
| `templates/index.*.json` | same string refs as English index |
| `bundles.json` | bundle membership string |
| `scripts/data/i18n.json` | translation keys keyed by template name |
| `templates/index.mcp.json` | if the template is already in MCP index |
| `site/overrides/templates/{name}.json` | rename override file + internal name if present |
| `packages/core/.../manifest.json` | regenerated by sync (do not hand-edit) |

Do **not** bulk-replace inside unrelated binary files. Prefer an explicit file list over a repo-wide `rg \| perl` loop (large trees can hang).

### Step 2 — Rename assets with `git mv`

```bash
git mv templates/OLD_NAME.json templates/NEW_NAME.json
git mv templates/OLD_NAME-1.webp templates/NEW_NAME-1.webp
# if present:
git mv templates/OLD_NAME-2.webp templates/NEW_NAME-2.webp
git mv thumbnail/OLD_NAME_thumbnail.mp4 thumbnail/NEW_NAME_thumbnail.mp4
git mv output/OLD_NAME.mp4 output/NEW_NAME.mp4
```

Adjust extensions to match what exists (`.webp`, `.mp4`, etc.).

### Step 3 — Update text references

Replace `OLD_NAME` → `NEW_NAME` in every text/JSON file from Step 1, especially:

- `"name": "OLD_NAME"`
- `bundles.json` entry
- `io.outputs[].file` (e.g. `OLD_NAME.mp4`)
- `thumbnail: ["thumbnail/OLD_NAME_..."]`
- i18n object keys

Use a targeted replace on the known file list (not a whole-repo scan that touches binaries).

### Step 4 — Sync packages

```bash
python3 scripts/sync/sync_bundles.py
```

Confirms `manifest.json` ids/filenames point at `NEW_NAME`, and regenerates gitignored package template copies.

### Step 5 — i18n / MCP if needed

- Rename the template key inside `scripts/data/i18n.json` (`templates.OLD_NAME` → `templates.NEW_NAME`, and any pending-tracking entries). Sync will not move those keys for you.
- After the i18n key rename (and any translation string updates), run:
  ```bash
  python3 scripts/sync/sync_data.py --templates-dir templates
  ```
- If locale files still contain `OLD_NAME` in `name` / media paths, finish those replaces before or after sync as needed.
- If the template exists in `templates/index.mcp.json`, update it (or follow `/managing-mcp-index`).

### Step 6 — Verify

```bash
rg -l --glob '!**/node_modules/**' --glob '!**/.git/**' 'OLD_NAME' || echo '(none)'
ls templates/NEW_NAME.json templates/NEW_NAME-1.webp
python3 scripts/validate/validate_templates.py
python3 scripts/validate/validate_thumbnails.py
```

No remaining `OLD_NAME` refs should remain (except unrelated historical docs). Bundle membership stays the same unless the user also asks to move bundles (`/managing-bundles`).

### Rename caveats

- Renaming the slug is a breaking change for anything that pins the old template id (Comfy Cloud, docs links, MCP callers). Mention that if relevant.
- Do not bump `pyproject.toml` for a rename-only PR unless it is an intentional release.
- Display-only title/description edits are **not** a rename; edit `index.json` / i18n only.

---

## Validation (shared)

```bash
python3 scripts/sync/sync_bundles.py
python3 scripts/validate/validate_templates.py
python3 scripts/validate/validate_thumbnails.py
```

---

## Common User Requests

| User says | Agent action |
|-----------|--------------|
| "Add this workflow as a template" | Adding Steps 1–9 |
| "I have a JSON file, make it a template" | Adding from Step 1 |
| "Rename X to Y" / "把 X 重命名成 Y" | Renaming Steps 1–6 |
| "Change the template name / slug" | Renaming (not title-only) |
| "Add a thumbnail for template X" | Prefer `/managing-thumbnails` |
| "What bundle?" | New media → `media-assets-01`; legacy `media-*` frozen |
| "Validate my template" | Validation section |
| "Sync translations" / "加翻译" | Edit `scripts/data/i18n.json` first, then Adding Step 8 / `/managing-translations` |

---

## File Quick-Reference

| File / Dir | Purpose |
|------------|---------|
| `templates/` | Workflow JSON + thumbnails |
| `templates/index.json` | Master English manifest |
| `templates/index.{locale}.json` | Locale manifests |
| `thumbnail/`, `output/` | Optional preview/output media naming `{name}_…` |
| `bundles.json` | Template → bundle |
| `scripts/data/i18n.json` | Source of truth for title/description (and tag) translations; edit here before sync |
| `scripts/sync/sync_bundles.py` | Manifest + copy assets into packages |
| `scripts/sync/sync_data.py` | Apply `i18n.json` translations into locale indexes (does not invent translations) |
| `scripts/validate/validate_templates.py` | Template JSON validation |
| `scripts/validate/validate_thumbnails.py` | Thumbnail validation |
| `scripts/docs/frozen_bundles.md` | Frozen legacy bundle policy |
