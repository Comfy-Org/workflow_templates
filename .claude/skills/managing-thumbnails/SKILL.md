---
name: managing-thumbnails
description: "Manages thumbnail and preview images for ComfyUI workflow templates. Adds, replaces, validates, and audits thumbnails. Use when asked to: add a thumbnail, replace a preview image, update template image, fix missing thumbnail, check thumbnails, audit thumbnails, which templates need thumbnails, missing previews, add preview image, change template picture, update template visual, swap thumbnail, set thumbnail, upload preview, template image missing, broken thumbnail, thumbnail not showing. Triggers on: thumbnail, preview image, template image, template picture, missing thumbnail, add image, replace image, visual asset."
---

# Managing Thumbnails

This skill covers adding, replacing, validating, and auditing thumbnail images for ComfyUI workflow templates.

## Naming Convention

Thumbnails live in `templates/` alongside the workflow JSON files. They are named using the template's `name` field from `templates/index.json`:

- **Primary:** `{template_name}-1.webp`
- **Secondary (optional):** `{template_name}-2.webp` (only for dual-thumbnail variants)

The `{template_name}` portion must **exactly match** the `name` field in `templates/index.json`.

## Supported Formats

| Format | Notes |
|---|---|
| `.webp` | **Preferred.** Smallest file size. Use lossy compression (~65% quality). |
| `.png` | Acceptable fallback. |
| `.jpg` / `.jpeg` | Acceptable fallback. |
| `.webp` (animated) | Used for video-type templates (animated webp). |

## Thumbnail Variants

The `thumbnailVariant` field in `templates/index.json` controls how the thumbnail behaves on the site:

| Variant | Thumbnails Needed | Effect |
|---|---|---|
| (none/default) | `-1` only | Static image, slight zoom on hover |
| `compareSlider` | `-1` AND `-2` | Before/after slider comparison |
| `hoverDissolve` | `-1` AND `-2` | Dissolves to second image on hover |
| `hoverZoom` / `zoomHover` | `-1` only | Same as default but zooms more |

If a template uses `compareSlider` or `hoverDissolve`, **both** `-1` and `-2` files are required.

## Adding a Thumbnail

1. Name the file `{template_name}-1.webp`, where `{template_name}` matches the template's `name` field in `templates/index.json`.
2. Place it in the `templates/` directory.
3. Compress to a reasonable size (use lossy webp compression, ~65% quality).
4. If using `compareSlider` or `hoverDissolve`, also add `{template_name}-2.webp`.

## Replacing a Thumbnail

Overwrite the existing file in `templates/` with the new image, using the **same filename**.

## Setting the Thumbnail Variant

Edit the template's entry in `templates/index.json` and set or change the `thumbnailVariant` field to one of: `compareSlider`, `hoverDissolve`, `hoverZoom`, or `zoomHover`. Remove the field (or leave it unset) for the default behavior.

## Auditing Thumbnails

Run the validation script to check for issues:

```bash
python scripts/validate_thumbnails.py
```

This checks for:
- Templates missing their primary thumbnail
- Templates with a dual-variant set (`compareSlider` or `hoverDissolve`) but missing the second thumbnail (`-2`)
- Orphaned thumbnail files not referenced by any template

## Site Preview Images

The site also generates workflow preview images via:

```bash
pnpm run generate:previews  # run from site/
```

These are **separate** from template thumbnails — they are auto-generated visualizations of the workflow graph, not the output images you manage here.

## Validation After Changes

After adding, replacing, or modifying thumbnails, always validate:

```bash
python scripts/validate_thumbnails.py
python scripts/validate_templates.py
```

Then sync to packages:

```bash
python scripts/sync_bundles.py
```

## Rules

- The template name in the filename must **exactly match** the `name` field in `templates/index.json`.
- Always use `.webp` format when possible for smallest file size.
- Thumbnails should ideally show the output produced by the workflow.
- If the template uses `compareSlider` or `hoverDissolve`, **both** `-1` and `-2` files are required.
- Never put thumbnails in `site/` — they belong in `templates/`.
- After adding or changing thumbnails, run `python scripts/sync_bundles.py` to sync to packages.
