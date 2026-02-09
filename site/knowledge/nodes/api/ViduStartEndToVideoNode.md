# ViduStartEndToVideoNode

**Category**: api node/video/Vidu

**Display Name**: Vidu Start End To Video Generation

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/ViduStartEndToVideoNode/en.md)

The Vidu Start End To Video Generation node creates a video by generating frames between a starting frame and an ending frame. It uses a text prompt to guide the video generation process and supports various video models with different resolution and movement settings. The node validates that the start and end frames have compatible aspect ratios before processing.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `model` | COMBO | Yes | `"vidu_q1"`<br>[Other model values from VideoModelName enum] | Model name (default: "vidu_q1") |
| `first_frame` | IMAGE | Yes | - | Start frame |
| `end_frame` | IMAGE | Yes | - | End frame |
| `prompt` | STRING | No | - | A textual description for video generation |
| `duration` | INT | No | 5-5 | Duration of the output video in seconds (default: 5, fixed at 5 seconds) |
| `seed` | INT | No | 0-2147483647 | Seed for video generation (0 for random) (default: 0) |
| `resolution` | COMBO | No | `"1080p"`<br>[Other resolution values from Resolution enum] | Supported values may vary by model & duration (default: "1080p") |
| `movement_amplitude` | COMBO | No | `"auto"`<br>[Other movement amplitude values from MovementAmplitude enum] | The movement amplitude of objects in the frame (default: "auto") |

**Note:** The start and end frames must have compatible aspect ratios (validated with min_rel=0.8, max_rel=1.25 ratio tolerance).

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `output` | VIDEO | The generated video file |

**Source**: `comfy_api_nodes/nodes_vidu.py`

**Used in 1 template(s)**
