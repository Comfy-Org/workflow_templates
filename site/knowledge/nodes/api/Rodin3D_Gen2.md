# Rodin3D_Gen2

**Category**: api node/3d/Rodin

**Display Name**: Rodin 3D Generate - Gen-2 Generate

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/Rodin3D_Gen2/en.md)

The Rodin3D_Gen2 node generates 3D assets using the Rodin API. It takes input images and converts them into 3D models with various material types and polygon counts. The node handles the entire generation process including task creation, status polling, and file downloading automatically.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `Images` | IMAGE | Yes | - | Input images to use for 3D model generation |
| `Seed` | INT | No | 0-65535 | Random seed value for generation (default: 0) |
| `Material_Type` | COMBO | No | "PBR"<br>"Shaded" | Type of material to apply to the 3D model (default: "PBR") |
| `Polygon_count` | COMBO | No | "4K-Quad"<br>"8K-Quad"<br>"18K-Quad"<br>"50K-Quad"<br>"2K-Triangle"<br>"20K-Triangle"<br>"150K-Triangle"<br>"500K-Triangle" | Target polygon count for the generated 3D model (default: "500K-Triangle") |
| `TAPose` | BOOLEAN | No | - | Whether to apply TAPose processing (default: False) |

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `3D Model Path` | STRING | File path to the generated 3D model |

**Source**: `comfy_api_nodes/nodes_rodin.py`

**Used in 1 template(s)**
