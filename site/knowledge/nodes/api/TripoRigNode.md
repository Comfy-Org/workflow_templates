# TripoRigNode

**Category**: api node/3d/Tripo

**Display Name**: Tripo: Rig model

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/TripoRigNode/en.md)

The TripoRigNode generates a rigged 3D model from an original model task ID. It sends a request to the Tripo API to create an animated rig in GLB format using the Tripo specification, then polls the API until the rig generation task is complete.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `original_model_task_id` | MODEL_TASK_ID | Yes | - | The task ID of the original 3D model to be rigged |
| `auth_token` | AUTH_TOKEN_COMFY_ORG | No | - | Authentication token for Comfy.org API access |
| `comfy_api_key` | API_KEY_COMFY_ORG | No | - | API key for Comfy.org service authentication |
| `unique_id` | UNIQUE_ID | No | - | Unique identifier for tracking the operation |

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `model_file` | STRING | The generated rigged 3D model file |
| `rig task_id` | RIG_TASK_ID | The task ID for tracking the rig generation process |

**Source**: `comfy_api_nodes/nodes_tripo.py`

**Used in 3 template(s)**
