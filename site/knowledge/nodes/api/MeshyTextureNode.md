# MeshyTextureNode

**Category**: api node/3d/Meshy

**Display Name**: Meshy: Texture Model

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/MeshyTextureNode/en.md)

The Meshy: Texture Node applies AI-generated textures to a 3D model. It takes a task ID from a previous Meshy 3D generation or conversion node and uses either a text description or a reference image to create new textures for the model. The node outputs the textured model in GLB and FBX file formats.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `model` | COMBO | Yes | `"latest"` | The AI model version to use for texturing. Currently, only the "latest" version is available. |
| `meshy_task_id` | MESHY_TASK_ID | Yes | - | The unique identifier (task ID) from a previous Meshy 3D generation or conversion task. This provides the base 3D model to be textured. |
| `enable_original_uv` | BOOLEAN | No | - | When enabled (default: `True`), the node uses the original UV layout of the uploaded model, preserving any existing textures. If the model has no original UV, the output quality may be lower. |
| `pbr` | BOOLEAN | No | - | Enables Physically Based Rendering (PBR) material output for the textured model (default: `False`). |
| `text_style_prompt` | STRING | No | - | A text description of the desired texture style for the object. Maximum 600 characters. Cannot be used at the same time as `image_style`. |
| `image_style` | IMAGE | No | - | A 2D reference image to guide the texturing process. Cannot be used at the same time as `text_style_prompt`. |

**Parameter Constraints:**

* You must provide either a `text_style_prompt` or an `image_style`, but you cannot provide both at the same time.
* The `text_style_prompt` is limited to a maximum of 600 characters.

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `model_file` | STRING | The filename of the generated GLB model. This output is provided for backward compatibility. |
| `meshy_task_id` | MODEL_TASK_ID | The unique task identifier for this texturing job, which can be used to reference the result. |
| `GLB` | FILE3DGLB | The textured 3D model saved in the GLB file format. |
| `FBX` | FILE3DFBX | The textured 3D model saved in the FBX file format. |

**Source**: `comfy_api_nodes/nodes_meshy.py`

**Used in 3 template(s)**
