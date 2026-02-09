# KlingImageToVideoWithAudio

**Category**: api node/video/Kling

**Display Name**: Kling Image(First Frame) to Video with Audio

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/KlingImageToVideoWithAudio/en.md)

The Kling Image(First Frame) to Video with Audio node uses the Kling AI model to generate a short video from a single starting image and a text prompt. It creates a video sequence that begins with the provided image and can optionally include AI-generated audio to accompany the visuals.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `model_name` | COMBO | Yes | `"kling-v2-6"` | The specific version of the Kling AI model to use for video generation. |
| `start_frame` | IMAGE | Yes | - | The image that will serve as the first frame of the generated video. The image must be at least 300x300 pixels and have an aspect ratio between 1:2.5 and 2.5:1. |
| `prompt` | STRING | Yes | - | Positive text prompt. This describes the video content you want to generate. The prompt must be between 1 and 2500 characters long. |
| `mode` | COMBO | Yes | `"pro"` | The operational mode for the video generation. |
| `duration` | COMBO | Yes | `5`<br>`10` | The length of the video to generate, in seconds. |
| `generate_audio` | BOOLEAN | No | - | When enabled, the node will generate audio to accompany the video. When disabled, the video will be silent. (default: True) |

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `video` | VIDEO | The generated video file, which may include audio depending on the `generate_audio` input. |

**Source**: `comfy_api_nodes/nodes_kling.py`

**Used in 1 template(s)**
