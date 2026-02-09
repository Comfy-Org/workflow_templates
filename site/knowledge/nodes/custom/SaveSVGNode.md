# SaveSVGNode

**Category**: image/save

**Also known as**: export vector, save vector graphics

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/SaveSVGNode/en.md)

Save SVG files on disk. This node takes SVG data as input and saves it to your output directory with optional metadata embedding. The node automatically handles file naming with counter suffixes and can embed workflow prompt information directly into the SVG file.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `svg` | SVG | Yes | - | The SVG data to be saved to disk |
| `filename_prefix` | STRING | Yes | - | The prefix for the file to save. This may include formatting information such as %date:yyyy-MM-dd% or %Empty Latent Image.width% to include values from nodes. (default: "svg/ComfyUI") |

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `ui` | DICT | Returns file information including filename, subfolder, and type for display in the ComfyUI interface |

**Note:** This node automatically embeds workflow metadata (prompt and extra PNG information) into the SVG file when available. The metadata is inserted as a CDATA section within the SVG's metadata element.

**Source**: `comfy_extras/nodes_images.py`

**Used in 3 template(s)**
