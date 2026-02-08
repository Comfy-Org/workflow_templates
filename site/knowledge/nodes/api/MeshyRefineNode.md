# MeshyRefineNode

**Category**: api node/3d/Meshy

**Display Name**: Meshy: Refine Draft Model

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/MeshyRefineNode/en.md)

The Meshy: Refine Draft Model node takes a previously generated 3D draft model and improves its quality, optionally adding textures. It submits a refinement task to the Meshy API and returns the final 3D model files once processing is complete.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `model` | COMBO | Yes | `"latest"` | Specifies the AI model to use for refinement. Currently, only the "latest" model is available. |
| `meshy_task_id` | MESHY_TASK_ID | Yes | - | The unique task ID of the draft model you want to refine. |
| `enable_pbr` | BOOLEAN | No | - | Generate PBR Maps (metallic, roughness, normal) in addition to the base color. Note: this should be set to false when using Sculpture style, as Sculpture style generates its own set of PBR maps. (default: `False`) |
| `texture_prompt` | STRING | No | - | Provide a text prompt to guide the texturing process. Maximum 600 characters. Cannot be used at the same time as 'texture_image'. (default: empty string) |
| `texture_image` | IMAGE | No | - | Only one of 'texture_image' or 'texture_prompt' may be used at the same time. (optional) |

**Note:** The `texture_prompt` and `texture_image` inputs are mutually exclusive. You cannot provide both a text prompt and an image for texturing in the same operation.

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `model_file` | STRING | The filename of the generated GLB model. (For backward compatibility only) |
| `meshy_task_id` | MESHY_TASK_ID | The unique task ID for the submitted refinement job. |
| `GLB` | FILE3DGLB | The final refined 3D model in GLB format. |
| `FBX` | FILE3DFBX | The final refined 3D model in FBX format. |

**Source**: `comfy_api_nodes/nodes_meshy.py`

**Used in 3 template(s)**
