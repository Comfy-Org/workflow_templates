# KlingImage2VideoNode

**Category**: api node/video/Kling

**Display Name**: Kling Image(First Frame) to Video

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/KlingImage2VideoNode/en.md)

The Kling Image to Video Node generates video content from a starting image using text prompts. It takes a reference image and creates a video sequence based on the provided positive and negative text descriptions, with various configuration options for model selection, duration, and aspect ratio.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `start_frame` | IMAGE | Yes | - | The reference image used to generate the video. |
| `prompt` | STRING | Yes | - | Positive text prompt. |
| `negative_prompt` | STRING | Yes | - | Negative text prompt. |
| `model_name` | COMBO | Yes | Multiple options available | Model selection for video generation (default: "kling-v2-master"). |
| `cfg_scale` | FLOAT | Yes | 0.0-1.0 | Configuration scale parameter (default: 0.8). |
| `mode` | COMBO | Yes | Multiple options available | Video generation mode selection (default: std). |
| `aspect_ratio` | COMBO | Yes | Multiple options available | Aspect ratio for the generated video (default: field_16_9). |
| `duration` | COMBO | Yes | Multiple options available | Duration of the generated video (default: field_5). |

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `output` | VIDEO | The generated video output. |
| `video_id` | STRING | Unique identifier for the generated video. |
| `duration` | STRING | Duration information for the generated video. |

**Source**: `comfy_api_nodes/nodes_kling.py`

**Used in 1 template(s)**
