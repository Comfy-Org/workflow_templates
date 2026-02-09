# SaveGLB

**Category**: 3d

**Display Name**: Save 3D Model

**Also known as**: export 3d model, save mesh

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/SaveGLB/en.md)

The SaveGLB node saves 3D mesh data as GLB files, which is a common format for 3D models. It takes mesh data as input and exports it to the output directory with the specified filename prefix. The node can save multiple meshes if the input contains multiple mesh objects, and it automatically adds metadata to the files when metadata is enabled.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `mesh` | MESH | Yes | - | The 3D mesh data to be saved as a GLB file |
| `filename_prefix` | STRING | No | - | The prefix for the output filename (default: "mesh/ComfyUI") |

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `ui` | UI | Displays the saved GLB files in the user interface with filename and subfolder information |

**Source**: `comfy_extras/nodes_hunyuan3d.py`

**Used in 5 template(s)**
