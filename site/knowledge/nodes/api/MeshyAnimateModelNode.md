# MeshyAnimateModelNode

**Category**: api node/3d/Meshy

**Display Name**: Meshy: Animate Model

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/MeshyAnimateModelNode/en.md)

This node applies a specific animation to a 3D character model that has already been rigged using the Meshy service. It takes a task ID from a previous rigging operation and an action ID to select the desired animation from the library. The node then processes the request and returns the animated model in both GLB and FBX file formats.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `rig_task_id` | STRING | Yes | N/A | The unique task ID from a previously completed Meshy character rigging operation. |
| `action_id` | INT | Yes | 0 to 696 | The ID number of the animation action to apply. Visit <https://docs.meshy.ai/en/api/animation-library> for a list of available values. (default: 0) |

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `model_file` | STRING | A string identifier for the animated model. This output is provided for backward compatibility only. |
| `GLB` | FILE3DGLB | The animated 3D model file in GLB format. |
| `FBX` | FILE3DFBX | The animated 3D model file in FBX format. |

**Source**: `comfy_api_nodes/nodes_meshy.py`

**Used in 3 template(s)**
