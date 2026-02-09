# TencentImageToModelNode

**Category**: api node/3d/Tencent

**Display Name**: Hunyuan3D: Image(s) to Model (Pro)

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/TencentImageToModelNode/en.md)

This node uses Tencent's Hunyuan3D Pro API to generate a 3D model from one or more input images. It processes the images, sends them to the API, and returns the generated 3D model files in GLB and OBJ formats.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `model` | COMBO | Yes | `"3.0"`<br>`"3.1"` | The version of the Hunyuan3D model to use. The LowPoly option is unavailable for the `3.1` model. |
| `image` | IMAGE | Yes | - | The primary input image used to generate the 3D model. |
| `image_left` | IMAGE | No | - | An optional image of the object's left side for multi-view generation. |
| `image_right` | IMAGE | No | - | An optional image of the object's right side for multi-view generation. |
| `image_back` | IMAGE | No | - | An optional image of the object's back side for multi-view generation. |
| `face_count` | INT | Yes | 40000 - 1500000 | The target number of faces for the generated 3D model (default: 500000). |
| `generate_type` | DYNAMICCOMBO | Yes | `"Normal"`<br>`"LowPoly"`<br>`"Geometry"` | The type of 3D model to generate. Selecting an option reveals additional related parameters. |
| `generate_type.pbr` | BOOLEAN | No | - | Enables Physically Based Rendering (PBR) material generation. This parameter is only visible when `generate_type` is set to "Normal" or "LowPoly" (default: False). |
| `generate_type.polygon_type` | COMBO | No | `"triangle"`<br>`"quadrilateral"` | The type of polygon to use for the mesh. This parameter is only visible when `generate_type` is set to "LowPoly". |
| `seed` | INT | Yes | 0 - 2147483647 | A seed value for the generation process. Seed controls whether the node should re-run; results are non-deterministic regardless of seed (default: 0). |

**Note:** All input images must have a minimum width and height of 128 pixels.

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `model_file` | STRING | A legacy output for backward compatibility. |
| `GLB` | FILE3DGLB | The generated 3D model in the GLB (Binary GL Transmission Format) file format. |
| `OBJ` | FILE3DOBJ | The generated 3D model in the OBJ (Wavefront) file format. |

**Source**: `comfy_api_nodes/nodes_hunyuan3d.py`

**Used in 1 template(s)**
