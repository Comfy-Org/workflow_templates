# Rodin3D_Smooth

**Category**: api node/3d/Rodin

**Display Name**: Rodin 3D Generate - Smooth Generate

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/Rodin3D_Smooth/en.md)

The Rodin 3D Smooth node generates 3D assets using the Rodin API by processing input images and converting them into smooth 3D models. It takes multiple images as input and produces a downloadable 3D model file. The node handles the entire generation process including task creation, status polling, and file downloading automatically.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `Images` | IMAGE | Yes | - | Input images to use for 3D model generation |
| `Seed` | INT | Yes | - | Random seed value for generation consistency |
| `Material_Type` | STRING | Yes | - | Type of material to apply to the 3D model |
| `Polygon_count` | STRING | Yes | - | Target polygon count for the generated 3D model |

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `3D Model Path` | STRING | File path to the downloaded 3D model |

**Source**: `comfy_api_nodes/nodes_rodin.py`

**Used in 2 template(s)**
