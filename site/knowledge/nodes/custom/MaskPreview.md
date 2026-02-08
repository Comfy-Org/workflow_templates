# MaskPreview

**Category**: mask

**Display Name**: Preview Mask

**Also known as**: show mask, view mask, inspect mask, debug mask

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/MaskPreview/en.md)

The MaskPreview node generates a visual preview of a mask by converting it into a 3-channel image format and saving it as a temporary file. It takes a mask input and reshapes it into a format suitable for image display, then saves the result to the temporary directory with a random filename prefix. This allows users to visually inspect mask data during workflow execution.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `mask` | MASK | Yes | - | The mask data to be previewed and converted to image format |
| `filename_prefix` | STRING | No | - | Prefix for the output filename (default: "ComfyUI") |
| `prompt` | PROMPT | No | - | Prompt information for metadata (automatically provided) |
| `extra_pnginfo` | EXTRA_PNGINFO | No | - | Additional PNG information for metadata (automatically provided) |

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `ui` | DICT | Contains the preview image information and metadata for display |

**Source**: `comfy_extras/nodes_mask.py`

**Used in 2 template(s)**
