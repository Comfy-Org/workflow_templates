---
name: managing-bundles
description: "Manages template bundles, categories, and ordering in the ComfyUI template repository. Moves templates between bundles, reorders templates, creates or renames categories. Use when asked to: move a template, change category, reorder templates, organize templates, rearrange templates, group templates, categorize, recategorize, change bundle, switch bundle, sort templates, change template order, reorganize, restructure categories, rename category, create category, update category, curate templates, manage collections. Triggers on: move template, change category, reorder, organize templates, bundle management, template order, category management."
---

# Managing Bundles & Categories

This skill covers managing template bundles, display categories, and ordering in the ComfyUI workflow template repository.

## Two Systems to Understand

### 1. `bundles.json` — Distribution Packaging

Controls which Python distribution package ships each template. Located at the repo root.

**Structure:** A JSON object with four keys:

- `media-api`
- `media-image`
- `media-video`
- `media-other`

Each key maps to an array of template name strings. Every template must appear in exactly one bundle. This determines which `comfyui_workflow_templates_media_*` Python package includes the template — it does **not** affect display order or categorization in the UI.

### 2. `templates/index.json` — Display Categories & Order

Controls how templates appear in the ComfyUI template picker UI. Located at `templates/index.json`.

**Structure:** A JSON array of category objects. Each category object has:

| Field         | Type     | Description                                          |
|---------------|----------|------------------------------------------------------|
| `moduleName`  | string   | Always `"default"`                                   |
| `category`    | string   | Category group label (e.g., `"GENERATION TYPE"`)     |
| `icon`        | string   | Icon class for display                               |
| `title`       | string   | Display title (e.g., `"Use Cases"`, `"Video"`)       |
| `type`        | string   | Media type filter                                    |
| `isEssential` | boolean  | Marks important/promoted categories                  |
| `templates`   | array    | Array of template objects displayed in this category  |

Templates appear in the UI in the order they appear in the `templates` array within each category.

### 3. `blueprints_bundles.json` — Blueprint Distribution

Separate file at the repo root for subgraph blueprints. Same concept as `bundles.json` but for blueprints instead of workflow templates.

## Common Operations

### Move a template to a different display category

1. Open `templates/index.json`.
2. Find the template object in its current category's `templates` array.
3. Cut it from the current array and paste it into the target category's `templates` array at the desired position.
4. Run validation (see below).

### Move a template to a different distribution bundle

1. Open `bundles.json`.
2. Find the template name string in its current bundle array.
3. Move it to the target bundle array (e.g., from `media-image` to `media-video`).
4. Run `python scripts/sync_bundles.py` to regenerate package manifests.
5. Run validation (see below).

### Reorder templates within a category

1. Open `templates/index.json`.
2. Find the category containing the template.
3. Change the position of the template object within the `templates` array — items display in array order.
4. Run validation (see below).

### Create a new display category

Add a new category object to the array in `templates/index.json`:

```json
{
  "moduleName": "default",
  "category": "CATEGORY GROUP",
  "icon": "icon-class-name",
  "title": "Display Title",
  "type": "media-type",
  "isEssential": false,
  "templates": []
}
```

### Rename a category

Change the `title` field of the category object in `templates/index.json`.

## After Any Change

Always run these commands to validate and sync:

```bash
python scripts/sync_bundles.py
python scripts/validate_templates.py
```

If category structure changes (new categories, renamed categories, restructured groupings), also run i18n sync:

```bash
python3 scripts/sync_data.py --templates-dir templates
```

## Rules

- Every template in `index.json` must also appear in exactly one bundle in `bundles.json`.
- Never remove a template from `bundles.json` without also removing it from `index.json`.
- After editing bundles, always run `sync_bundles.py`.
- Template name strings must match exactly between `index.json` and `bundles.json`.
- Run `validate_templates.py` after every change to catch mismatches.
