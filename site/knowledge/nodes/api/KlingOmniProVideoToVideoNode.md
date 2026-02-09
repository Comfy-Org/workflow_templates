# KlingOmniProVideoToVideoNode

**Category**: api node/video/Kling

**Display Name**: Kling Omni Video to Video (Pro)

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/KlingOmniProVideoToVideoNode/en.md)

This node uses the Kling AI model to generate a new video based on an input video and optional reference images. You provide a text prompt describing the desired content, and the node transforms the reference video accordingly. It can also incorporate up to four additional reference images to guide the style and content of the output.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `model_name` | COMBO | Yes | `"kling-video-o1"` | The specific Kling model to use for video generation. |
| `prompt` | STRING | Yes | N/A | A text prompt describing the video content. This can include both positive and negative descriptions. |
| `aspect_ratio` | COMBO | Yes | `"16:9"`<br>`"9:16"`<br>`"1:1"` | The desired aspect ratio for the generated video. |
| `duration` | INT | Yes | 3 to 10 | The length of the generated video in seconds (default: 3). |
| `reference_video` | VIDEO | Yes | N/A | Video to use as a reference. |
| `keep_original_sound` | BOOLEAN | Yes | N/A | Determines if the audio from the reference video is kept in the output (default: True). |
| `reference_images` | IMAGE | No | N/A | Up to 4 additional reference images. |
| `resolution` | COMBO | No | `"1080p"`<br>`"720p"` | The resolution for the generated video (default: "1080p"). |

**Parameter Constraints:**
*   The `prompt` must be between 1 and 2500 characters long.
*   The `reference_video` must be between 3.0 and 10.05 seconds in duration.
*   The `reference_video` must have dimensions between 720x720 and 2160x2160 pixels.
*   A maximum of 4 `reference_images` can be provided. Each image must be at least 300x300 pixels and have an aspect ratio between 1:2.5 and 2.5:1.

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `output` | VIDEO | The newly generated video. |

**Source**: `comfy_api_nodes/nodes_kling.py`

**Used in 1 template(s)**
