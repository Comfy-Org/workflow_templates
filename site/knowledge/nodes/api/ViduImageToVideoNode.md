# ViduImageToVideoNode

**Category**: api node/video/Vidu

**Display Name**: Vidu Image To Video Generation

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/ViduImageToVideoNode/en.md)

The Vidu Image To Video Generation node creates videos from a starting image and an optional text description. It uses AI models to generate video content that extends from the provided image frame. The node sends the image and parameters to an external service and returns the generated video.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `model` | COMBO | Yes | `vidu_q1`<br>*Other VideoModelName options* | Model name (default: vidu_q1) |
| `image` | IMAGE | Yes | - | An image to be used as the start frame of the generated video |
| `prompt` | STRING | No | - | A textual description for video generation (default: empty) |
| `duration` | INT | No | 5-5 | Duration of the output video in seconds (default: 5, fixed at 5 seconds) |
| `seed` | INT | No | 0-2147483647 | Seed for video generation (0 for random) (default: 0) |
| `resolution` | COMBO | No | `r_1080p`<br>*Other Resolution options* | Supported values may vary by model & duration (default: r_1080p) |
| `movement_amplitude` | COMBO | No | `auto`<br>*Other MovementAmplitude options* | The movement amplitude of objects in the frame (default: auto) |

**Constraints:**

- Only one input image is allowed (cannot process multiple images)
- The input image must have an aspect ratio between 1:4 and 4:1

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `output` | VIDEO | The generated video output |

**Source**: `comfy_api_nodes/nodes_vidu.py`

**Used in 1 template(s)**
