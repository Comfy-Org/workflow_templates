# Workflow Templates Specification

This document describes the formal specification for ComfyUI workflow templates.

## Overview

Workflow templates consist of:
1. A workflow JSON file (`template_name.json`)
2. One or more thumbnail images (`template_name-1.webp`, `template_name-2.webp`, etc.)
3. Metadata entry in `index.json`

## File Structure

```
templates/
├── index.json                 # Template metadata index
├── index.schema.json          # JSON schema for validation
├── template_name.json         # Workflow definition
├── template_name-1.webp       # Primary thumbnail
└── template_name-2.webp       # Optional secondary thumbnail
```

## index.json Schema

The `index.json` file is an array of category objects. See `templates/index.schema.json` for the formal schema.

### Category Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `moduleName` | string | ✅ | Module identifier (e.g., "default") |
| `title` | string | ✅ | Display name for the category |
| `type` | string | ❌ | Optional type hint: "image", "video", "audio", "3d" |
| `templates` | array | ✅ | Array of template objects |

### Template Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | ✅ | Workflow filename without .json extension |
| `title` | string | ❌ | Optional display title |
| `description` | string | ✅ | Brief description of the workflow |
| `mediaType` | string | ✅ | Output type: "image", "video", "audio", "3d" |
| `mediaSubtype` | string | ✅ | Thumbnail format: "webp", "mp3", "mp4", etc. |
| `thumbnailVariant` | string | ❌ | Hover effect: "compareSlider", "hoverDissolve", "hoverZoom", "zoomHover" |
| `tutorialUrl` | string | ❌ | Link to documentation |

## Naming Conventions

- **Workflow files**: Use lowercase with underscores (e.g., `flux_dev_example.json`)
- **No spaces, dots, or special characters** in filenames
- **Thumbnails**: Must follow pattern `{name}-{number}.{extension}`
  - Number starts at 1
  - Extension matches `mediaSubtype`

## Thumbnail Requirements

### Required Thumbnails
- Every template MUST have at least one thumbnail: `{name}-1.{mediaSubtype}`
- Additional thumbnails are optional: `{name}-2.{mediaSubtype}`, etc.

### Thumbnail Variants
- `compareSlider`: Shows before/after comparison
- `hoverDissolve`: Dissolves between two images on hover
- `hoverZoom`: Zooms in on hover
- `zoomHover`: Same as hoverZoom (legacy)

### File Size Guidelines
- Compress thumbnails to under 1MB when possible
- Use WebP format for images (better compression)
- Recommended resolution: 512x512 or 768x768 pixels

## Workflow JSON Requirements

Each workflow file must include:
1. Valid ComfyUI workflow JSON structure
2. Embedded model metadata for automatic downloads
3. Optional node version requirements

### Model Metadata Format

```json
{
  "properties": {
    "models": [
      {
        "name": "model_filename.safetensors",
        "url": "https://huggingface.co/...",
        "hash": "sha256_hash",
        "hash_type": "SHA256",
        "directory": "models/checkpoints"
      }
    ]
  }
}
```

## Validation

Run validation before submitting PRs:

```bash
python scripts/validate_templates.py
```

This checks:
- ✅ JSON schema compliance
- ✅ File consistency (all referenced files exist)
- ✅ No duplicate template names
- ✅ Required thumbnails present
- ✅ Valid JSON syntax

## Adding New Templates

1. Create workflow and thumbnails following naming conventions
2. Add entry to `index.json` in appropriate category
3. Run validation script
4. Bump version in `pyproject.toml`
5. Submit PR

## Categories

Current categories:
- **Basics**: Core image generation workflows
- **Flux**: Flux model workflows
- **Image**: Advanced image generation
- **Video**: Video generation workflows
- **Image API**: External API integrations for images
- **Video API**: External API integrations for video
- **Upscaling**: Image enhancement workflows
- **ControlNet**: Guided generation workflows
- **Area Composition**: Spatial control workflows
- **3D**: 3D generation workflows
- **Audio**: Audio generation workflows