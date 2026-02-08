# ViduReferenceVideoNode

**Category**: api node/video/Vidu

**Display Name**: Vidu Reference To Video Generation

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/ViduReferenceVideoNode/en.md)

The Vidu Reference Video Node generates videos from multiple reference images and a text prompt. It uses AI models to create consistent video content based on the provided images and description. The node supports various video settings including duration, aspect ratio, resolution, and movement control.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `model` | COMBO | Yes | `"vidu_q1"` | Model name for video generation (default: "vidu_q1") |
| `images` | IMAGE | Yes | - | Images to use as references to generate a video with consistent subjects (maximum 7 images) |
| `prompt` | STRING | Yes | - | A textual description for video generation |
| `duration` | INT | No | 5-5 | Duration of the output video in seconds (default: 5) |
| `seed` | INT | No | 0-2147483647 | Seed for video generation (0 for random) (default: 0) |
| `aspect_ratio` | COMBO | No | `"16:9"`<br>`"9:16"`<br>`"1:1"`<br>`"4:3"`<br>`"3:4"`<br>`"21:9"`<br>`"9:21"` | The aspect ratio of the output video (default: "16:9") |
| `resolution` | COMBO | No | `"480p"`<br>`"720p"`<br>`"1080p"`<br>`"1440p"`<br>`"2160p"` | Supported values may vary by model & duration (default: "1080p") |
| `movement_amplitude` | COMBO | No | `"auto"`<br>`"low"`<br>`"medium"`<br>`"high"` | The movement amplitude of objects in the frame (default: "auto") |

**Constraints and Limitations:**

- The `prompt` field is required and cannot be empty
- Maximum of 7 images allowed for reference
- Each image must have an aspect ratio between 1:4 and 4:1
- Each image must have minimum dimensions of 128x128 pixels
- Duration is fixed at 5 seconds

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `output` | VIDEO | The generated video based on the reference images and prompt |

**Source**: `comfy_api_nodes/nodes_vidu.py`

**Used in 1 template(s)**
