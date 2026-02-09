# Vidu3ImageToVideoNode

**Category**: api node/video/Vidu

**Display Name**: Vidu Q3 Image-to-Video Generation

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/Vidu3ImageToVideoNode/en.md)

The Vidu Q3 Image-to-Video Generation node creates a video sequence starting from an input image. It uses the Vidu Q3 Pro model to animate the image, optionally guided by a text prompt, and outputs a video file.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `model` | COMBO | Yes | `"viduq3-pro"` | Model to use for video generation. |
| `model.resolution` | COMBO | Yes | `"720p"`<br>`"1080p"`<br>`"2K"` | Resolution of the output video. |
| `model.duration` | INT | Yes | 1 to 16 | Duration of the output video in seconds (default: 5). |
| `model.audio` | BOOLEAN | Yes | `True` / `False` | When enabled, outputs video with sound (including dialogue and sound effects) (default: False). |
| `image` | IMAGE | Yes | - | An image to be used as the start frame of the generated video. |
| `prompt` | STRING | No | - | An optional text prompt for video generation (max 2000 characters) (default: empty). |
| `seed` | INT | No | 0 to 2147483647 | A seed value for controlling the randomness of the generation (default: 1). |

**Note:** The `image` must have an aspect ratio between 1:4 and 4:1 (portrait to landscape). The `prompt` is optional but cannot exceed 2000 characters.

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `output` | VIDEO | The generated video file. |

**Source**: `comfy_api_nodes/nodes_vidu.py`

**Used in 1 template(s)**
