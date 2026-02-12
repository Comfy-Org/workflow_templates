# ModelPatchLoader

**Category**: advanced/loaders

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/ModelPatchLoader/en.md)

The ModelPatchLoader node loads specialized model patches from the model_patches folder. It automatically detects the type of patch file and loads the appropriate model architecture, then wraps it in a ModelPatcher for use in the workflow. This node supports different patch types including controlnet blocks and feature embedder models.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `name` | STRING | Yes | All available model patch files from model_patches folder | The filename of the model patch to load from the model_patches directory |

## Outputs

| Output | Type | Description |
|--------|------|-------------|
| MODEL_PATCH | MODEL_PATCH |  |

**Source**: `comfy_extras/nodes_model_patch.py`

**Used in 2 template(s)**
