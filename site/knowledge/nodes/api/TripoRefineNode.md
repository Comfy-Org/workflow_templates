# TripoRefineNode

**Category**: api node/3d/Tripo

**Display Name**: Tripo: Refine Draft model

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/TripoRefineNode/en.md)

The TripoRefineNode refines draft 3D models created specifically by v1.4 Tripo models. It takes a model task ID and processes it through the Tripo API to generate an improved version of the model. This node is designed to work exclusively with draft models produced by Tripo v1.4 models.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `model_task_id` | MODEL_TASK_ID | Yes | - | Must be a v1.4 Tripo model |
| `auth_token` | AUTH_TOKEN_COMFY_ORG | No | - | Authentication token for Comfy.org API |
| `comfy_api_key` | API_KEY_COMFY_ORG | No | - | API key for Comfy.org services |
| `unique_id` | UNIQUE_ID | No | - | Unique identifier for the operation |

**Note:** This node only accepts draft models created by Tripo v1.4 models. Using models from other versions may result in errors.

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `model_file` | STRING | The file path or reference to the refined model |
| `model task_id` | MODEL_TASK_ID | The task identifier for the refined model operation |

**Source**: `comfy_api_nodes/nodes_tripo.py`

**Used in 2 template(s)**
