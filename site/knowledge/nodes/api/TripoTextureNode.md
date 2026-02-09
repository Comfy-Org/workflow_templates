# TripoTextureNode

**Category**: api node/3d/Tripo

**Display Name**: Tripo: Texture model

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/TripoTextureNode/en.md)

The TripoTextureNode generates textured 3D models using the Tripo API. It takes a model task ID and applies texture generation with various options including PBR materials, texture quality settings, and alignment methods. The node communicates with the Tripo API to process the texture generation request and returns the resulting model file and task ID.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `model_task_id` | MODEL_TASK_ID | Yes | - | The task ID of the model to apply textures to |
| `texture` | BOOLEAN | No | - | Whether to generate textures (default: True) |
| `pbr` | BOOLEAN | No | - | Whether to generate PBR (Physically Based Rendering) materials (default: True) |
| `texture_seed` | INT | No | - | Random seed for texture generation (default: 42) |
| `texture_quality` | COMBO | No | "standard"<br>"detailed" | Quality level for texture generation (default: "standard") |
| `texture_alignment` | COMBO | No | "original_image"<br>"geometry" | Method for aligning textures (default: "original_image") |

*Note: This node requires authentication tokens and API keys which are automatically handled by the system.*

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `model_file` | STRING | The generated model file with applied textures |
| `model task_id` | MODEL_TASK_ID | The task ID for tracking the texture generation process |

**Source**: `comfy_api_nodes/nodes_tripo.py`

**Used in 3 template(s)**
