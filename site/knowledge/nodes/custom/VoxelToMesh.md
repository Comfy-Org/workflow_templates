# VoxelToMesh

**Category**: 3d

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/VoxelToMesh/en.md)

The VoxelToMesh node converts 3D voxel data into mesh geometry using different algorithms. It processes voxel grids and generates vertices and faces that form a 3D mesh representation. The node supports multiple conversion algorithms and allows adjusting the threshold value to control the surface extraction.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `voxel` | VOXEL | Yes | - | The input voxel data to convert to mesh geometry |
| `algorithm` | COMBO | Yes | "surface net"<br>"basic" | The algorithm used for mesh conversion from voxel data |
| `threshold` | FLOAT | Yes | -1.0 to 1.0 | The threshold value for surface extraction (default: 0.6) |

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `MESH` | MESH | The generated 3D mesh containing vertices and faces |

**Source**: `comfy_extras/nodes_hunyuan3d.py`

**Used in 4 template(s)**
