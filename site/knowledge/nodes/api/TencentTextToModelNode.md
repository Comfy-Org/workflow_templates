# TencentTextToModelNode

**Category**: api node/3d/Tencent

**Display Name**: Hunyuan3D: Text to Model (Pro)

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/TencentTextToModelNode/en.md)

This node uses Tencent's Hunyuan3D Pro API to generate a 3D model from a text description. It sends a request to create a generation task, polls for the result, and downloads the final model files in GLB and OBJ formats.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `model` | COMBO | Yes | `"3.0"`<br>`"3.1"` | The version of the Hunyuan3D model to use. The LowPoly option is unavailable for the `3.1` model. |
| `prompt` | STRING | Yes | - | The text description of the 3D model to generate. Supports up to 1024 characters. |
| `face_count` | INT | Yes | 40000 - 1500000 | The target number of faces for the generated 3D model. Default: 500000. |
| `generate_type` | DYNAMICCOMBO | Yes | `"Normal"`<br>`"LowPoly"`<br>`"Geometry"` | The type of 3D model to generate. The available options and their associated parameters are:<br>- **Normal**: Generates a standard model. Includes a `pbr` parameter (default: `False`).<br>- **LowPoly**: Generates a low-polygon model. Includes `polygon_type` (`"triangle"` or `"quadrilateral"`) and `pbr` (default: `False`) parameters.<br>- **Geometry**: Generates a geometry-only model. |
| `seed` | INT | No | 0 - 2147483647 | A seed value for the generation. Results are non-deterministic regardless of seed. Setting a new seed controls whether the node should re-run. Default: 0. |

**Note:** The `generate_type` parameter is dynamic. Selecting `"LowPoly"` will reveal additional inputs for `polygon_type` and `pbr`. Selecting `"Normal"` will reveal an input for `pbr`. Selecting `"Geometry"` will not reveal any additional inputs.

**Constraint:** The `"LowPoly"` generate type cannot be used with the `"3.1"` model.

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `model_file` | STRING | A legacy output for backward compatibility. |
| `GLB` | FILE3DGLB | The generated 3D model in the GLB file format. |
| `OBJ` | FILE3DOBJ | The generated 3D model in the OBJ file format. |

**Source**: `comfy_api_nodes/nodes_hunyuan3d.py`

**Used in 1 template(s)**
