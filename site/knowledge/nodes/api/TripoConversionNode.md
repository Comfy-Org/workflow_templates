# TripoConversionNode

**Category**: api node/3d/Tripo

**Display Name**: Tripo: Convert model

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/TripoConversionNode/en.md)

The TripoConversionNode converts 3D models between different file formats using the Tripo API. It takes a task ID from a previous Tripo operation and converts the resulting model to your desired format with various export options.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `original_model_task_id` | MODEL_TASK_ID,RIG_TASK_ID,RETARGET_TASK_ID | Yes | MODEL_TASK_ID<br>RIG_TASK_ID<br>RETARGET_TASK_ID | The task ID from a previous Tripo operation (model generation, rigging, or retargeting) |
| `format` | COMBO | Yes | GLTF<br>USDZ<br>FBX<br>OBJ<br>STL<br>3MF | The target file format for the converted 3D model |
| `quad` | BOOLEAN | No | True/False | Whether to convert triangles to quads (default: False) |
| `face_limit` | INT | No | -1 to 500000 | Maximum number of faces in the output model, use -1 for no limit (default: -1) |
| `texture_size` | INT | No | 128 to 4096 | Size of output textures in pixels (default: 4096) |
| `texture_format` | COMBO | No | BMP<br>DPX<br>HDR<br>JPEG<br>OPEN_EXR<br>PNG<br>TARGA<br>TIFF<br>WEBP | Format for exported textures (default: JPEG) |

**Note:** The `original_model_task_id` must be a valid task ID from a previous Tripo operation (model generation, rigging, or retargeting).

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| *No named outputs* | - | This node processes the conversion asynchronously and returns the result through the Tripo API system |

**Source**: `comfy_api_nodes/nodes_tripo.py`

**Used in 2 template(s)**
