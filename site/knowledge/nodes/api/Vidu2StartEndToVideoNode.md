# Vidu2StartEndToVideoNode

**Category**: api node/video/Vidu

**Display Name**: Vidu2 Start/End Frame-to-Video Generation

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/Vidu2StartEndToVideoNode/en.md)

This node generates a video by interpolating between a provided start frame and an end frame, guided by a text prompt. It uses a specified Vidu model to create a smooth transition between the two images over a set duration.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `model` | COMBO | Yes | `"viduq2-pro-fast"`<br>`"viduq2-pro"`<br>`"viduq2-turbo"` | The Vidu model to use for video generation. |
| `first_frame` | IMAGE | Yes | - | The starting image for the video sequence. Only a single image is allowed. |
| `end_frame` | IMAGE | Yes | - | The ending image for the video sequence. Only a single image is allowed. |
| `prompt` | STRING | Yes | - | A text description guiding the video generation (maximum 2000 characters). |
| `duration` | INT | No | 2 to 8 | The length of the generated video in seconds (default: 5). |
| `seed` | INT | No | 0 to 2147483647 | A number used to initialize the random generation for reproducible results (default: 1). |
| `resolution` | COMBO | No | `"720p"`<br>`"1080p"` | The output resolution of the generated video. |
| `movement_amplitude` | COMBO | No | `"auto"`<br>`"small"`<br>`"medium"`<br>`"large"` | The movement amplitude of objects in the frame. |

**Note:** The `first_frame` and `end_frame` images must have similar aspect ratios. The node will validate that their aspect ratios are within a relative range of 0.8 to 1.25.

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `output` | VIDEO | The generated video file. |

**Source**: `comfy_api_nodes/nodes_vidu.py`

**Used in 1 template(s)**
