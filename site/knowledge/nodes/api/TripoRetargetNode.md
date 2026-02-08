# TripoRetargetNode

**Category**: api node/3d/Tripo

**Display Name**: Tripo: Retarget rigged model

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/TripoRetargetNode/en.md)

The TripoRetargetNode applies predefined animations to 3D character models by retargeting motion data. It takes a previously processed 3D model and applies one of several preset animations, generating an animated 3D model file as output. The node communicates with the Tripo API to process the animation retargeting operation.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `original_model_task_id` | RIG_TASK_ID | Yes | - | The task ID of the previously processed 3D model to apply animation to |
| `animation` | STRING | Yes | "preset:idle"<br>"preset:walk"<br>"preset:climb"<br>"preset:jump"<br>"preset:slash"<br>"preset:shoot"<br>"preset:hurt"<br>"preset:fall"<br>"preset:turn" | The animation preset to apply to the 3D model |
| `auth_token` | AUTH_TOKEN_COMFY_ORG | No | - | Authentication token for Comfy.org API access |
| `comfy_api_key` | API_KEY_COMFY_ORG | No | - | API key for Comfy.org service access |
| `unique_id` | UNIQUE_ID | No | - | Unique identifier for tracking the operation |

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `model_file` | STRING | The generated animated 3D model file |
| `retarget task_id` | RETARGET_TASK_ID | The task ID for tracking the retargeting operation |

**Source**: `comfy_api_nodes/nodes_tripo.py`

**Used in 3 template(s)**
