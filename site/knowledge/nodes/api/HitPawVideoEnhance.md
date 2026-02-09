# HitPawVideoEnhance

**Category**: api node/video/HitPaw

**Display Name**: HitPaw Video Enhance

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/HitPawVideoEnhance/en.md)

The HitPaw Video Enhance node uses an external API to improve the quality of videos. It upscales low-resolution videos to a higher resolution, removes visual artifacts, and reduces noise. The processing cost is calculated per second of the input video.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `model` | DYNAMIC COMBO | Yes | Multiple options available | The AI model to use for video enhancement. Selecting a model reveals a nested `resolution` parameter. |
| `model.resolution` | COMBO | Yes | `"original"`<br>`"720p"`<br>`"1080p"`<br>`"2k/qhd"`<br>`"4k/uhd"`<br>`"8k"` | The target resolution for the enhanced video. Some options may be unavailable depending on the selected `model`. |
| `video` | VIDEO | Yes | N/A | The input video file to be enhanced. |

**Constraints:**

* The input `video` must be between 0.5 seconds and 60 minutes (3600 seconds) in duration.
* The selected `resolution` must be larger than the input video's dimensions. If the video is square, the selected resolution must be larger than its width/height. For non-square videos, the selected resolution must be larger than the video's shorter dimension. If the target resolution is smaller, an error will be raised. Choose `"original"` to keep the input video's resolution.

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `video` | VIDEO | The enhanced video file. |

**Source**: `comfy_api_nodes/nodes_hitpaw.py`

**Used in 1 template(s)**
