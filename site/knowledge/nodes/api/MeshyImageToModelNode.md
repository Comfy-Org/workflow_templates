# MeshyImageToModelNode

**Category**: api node/3d/Meshy

**Display Name**: Meshy: Image to Model

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/MeshyImageToModelNode/en.md)

The Meshy: Image to Model node uses the Meshy API to generate a 3D model from a single input image. It uploads your image, submits a processing task, and returns the generated 3D model files (GLB and FBX) along with the task ID for reference.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `model` | COMBO | Yes | `"latest"` | Specifies the AI model version to use for generation. |
| `image` | IMAGE | Yes | - | The input image to convert into a 3D model. |
| `should_remesh` | DYNAMIC COMBO | Yes | `"true"`<br>`"false"` | Determines if the generated mesh should be processed. When set to `"false"`, the node returns an unprocessed triangular mesh. |
| `topology` | COMBO | No* | `"triangle"`<br>`"quad"` | The target polygon topology for the remeshed model. This input is only available and required when `should_remesh` is set to `"true"`. |
| `target_polycount` | INT | No* | 100 - 300000 | The target number of polygons for the remeshed model. This input is only available and required when `should_remesh` is set to `"true"`. The default value is 300000. |
| `symmetry_mode` | COMBO | Yes | `"auto"`<br>`"on"`<br>`"off"` | Controls the symmetry applied to the generated 3D model. |
| `should_texture` | DYNAMIC COMBO | Yes | `"true"`<br>`"false"` | Determines whether textures are generated for the model. Setting it to `"false"` skips the texture phase and returns a mesh without textures. |
| `enable_pbr` | BOOLEAN | No* | - | When `should_texture` is `"true"`, this option generates PBR maps (metallic, roughness, normal) in addition to the base color. The default value is `False`. |
| `texture_prompt` | STRING | No* | - | A text prompt to guide the texturing process (maximum 600 characters). This input is only available when `should_texture` is `"true"`. It cannot be used at the same time as `texture_image`. |
| `texture_image` | IMAGE | No* | - | An image to guide the texturing process. This input is only available when `should_texture` is `"true"`. It cannot be used at the same time as `texture_prompt`. |
| `pose_mode` | COMBO | Yes | `""`<br>`"A-pose"`<br>`"T-pose"` | Specifies the pose mode for the generated model. |
| `seed` | INT | Yes | 0 - 2147483647 | A seed value for the generation process. The results are non-deterministic regardless of the seed value. The default value is 0. |

**Note on Parameter Constraints:**

* The `topology` and `target_polycount` inputs are only required when `should_remesh` is set to `"true"`.
* The `enable_pbr`, `texture_prompt`, and `texture_image` inputs are only available when `should_texture` is set to `"true"`.
* You cannot use `texture_prompt` and `texture_image` at the same time. If both are provided when `should_texture` is `"true"`, the node will raise an error.

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `model_file` | STRING | The filename of the generated GLB model. (Maintained for backward compatibility). |
| `meshy_task_id` | MESHY_TASK_ID | The unique identifier for the Meshy API task, which can be used for reference or troubleshooting. |
| `GLB` | FILE3DGLB | The generated 3D model in the GLB file format. |
| `FBX` | FILE3DFBX | The generated 3D model in the FBX file format. |

**Source**: `comfy_api_nodes/nodes_meshy.py`

**Used in 1 template(s)**
