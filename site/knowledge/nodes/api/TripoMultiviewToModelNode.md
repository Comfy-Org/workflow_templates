# TripoMultiviewToModelNode

**Category**: api node/3d/Tripo

**Display Name**: Tripo: Multiview to Model

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/TripoMultiviewToModelNode/en.md)

This node generates 3D models synchronously using Tripo's API by processing up to four images showing different views of an object. It requires a front image and at least one additional view (left, back, or right) to create a complete 3D model with texture and material options.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `image` | IMAGE | Yes | - | Front view image of the object (required) |
| `image_left` | IMAGE | No | - | Left view image of the object |
| `image_back` | IMAGE | No | - | Back view image of the object |
| `image_right` | IMAGE | No | - | Right view image of the object |
| `model_version` | COMBO | No | Multiple options available | Tripo model version to use for generation |
| `orientation` | COMBO | No | Multiple options available | Orientation setting for the 3D model |
| `texture` | BOOLEAN | No | - | Whether to generate textures for the model (default: True) |
| `pbr` | BOOLEAN | No | - | Whether to generate PBR (Physically Based Rendering) materials (default: True) |
| `model_seed` | INT | No | - | Random seed for model generation (default: 42) |
| `texture_seed` | INT | No | - | Random seed for texture generation (default: 42) |
| `texture_quality` | COMBO | No | "standard"<br>"detailed" | Quality level for texture generation (default: "standard") |
| `texture_alignment` | COMBO | No | "original_image"<br>"geometry" | Method for aligning textures to the model (default: "original_image") |
| `face_limit` | INT | No | -1 to 500000 | Maximum number of faces in the generated model, -1 for no limit (default: -1) |
| `quad` | BOOLEAN | No | - | Whether to generate quad-based geometry instead of triangles (default: False) |

**Note:** The front image (`image`) is always required. At least one additional view image (`image_left`, `image_back`, or `image_right`) must be provided for multiview processing.

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `model_file` | STRING | File path or identifier for the generated 3D model |
| `model task_id` | MODEL_TASK_ID | Task identifier for tracking the model generation process |

**Source**: `comfy_api_nodes/nodes_tripo.py`

**Used in 1 template(s)**
