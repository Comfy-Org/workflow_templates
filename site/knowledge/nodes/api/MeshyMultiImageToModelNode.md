# MeshyMultiImageToModelNode

**Category**: api node/3d/Meshy

**Display Name**: Meshy: Multi-Image to Model

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/MeshyMultiImageToModelNode/en.md)

This node uses the Meshy API to generate a 3D model from multiple input images. It uploads the provided images, submits a processing task, and returns the resulting 3D model files (GLB and FBX) along with the task ID for reference.

## Inputs

| Parameter | Data Type | Required | Range | Description |
| :--- | :--- | :--- | :--- | :--- |
| `model` | COMBO | Yes | `"latest"` | Specifies the AI model version to use. |
| `images` | IMAGE | Yes | 2 to 4 images | A set of images used to generate the 3D model. You must provide between 2 and 4 images. |
| `should_remesh` | COMBO | Yes | `"true"`<br>`"false"` | Determines if the generated mesh should be processed. When set to `"false"`, the node returns an unprocessed triangular mesh. |
| `topology` | COMBO | No | `"triangle"`<br>`"quad"` | The target polygon type for the remeshed output. This parameter is only available and required when `should_remesh` is set to `"true"`. |
| `target_polycount` | INT | No | 100 to 300000 | The target number of polygons for the remeshed model (default: 300000). This parameter is only available when `should_remesh` is set to `"true"`. |
| `symmetry_mode` | COMBO | Yes | `"auto"`<br>`"on"`<br>`"off"` | Controls whether symmetry is applied to the generated model. |
| `should_texture` | COMBO | Yes | `"true"`<br>`"false"` | Determines whether textures are generated. Setting it to `"false"` skips the texture phase and returns a mesh without textures. |
| `enable_pbr` | BOOLEAN | No | `True` / `False` | When `should_texture` is `"true"`, this option generates PBR Maps (metallic, roughness, normal) in addition to the base color (default: `False`). |
| `texture_prompt` | STRING | No | - | A text prompt to guide the texturing process (maximum 600 characters). Cannot be used at the same time as `texture_image`. This parameter is only available when `should_texture` is set to `"true"`. |
| `texture_image` | IMAGE | No | - | An image to guide the texturing process. Only one of `texture_image` or `texture_prompt` may be used at the same time. This parameter is only available when `should_texture` is set to `"true"`. |
| `pose_mode` | COMBO | Yes | `""`<br>`"A-pose"`<br>`"T-pose"` | Specifies the pose mode for the generated model. |
| `seed` | INT | Yes | 0 to 2147483647 | A seed value for the generation process (default: 0). Results are non-deterministic regardless of the seed, but changing the seed can trigger the node to re-run. |

**Parameter Constraints:**

* You must provide between 2 and 4 images for the `images` input.
* The `topology` and `target_polycount` parameters are only active when `should_remesh` is set to `"true"`.
* The `enable_pbr`, `texture_prompt`, and `texture_image` parameters are only active when `should_texture` is set to `"true"`.
* You cannot use `texture_prompt` and `texture_image` at the same time; they are mutually exclusive.

## Outputs

| Output Name | Data Type | Description |
| :--- | :--- | :--- |
| `model_file` | STRING | The filename of the generated GLB model. This output is provided for backward compatibility. |
| `meshy_task_id` | MESHY_TASK_ID | The unique identifier for the Meshy API task. |
| `GLB` | FILE3DGLB | The generated 3D model in GLB format. |
| `FBX` | FILE3DFBX | The generated 3D model in FBX format. |

**Source**: `comfy_api_nodes/nodes_meshy.py`

**Used in 1 template(s)**
