# TripoTextToModelNode

**Category**: api node/3d/Tripo

**Display Name**: Tripo: Text to Model

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/TripoTextToModelNode/en.md)

Generates 3D models synchronously based on a text prompt using Tripo's API. This node takes a text description and creates a 3D model with optional texture and material properties.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `prompt` | STRING | Yes | - | Text description for generating the 3D model (multiline input) |
| `negative_prompt` | STRING | No | - | Text description of what to avoid in the generated model (multiline input) |
| `model_version` | COMBO | No | Multiple options available | The version of the Tripo model to use for generation |
| `style` | COMBO | No | Multiple options available | Style setting for the generated model (default: "None") |
| `texture` | BOOLEAN | No | - | Whether to generate textures for the model (default: True) |
| `pbr` | BOOLEAN | No | - | Whether to generate PBR (Physically Based Rendering) materials (default: True) |
| `image_seed` | INT | No | - | Random seed for image generation (default: 42) |
| `model_seed` | INT | No | - | Random seed for model generation (default: 42) |
| `texture_seed` | INT | No | - | Random seed for texture generation (default: 42) |
| `texture_quality` | COMBO | No | "standard"<br>"detailed" | Quality level for texture generation (default: "standard") |
| `face_limit` | INT | No | -1 to 500000 | Maximum number of faces in the generated model, -1 for no limit (default: -1) |
| `quad` | BOOLEAN | No | - | Whether to generate quad-based geometry instead of triangles (default: False) |

**Note:** The `prompt` parameter is required and cannot be empty. If no prompt is provided, the node will raise an error.

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `model_file` | STRING | The generated 3D model file |
| `model task_id` | MODEL_TASK_ID | The unique task identifier for the model generation process |

**Source**: `comfy_api_nodes/nodes_tripo.py`

**Used in 2 template(s)**
