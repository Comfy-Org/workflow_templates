# WanCameraEmbedding

**Category**: camera

**Display Name**: camera_embedding

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/WanCameraEmbedding/en.md)

The WanCameraEmbedding node generates camera trajectory embeddings using Plücker embeddings based on camera motion parameters. It creates a sequence of camera poses that simulate different camera movements and converts them into embedding tensors suitable for video generation pipelines.

## Inputs

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| camera_pose | Combo | — |  |
| width | Int | 832 |  |
| height | Int | 480 |  |
| length | Int | 81 |  |
| speed | Float | 1.0 |  |
| fx | Float | 0.5 |  |
| fy | Float | 0.5 |  |
| cx | Float | 0.5 |  |
| cy | Float | 0.5 |  |

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `camera_embedding` | TENSOR | The generated camera embedding tensor containing the trajectory sequence |
| `width` | INT | The width value that was used for processing |
| `height` | INT | The height value that was used for processing |
| `length` | INT | The length value that was used for processing |

**Source**: `comfy_extras/nodes_camera_trajectory.py`

**Used in 3 template(s)**
