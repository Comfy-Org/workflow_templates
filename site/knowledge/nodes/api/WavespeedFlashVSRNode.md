# WavespeedFlashVSRNode

**Category**: api node/video/WaveSpeed

**Display Name**: FlashVSR Video Upscale

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/WavespeedFlashVSRNode/en.md)

The WavespeedFlashVSRNode is a fast, high-quality video upscaler that boosts the resolution and restores clarity for low-resolution or blurry footage. It processes a video input and outputs a new video at a user-selected higher resolution.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `video` | VIDEO | Yes | N/A | The input video file to be upscaled. |
| `target_resolution` | STRING | Yes | `"720p"`<br>`"1080p"`<br>`"2K"`<br>`"4K"` | The desired resolution for the upscaled output video. |

**Input Constraints:**

* The input `video` file must be in the MP4 container format.
* The duration of the input `video` must be between 5 seconds and 10 minutes (600 seconds).

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `output` | VIDEO | The upscaled video file at the selected target resolution. |

**Source**: `comfy_api_nodes/nodes_wavespeed.py`

**Used in 1 template(s)**
