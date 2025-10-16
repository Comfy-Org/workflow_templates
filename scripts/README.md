# Workflow Template Scripts

This directory contains scripts for managing workflow templates and their input assets.

## check_input_assets.py

A comprehensive script that validates input assets referenced in workflow JSON files and optionally generates an upload configuration file.

### Features

1. **Asset Validation**: Validates that all input assets referenced in workflow templates exist in the `input/` directory
2. **Upload JSON Generation**: Creates a `workflow_template_input_files.json` file for bulk asset upload to public storage
3. **Detailed Reporting**: Generates comprehensive validation reports

### Usage

#### Basic Validation

Run asset validation without generating upload JSON:

```bash
python scripts/check_input_assets.py
```

This will:
- Scan all workflow JSON files in `templates/`
- Check for `LoadImage`, `LoadAudio`, and `LoadVideo` nodes
- Validate that referenced assets exist in `input/`
- Generate a validation report at `asset_validation_report.md`
- **Exit with error code 1 if any assets are missing** (fails CI/CD)

#### Generate Upload JSON

Generate the upload JSON file for asset deployment:

```bash
python scripts/check_input_assets.py --generate-upload-json
```

This will:
- Perform all validation steps
- Scan all files in `input/` directory
- Parse filenames to extract workflow and description info
- Match with workflow metadata from `templates/index.json`
- Generate `workflow_template_input_files.json` at repository root

#### Custom Base URL

Use a custom base URL for the generated asset URLs:

```bash
python scripts/check_input_assets.py --generate-upload-json --base-url "https://example.com/assets/"
```

### Input File Naming Convention

Input files should follow this naming pattern:

```
{workflow_name}_{description}.{extension}
```

Examples:
- `image_to_video_input_image.png`
- `flux_dev_checkpoint_example_prompt.txt`
- `audio_stable_audio_example_reference.mp3`

The script will:
1. Extract `workflow_name` from the filename
2. Look up workflow title from `templates/index.json`
3. Convert `description` to human-readable format
4. Generate appropriate display name and tags

### Output Format

The generated `workflow_template_input_files.json` follows this structure:

```json
{
  "assets": [
    {
      "url": "https://raw.githubusercontent.com/Comfy-Org/workflow_templates/refs/heads/main/input/image_to_video_input_image.png",
      "display_name": "Input image for Image to Video workflow - Input Image",
      "tags": ["input", "image", "image to video"],
      "mime_type": "image/png"
    }
  ]
}
```

### Supported Asset Types

The script automatically detects and categorizes assets:

- **Images**: `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`
- **Videos**: `.mp4`, `.mov`, `.avi`
- **Audio**: `.mp3`, `.wav`, `.ogg`
- **Other**: Detected via Python's `mimetypes` module

### Integration with GitHub Actions

The workflow is automatically triggered on:
- Push to `main` branch (changes to `input/`, `templates/index.json`, or the script itself)
- Pull requests with relevant changes
- Manual workflow dispatch

#### Automatic Commits

The workflow will automatically:
- **On Pull Requests**: Commit the updated `workflow_template_input_files.json` directly to the PR branch
- **On Main Branch**: Commit the updated JSON file with `[skip ci]` to prevent recursive triggers
- **Validation Report**: The `asset_validation_report.md` is excluded from commits (added to `.gitignore`)

This ensures that the upload JSON is always up-to-date with the latest input assets.

See `.github/workflows/generate-upload-json.yml` for details.

### Node Types Checked

Currently supported node types:
- `LoadImage`
- `LoadAudio`
- `LoadVideo`

To add more node types, update the `ASSET_NODE_TYPES` list in the script.

## Adding New Assets

1. Add your asset file to the `input/` directory following the naming convention
2. Reference the asset in your workflow JSON file
3. The GitHub Action will automatically:
   - Validate the asset exists
   - Generate updated upload JSON
   - Commit the changes (on main branch)

## Troubleshooting

### Missing Assets Error

If you see validation errors:
1. Check the `asset_validation_report.md` file
2. Ensure all referenced files exist in `input/`
3. Verify filenames match exactly (case-sensitive)

### Workflow Not Found

If workflow title shows as the filename:
1. Check that the workflow name matches an entry in `templates/index.json`
2. Verify the `name` field in index.json matches the prefix of your input filename

### MIME Type Issues

The script uses Python's `mimetypes` module with fallbacks for common types. If you encounter issues:
1. Check the extension is recognized
2. Add custom MIME types to the `mime_map` dictionary in `get_mime_type()`

## Example Workflow

```bash
# 1. Add new input asset
cp my_image.png input/flux_dev_checkpoint_example_sample_input.png

# 2. Update workflow to reference it
# Edit templates/flux_dev_checkpoint_example.json

# 3. Validate locally
python scripts/check_input_assets.py --generate-upload-json

# 4. Review generated JSON
cat workflow_template_input_files.json

# 5. Commit and push
git add input/flux_dev_checkpoint_example_sample_input.png
git add templates/flux_dev_checkpoint_example.json
git commit -m "Add new input asset for flux workflow"
git push
```

The GitHub Action will automatically validate and regenerate the upload JSON.
