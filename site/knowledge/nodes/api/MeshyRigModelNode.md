# MeshyRigModelNode

**Category**: api node/3d/Meshy

**Display Name**: Meshy: Rig Model

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/MeshyRigModelNode/en.md)

The Meshy: Rig Model node takes a 3D model task from Meshy and generates a rigged character model. It automatically creates a skeleton for the model, allowing it to be posed and animated. The node outputs the rigged model in both GLB and FBX file formats.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `meshy_task_id` | STRING | Yes | N/A | The unique task ID from a previous Meshy operation (e.g., text-to-3D or image-to-3D) that generated the model to be rigged. |
| `height_meters` | FLOAT | Yes | 0.1 to 15.0 | The approximate height of the character model in meters. This aids in scaling and rigging accuracy (default: 1.7). |
| `texture_image` | IMAGE | No | N/A | The model's UV-unwrapped base color texture image. |

**Note:** The auto-rigging process is currently not suitable for untextured meshes, non-humanoid assets, or humanoid assets with unclear limb and body structure.

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `model_file` | STRING | A legacy output for backward compatibility, containing the filename of the GLB model. |
| `rig_task_id` | STRING | The unique task ID for this rigging operation, which can be used to reference the result. |
| `GLB` | FILE3DGLB | The rigged 3D character model saved in the GLB file format. |
| `FBX` | FILE3DFBX | The rigged 3D character model saved in the FBX file format. |

**Source**: `comfy_api_nodes/nodes_meshy.py`

**Used in 3 template(s)**
