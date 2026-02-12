# KlingMotionControl

**Category**: api node/video/Kling

**Display Name**: Kling Motion Control

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/KlingMotionControl/en.md)

The Kling Motion Control node generates a video by applying the motion, expressions, and camera movements from a reference video to a character defined by a reference image and a text prompt. It allows you to control whether the character's final orientation comes from the reference video or the reference image.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `prompt` | STRING | Yes | N/A | A text description of the desired video. Maximum length is 2500 characters. |
| `reference_image` | IMAGE | Yes | N/A | An image of the character to animate. Minimum dimensions are 340x340 pixels. The aspect ratio must be between 1:2.5 and 2.5:1. |
| `reference_video` | VIDEO | Yes | N/A | A motion reference video used to drive the character's movement and expression. Minimum dimensions are 340x340 pixels, maximum dimensions are 3850x3850 pixels. Duration limits depend on the `character_orientation` setting. |
| `keep_original_sound` | BOOLEAN | No | N/A | Determines if the original audio from the reference video is kept in the output. Default is `True`. |
| `character_orientation` | COMBO | No | `"video"`<br>`"image"` | Controls where the character's facing/orientation comes from. `"video"`: movements, expressions, camera moves, and orientation follow the motion reference video. `"image"`: movements and expressions follow the motion reference video, but the character orientation matches the reference image. |
| `mode` | COMBO | No | `"pro"`<br>`"std"` | The generation mode to use. |

**Constraints:**
*   The `reference_video` duration must be between 3 and 30 seconds when `character_orientation` is set to `"video"`.
*   The `reference_video` duration must be between 3 and 10 seconds when `character_orientation` is set to `"image"`.

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `output` | VIDEO | The generated video with the character performing the motion from the reference video. |

**Source**: `comfy_api_nodes/nodes_kling.py`

**Used in 1 template(s)**
