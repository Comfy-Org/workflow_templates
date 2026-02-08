# KlingOmniProTextToVideoNode

**Category**: api node/video/Kling

**Display Name**: Kling Omni Text to Video (Pro)

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/KlingOmniProTextToVideoNode/en.md)

This node uses the Kling AI model to generate a video from a text description. It sends your prompt to a remote API and returns the generated video. The node allows you to control the video's length, shape, and quality.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `model_name` | COMBO | Yes | `"kling-video-o1"` | The specific Kling model to use for video generation. |
| `prompt` | STRING | Yes | 1 to 2500 characters | A text prompt describing the video content. This can include both positive and negative descriptions. |
| `aspect_ratio` | COMBO | Yes | `"16:9"`<br>`"9:16"`<br>`"1:1"` | The shape or dimensions of the video to generate. |
| `duration` | COMBO | Yes | `5`<br>`10` | The length of the video in seconds. |
| `resolution` | COMBO | No | `"1080p"`<br>`"720p"` | The quality or pixel resolution of the video (default: `"1080p"`). |

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `output` | VIDEO | The video generated based on the provided text prompt. |

**Source**: `comfy_api_nodes/nodes_kling.py`

**Used in 1 template(s)**
