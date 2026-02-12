# LtxvApiImageToVideo

**Category**: api node/video/LTXV

**Display Name**: LTXV Image To Video

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/LtxvApiImageToVideo/en.md)

The LTXV Image To Video node generates a professional-quality video from a single starting image. It uses an external API to create a video sequence based on your text prompt, allowing you to customize the duration, resolution, and frame rate.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `image` | IMAGE | Yes | - | First frame to be used for the video. |
| `model` | COMBO | Yes | `"LTX-2 (Fast)"`<br>`"LTX-2 (Quality)"` | The AI model to use for video generation. The "Fast" model is optimized for speed, while the "Quality" model prioritizes visual fidelity. |
| `prompt` | STRING | Yes | - | A text description that guides the content and motion of the generated video. |
| `duration` | COMBO | Yes | `6`<br>`8`<br>`10`<br>`12`<br>`14`<br>`16`<br>`18`<br>`20` | The length of the video in seconds (default: 8). |
| `resolution` | COMBO | Yes | `"1920x1080"`<br>`"2560x1440"`<br>`"3840x2160"` | The output resolution of the generated video. |
| `fps` | COMBO | Yes | `25`<br>`50` | The frames per second for the video (default: 25). |
| `generate_audio` | BOOLEAN | No | - | When true, the generated video will include AI-generated audio matching the scene (default: False). |

**Important Constraints:**
*   The `image` input must contain exactly one image.
*   The `prompt` must be between 1 and 10,000 characters long.
*   If you select a `duration` longer than 10 seconds, you must use the **"LTX-2 (Fast)"** model, a **"1920x1080"** resolution, and **25** FPS. This combination is required for longer videos.

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `video` | VIDEO | The generated video file. |

**Source**: `comfy_api_nodes/nodes_ltxv.py`

**Used in 1 template(s)**
