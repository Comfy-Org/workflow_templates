# LtxvApiTextToVideo

**Category**: api node/video/LTXV

**Display Name**: LTXV Text To Video

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/LtxvApiTextToVideo/en.md)

The LTXV Text To Video node generates professional-quality videos from a text description. It connects to an external API to create videos with customizable duration, resolution, and frame rate. You can also choose to have AI-generated audio added to the video.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `model` | COMBO | Yes | `"LTX-2 (Fast)"`<br>`"LTX-2 (Quality)"`<br>`"LTX-2 (Turbo)"` | The AI model to use for video generation. The available models are mapped from the source code's `MODELS_MAP`. |
| `prompt` | STRING | Yes | - | The text description that the AI will use to generate the video. This field supports multiple lines of text. |
| `duration` | COMBO | Yes | `6`<br>`8`<br>`10`<br>`12`<br>`14`<br>`16`<br>`18`<br>`20` | The length of the generated video in seconds (default: 8). |
| `resolution` | COMBO | Yes | `"1920x1080"`<br>`"2560x1440"`<br>`"3840x2160"` | The pixel dimensions (width x height) of the output video. |
| `fps` | COMBO | Yes | `25`<br>`50` | The frames per second for the video (default: 25). |
| `generate_audio` | BOOLEAN | No | - | When enabled, the generated video will include AI-generated audio matching the scene (default: False). |

**Important Constraints:**
*   The `prompt` must be between 1 and 10,000 characters long.
*   If you select a `duration` greater than 10 seconds, you must also use the `"LTX-2 (Fast)"` model, a resolution of `"1920x1080"`, and an `fps` of `25`. This combination is required for longer videos.

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `output` | VIDEO | The generated video file. |

**Source**: `comfy_api_nodes/nodes_ltxv.py`

**Used in 1 template(s)**
