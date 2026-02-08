# TripoImageToModelNode

**Category**: api node/3d/Tripo

**Display Name**: Tripo: Image to Model

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/TripoImageToModelNode/en.md)

Generates 3D models synchronously based on a single image using Tripo's API. This node takes an input image and converts it into a 3D model with various customization options for texture, quality, and model properties.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `image` | IMAGE | Yes | - | Input image used to generate the 3D model |
| `model_version` | COMBO | No | Multiple options available | The version of the Tripo model to use for generation |
| `style` | COMBO | No | Multiple options available | Style setting for the generated model (default: "None") |
| `texture` | BOOLEAN | No | - | Whether to generate textures for the model (default: True) |
| `pbr` | BOOLEAN | No | - | Whether to use Physically Based Rendering (default: True) |
| `model_seed` | INT | No | - | Random seed for model generation (default: 42) |
| `orientation` | COMBO | No | Multiple options available | Orientation setting for the generated model |
| `texture_seed` | INT | No | - | Random seed for texture generation (default: 42) |
| `texture_quality` | COMBO | No | "standard"<br>"detailed" | Quality level for texture generation (default: "standard") |
| `texture_alignment` | COMBO | No | "original_image"<br>"geometry" | Alignment method for texture mapping (default: "original_image") |
| `face_limit` | INT | No | -1 to 500000 | Maximum number of faces in the generated model, -1 for no limit (default: -1) |
| `quad` | BOOLEAN | No | - | Whether to use quadrilateral faces instead of triangles (default: False) |

**Note:** The `image` parameter is required and must be provided for the node to function. If no image is provided, the node will raise a RuntimeError.

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `model_file` | STRING | The generated 3D model file |
| `model task_id` | MODEL_TASK_ID | The task ID for tracking the model generation process |

**Source**: `comfy_api_nodes/nodes_tripo.py`

**Used in 2 template(s)**
