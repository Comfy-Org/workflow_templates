# ByteDanceFirstLastFrameNode

**Category**: api node/video/ByteDance

**Display Name**: ByteDance First-Last-Frame to Video

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/ByteDanceFirstLastFrameNode/en.md)

This node generates a video using a text prompt along with first and last frame images. It takes your description and the two key frames to create a complete video sequence that transitions between them. The node provides various options to control the video's resolution, aspect ratio, duration, and other generation parameters.

## Inputs

| Parameter | Data Type | Input Type | Default | Range | Description |
|-----------|-----------|------------|---------|-------|-------------|
| `model` | COMBO | combo | seedance_1_lite | seedance_1_lite | Model name |
| `prompt` | STRING | string | - | - | The text prompt used to generate the video. |
| `first_frame` | IMAGE | image | - | - | First frame to be used for the video. |
| `last_frame` | IMAGE | image | - | - | Last frame to be used for the video. |
| `resolution` | COMBO | combo | - | 480p, 720p, 1080p | The resolution of the output video. |
| `aspect_ratio` | COMBO | combo | - | adaptive, 16:9, 4:3, 1:1, 3:4, 9:16, 21:9 | The aspect ratio of the output video. |
| `duration` | INT | slider | 5 | 3-12 | The duration of the output video in seconds. |
| `seed` | INT | number | 0 | 0-2147483647 | Seed to use for generation. (optional) |
| `camera_fixed` | BOOLEAN | boolean | False | - | Specifies whether to fix the camera. The platform appends an instruction to fix the camera to your prompt, but does not guarantee the actual effect. (optional) |
| `watermark` | BOOLEAN | boolean | True | - | Whether to add an "AI generated" watermark to the video. (optional) |

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `output` | VIDEO | The generated video file |

**Source**: `comfy_api_nodes/nodes_bytedance.py`

**Used in 4 template(s)**
