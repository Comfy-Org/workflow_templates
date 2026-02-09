# ByteDanceImageToVideoNode

**Category**: api node/video/ByteDance

**Display Name**: ByteDance Image to Video

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/ByteDanceImageToVideoNode/en.md)

The ByteDance Image to Video node generates videos using ByteDance models through an API based on an input image and text prompt. It takes a starting image frame and creates a video sequence that follows the provided description. The node offers various customization options for video resolution, aspect ratio, duration, and other generation parameters.

## Inputs

| Parameter | Data Type | Input Type | Default | Range | Description |
|-----------|-----------|------------|---------|-------|-------------|
| `model` | STRING | COMBO | seedance_1_pro | Image2VideoModelName options | Model name |
| `prompt` | STRING | STRING | - | - | The text prompt used to generate the video. |
| `image` | IMAGE | IMAGE | - | - | First frame to be used for the video. |
| `resolution` | STRING | COMBO | - | ["480p", "720p", "1080p"] | The resolution of the output video. |
| `aspect_ratio` | STRING | COMBO | - | ["adaptive", "16:9", "4:3", "1:1", "3:4", "9:16", "21:9"] | The aspect ratio of the output video. |
| `duration` | INT | INT | 5 | 3-12 | The duration of the output video in seconds. |
| `seed` | INT | INT | 0 | 0-2147483647 | Seed to use for generation. |
| `camera_fixed` | BOOLEAN | BOOLEAN | False | - | Specifies whether to fix the camera. The platform appends an instruction to fix the camera to your prompt, but does not guarantee the actual effect. |
| `watermark` | BOOLEAN | BOOLEAN | True | - | Whether to add an "AI generated" watermark to the video. |

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `output` | VIDEO | The generated video file based on the input image and prompt parameters. |

**Source**: `comfy_api_nodes/nodes_bytedance.py`

**Used in 3 template(s)**
