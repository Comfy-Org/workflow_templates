# ViduExtendVideoNode

**Category**: api node/video/Vidu

**Display Name**: Vidu Video Extension

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/ViduExtendVideoNode/en.md)

The ViduExtendVideoNode generates additional frames to extend the length of an existing video. It uses a specified AI model to create a seamless continuation based on the source video and an optional text prompt.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `model` | COMBO | Yes | `"viduq2-pro"`<br>`"viduq2-turbo"` | The AI model to use for video extension. Selecting a model reveals its specific duration and resolution settings. |
| `model.duration` | INT | Yes | 1 to 7 | The duration of the extended video in seconds (default: 4). This setting appears after selecting a model. |
| `model.resolution` | COMBO | Yes | `"720p"`<br>`"1080p"` | The resolution of the output video. This setting appears after selecting a model. |
| `video` | VIDEO | Yes | - | The source video to extend. |
| `prompt` | STRING | No | - | An optional text prompt to guide the content of the extended video (max 2000 characters, default: empty). |
| `seed` | INT | No | 0 to 2147483647 | A seed value for controlling the randomness of the generation (default: 1). |
| `end_frame` | IMAGE | No | - | An optional image to use as the target end frame for the extension. If provided, its aspect ratio must be between 1:4 and 4:1, and its dimensions must be at least 128x128 pixels. |

**Note:** The source `video` must have a duration between 4 and 55 seconds.

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `output` | VIDEO | The newly generated video file containing the extended footage. |

**Source**: `comfy_api_nodes/nodes_vidu.py`

**Used in 1 template(s)**
