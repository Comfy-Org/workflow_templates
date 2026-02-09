# Rodin3D_Detail

**Category**: api node/3d/Rodin

**Display Name**: Rodin 3D Generate - Detail Generate

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/Rodin3D_Detail/en.md)

The Rodin 3D Detail node generates detailed 3D assets using the Rodin API. It takes input images and processes them through the Rodin service to create high-quality 3D models with detailed geometry and materials. The node handles the entire workflow from task creation to downloading the final 3D model file.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `Images` | IMAGE | Yes | - | Input images used for 3D model generation |
| `Seed` | INT | Yes | - | Random seed value for reproducible results |
| `Material_Type` | STRING | Yes | - | Type of material to apply to the 3D model |
| `Polygon_count` | STRING | Yes | - | Target polygon count for the generated 3D model |

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `3D Model Path` | STRING | File path to the generated 3D model |

**Source**: `comfy_api_nodes/nodes_rodin.py`

**Used in 2 template(s)**
