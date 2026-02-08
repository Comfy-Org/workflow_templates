# KlingOmniProImageToVideoNode

**Category**: api node/video/Kling

**Display Name**: Kling Omni Image to Video (Pro)

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/KlingOmniProImageToVideoNode/en.md)

This node uses the Kling AI model to generate a video based on a text prompt and up to seven reference images. It allows you to control the video's aspect ratio, duration, and resolution. The node sends the request to an external API and returns the generated video.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `model_name` | COMBO | Yes | `"kling-video-o1"` | The specific Kling model to use for video generation. |
| `prompt` | STRING | Yes | - | A text prompt describing the video content. This can include both positive and negative descriptions. The text is automatically normalized and must be between 1 and 2500 characters. |
| `aspect_ratio` | COMBO | Yes | `"16:9"`<br>`"9:16"`<br>`"1:1"` | The desired aspect ratio for the generated video. |
| `duration` | INT | Yes | 3 to 10 | The length of the video in seconds. The value can be adjusted with a slider (default: 3). |
| `reference_images` | IMAGE | Yes | - | Up to 7 reference images. Each image must be at least 300x300 pixels and have an aspect ratio between 1:2.5 and 2.5:1. |
| `resolution` | COMBO | No | `"1080p"`<br>`"720p"` | The output resolution of the video. This parameter is optional (default: "1080p"). |

**Note:** The `reference_images` input accepts a maximum of 7 images. If more are provided, the node will raise an error. Each image is validated for minimum dimensions and aspect ratio.

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `output` | VIDEO | The generated video file. |

**Source**: `comfy_api_nodes/nodes_kling.py`

**Used in 1 template(s)**
