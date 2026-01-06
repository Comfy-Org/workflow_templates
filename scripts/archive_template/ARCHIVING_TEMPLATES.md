# Template Archiving Guide

This document explains how to use the archiving script to move templates marked as `archived` to the archived folder, and how to restore archived templates back to active status.

## Overview

The script performs two operations in sequence:

1. **Restore Process**: When templates in `archived/index.json` have `"status": "active"`, the script will restore them back to the active templates folder
2. **Archive Process**: When templates in `templates/index.json` have `"status": "archived"`, the script will move them to the archived folder

When a template is marked with `"status": "archived"`, the archiving script will automatically:
1. Move template files and related resources to the `archived/` folder
2. Remove templates from main index files
3. Update all related configuration files
4. Preserve all translation and localization data

## Prerequisites

- Python 3.6 or higher
- Write permissions to the repository

## Usage

### 1. Mark Template as Archived

In `templates/index.json`, find the template you want to archive and add the `"status": "archived"` field:

```json
{
  "name": "example_template",
  "title": "Example Template",
  "status": "archived",
  ...
}
```

### 2. Run the Archiving Script

Execute from the project root directory:

```bash
python3 scripts/archive_template/archive_templates.py
```

The script will first check for templates to restore (with `status: "active"` in `archived/index.json`), then process templates to archive (with `status: "archived"` in `templates/index.json`).

### 3. Verify Results

After the script completes, check:

- ✅ The `archived/` folder contains template JSON and thumbnail files
- ✅ `archived/archived_i18n.json` contains template translation data
- ✅ `archived/index.json` contains the archived templates main index
- ✅ `archived/index.[locale].json` files contain template localized indices
- ✅ Templates have been removed from main index files
- ✅ Template references have been removed from `bundles.json`

## Script Execution Flow

The script runs in two phases:

### Phase 1: Restore Process

The script first checks `archived/index.json` for templates with `"status": "active"` and restores them:

1. **Restore Files**: Move template JSON and thumbnail files from `archived/` back to `templates/`
2. **Restore i18n**: Move translation data from `archived/archived_i18n.json` back to `scripts/i18n.json`
3. **Restore Locale Indexes**: Move template entries from `archived/index.[locale].json` back to `templates/index.[locale].json`
4. **Restore Main Index**: Move template entries from `archived/index.json` back to `templates/index.json`
5. **Remove Status**: Remove the `"status": "active"` field from restored templates

### Phase 2: Archive Process

The script then processes each archived template (with `"status": "archived"` in `templates/index.json`) in the following steps:

### Step 1: Move Files
- Move `{template_name}.json` to `archived/`
- Move all thumbnail files (`{template_name}-1.webp`, `{template_name}-2.webp`, etc.) to `archived/`
- Supports multiple media types: `.webp`, `.mp3`, `.mp4`

### Step 2: Update bundles.json
- Remove template names from all bundle arrays (`media-api`, `media-image`, `media-other`, `media-video`)

### Step 3: Update i18n Data
- Extract template translation data from `scripts/i18n.json` under the `templates` key
- Move translation data to `archived/archived_i18n.json`
- If `archived_i18n.json` already exists, merge data (without overwriting existing entries)
- Remove template data from original `i18n.json`

### Step 4: Update Localized Index Files
- Create corresponding `archived/index.[locale].json` for each `templates/index.[locale].json` file
- Add template data to archived index files, maintaining the original category structure
- Remove template data from original `index.[locale].json` files

### Step 5: Update Main Index
- Remove archived templates from `templates/index.json`

## Output Example

The script displays detailed processing information during execution:

### Restore Process (if any active templates found)

```
Starting template restoration process...

Found 1 template(s) to restore:
  - hidream_e1_1 (HiDream E1.1图像编辑)

Restoring: hidream_e1_1
  Restored hidream_e1_1.json from archived/
  Restored hidream_e1_1-1.webp from archived/
  Restored i18n data for hidream_e1_1
  Restored to index.zh.json
  Restored to index.json

Saving restored files...
Restoration complete!
```

### Archive Process

```
Starting template archiving process...

Loading index.json...
Found 3 archived template(s):
  - gligen_textbox_example (Gligen Textbox)
  - area_composition_square_area_for_subject (Area Composition Square Area for Subject)
  - latent_upscale_different_prompt_model (Latent Upscale Different Prompt Model)

Processing: gligen_textbox_example
  Moved gligen_textbox_example.json to archived/
  Moved gligen_textbox_example-1.webp to archived/
  Removed from bundles.media-other
  Updated archived_i18n.json with gligen_textbox_example
  Created category and added to archived/index.zh.json
  ...
  Removed from index.json

Saving updated files...

Archiving complete!
Archived templates are now in: /path/to/archived
```

## File Structure

File structure after archiving:

```
archived/
├── archived_i18n.json              # Translation data for all archived templates
├── index.json                       # Main index for archived templates
├── index.ar.json                    # Arabic index
├── index.es.json                    # Spanish index
├── index.fr.json                    # French index
├── index.ja.json                    # Japanese index
├── index.ko.json                    # Korean index
├── index.ru.json                    # Russian index
├── index.tr.json                    # Turkish index
├── index.zh.json                    # Simplified Chinese index
├── index.zh-TW.json                 # Traditional Chinese index
├── template_name.json               # Template definition file
├── template_name-1.webp             # Thumbnail 1
└── template_name-2.webp             # Thumbnail 2 (if exists)
```

## Important Notes

1. **Backup**: It's recommended to commit current changes or create a backup before running the script
2. **Format Preservation**: The script preserves the original JSON file format (arrays remain in compact single-line format)
3. **i18n Structure**: Template data in `i18n.json` is located under the `templates` key, which the script handles automatically
4. **Data Merging**: If `archived_i18n.json` already exists, new data will be merged without overwriting existing entries
5. **Category Matching**: Archived index files maintain the same category structure as the original index files

## Troubleshooting

### Issue: Script cannot find i18n data

**Cause**: Template data in `i18n.json` is located under the `templates` key.

**Solution**: Ensure you're using the latest version of the script, which correctly handles the `templates` key structure.

### Issue: File format changes

**Cause**: JSON formatting may cause arrays to change from single-line to multi-line.

**Solution**: The script includes format preservation logic that automatically keeps simple arrays in single-line format.

### Issue: Template not removed from bundles.json

**Cause**: Template name may not be in any bundle array.

**Solution**: This is normal. If the template wasn't in any bundle to begin with, there's nothing to remove.

## Restoring Archived Templates

The script now supports automatic restoration of archived templates! Simply mark the template as active in the archived index:

### Method: Automatic Restoration (Recommended)

1. Open `archived/index.json`
2. Find the template you want to restore
3. Add or change the `status` field to `"active"`:

```json
{
  "name": "hidream_e1_1",
  "title": "HiDream E1.1图像编辑",
  "status": "active",
  ...
}
```

4. Run the archiving script:

```bash
python3 scripts/archive_template/archive_templates.py
```

The script will automatically:
- Restore template files from `archived/` to `templates/`
- Restore i18n translations from `archived/archived_i18n.json` to `scripts/i18n.json`
- Restore template entries in all index files
- Remove the `"status": "active"` field after restoration

### Manual Restoration (if needed)

If you prefer to restore manually:

1. Copy template files from `archived/` back to `templates/`
2. Copy translation data from `archived/archived_i18n.json` back to `scripts/i18n.json` under the `templates` key
3. Copy template data from `archived/index.[locale].json` back to corresponding `templates/index.[locale].json` files
4. Copy template data from `archived/index.json` back to `templates/index.json`
5. If needed, add template name back to the appropriate array in `bundles.json`
6. Remove the `"status"` field from the template definition (if present)

## Related Files

- Script location: `scripts/archive_template/archive_templates.py`
- Main index: `templates/index.json`
- Archived main index: `archived/index.json`
- Localized indices: `templates/index.[locale].json`
- Archived localized indices: `archived/index.[locale].json`
- Translation data: `scripts/i18n.json`
- Archived translation data: `archived/archived_i18n.json`
- Bundle configuration: `bundles.json`

## Contributing

If you find issues with the script or need new features, please submit an Issue or Pull Request.
