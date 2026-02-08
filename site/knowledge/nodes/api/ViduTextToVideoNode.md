# ViduTextToVideoNode

**Category**: api node/video/Vidu

**Display Name**: Vidu Text To Video Generation

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/ViduTextToVideoNode/en.md)

The Vidu Text To Video Generation node creates videos from text descriptions. It uses various video generation models to transform your text prompts into video content with customizable settings for duration, aspect ratio, and visual style.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `model` | COMBO | Yes | `vidu_q1`<br>*Other VideoModelName options* | Model name (default: vidu_q1) |
| `prompt` | STRING | Yes | - | A textual description for video generation |
| `duration` | INT | No | 5-5 | Duration of the output video in seconds (default: 5) |
| `seed` | INT | No | 0-2147483647 | Seed for video generation (0 for random) (default: 0) |
| `aspect_ratio` | COMBO | No | `r_16_9`<br>*Other AspectRatio options* | The aspect ratio of the output video (default: r_16_9) |
| `resolution` | COMBO | No | `r_1080p`<br>*Other Resolution options* | Supported values may vary by model & duration (default: r_1080p) |
| `movement_amplitude` | COMBO | No | `auto`<br>*Other MovementAmplitude options* | The movement amplitude of objects in the frame (default: auto) |

**Note:** The `prompt` field is required and cannot be empty. The `duration` parameter is currently fixed at 5 seconds.

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `output` | VIDEO | The generated video based on the text prompt |

**Source**: `comfy_api_nodes/nodes_vidu.py`

**Used in 1 template(s)**
