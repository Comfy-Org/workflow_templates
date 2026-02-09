# MeshyTextToModelNode

**Category**: api node/3d/Meshy

**Display Name**: Meshy: Text to Model

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/MeshyTextToModelNode/en.md)

The Meshy: Text to Model node uses the Meshy API to generate a 3D model from a text description. It sends a request to the API with your prompt and settings, then waits for the generation to complete and downloads the resulting model files.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `model` | COMBO | Yes | `"latest"` | Specifies the AI model version to use. Currently, only the "latest" version is available. |
| `prompt` | STRING | Yes | - | The text description of the 3D model you want to generate. Must be between 1 and 600 characters long. |
| `style` | COMBO | Yes | `"realistic"`<br>`"sculpture"` | The artistic style for the generated 3D model. |
| `should_remesh` | DYNAMIC COMBO | Yes | `"true"`<br>`"false"` | Controls whether the generated mesh is processed. When set to "false", the node returns an unprocessed triangular mesh. Selecting "true" reveals additional parameters for topology and polycount. |
| `topology` | COMBO | No* | `"triangle"`<br>`"quad"` | The target polygon type for the remeshed model. This parameter is only available and required when `should_remesh` is set to "true". |
| `target_polycount` | INT | No* | 100 - 300000 | The target number of polygons for the remeshed model. Default is 300000. This parameter is only available and required when `should_remesh` is set to "true". |
| `symmetry_mode` | COMBO | Yes | `"auto"`<br>`"on"`<br>`"off"` | Controls symmetry in the generated model. |
| `pose_mode` | COMBO | Yes | `""`<br>`"A-pose"`<br>`"T-pose"` | Specifies the pose mode for the generated model. An empty string means no specific pose is requested. |
| `seed` | INT | Yes | 0 - 2147483647 | A seed value for generation. Setting this controls whether the node should re-run, but results are non-deterministic regardless of the seed value. Default is 0. |

*Note: The `topology` and `target_polycount` parameters are conditionally required. They only appear and must be set when the `should_remesh` parameter is set to "true".

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `model_file` | STRING | The filename of the generated GLB model. This output is provided for backward compatibility. |
| `meshy_task_id` | MESHY_TASK_ID | The unique identifier for the Meshy API task. |
| `GLB` | FILE3DGLB | The generated 3D model file in GLB format. |
| `FBX` | FILE3DFBX | The generated 3D model file in FBX format. |

**Source**: `comfy_api_nodes/nodes_meshy.py`

**Used in 1 template(s)**
