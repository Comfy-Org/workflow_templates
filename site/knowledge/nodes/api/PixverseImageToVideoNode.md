# PixverseImageToVideoNode

**Category**: api node/video/PixVerse

**Display Name**: PixVerse Image to Video

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/PixverseImageToVideoNode/en.md)

Generates videos based on an input image and text prompt. This node takes an image and creates an animated video by applying the specified motion and quality settings to transform the static image into a moving sequence.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `image` | IMAGE | Yes | - | Input image to transform into video |
| `prompt` | STRING | Yes | - | Prompt for the video generation |
| `quality` | COMBO | Yes | `res_540p`<br>`res_1080p` | Video quality setting (default: res_540p) |
| `duration_seconds` | COMBO | Yes | `dur_2`<br>`dur_5`<br>`dur_10` | Duration of the generated video in seconds |
| `motion_mode` | COMBO | Yes | `normal`<br>`fast`<br>`slow`<br>`zoom_in`<br>`zoom_out`<br>`pan_left`<br>`pan_right`<br>`pan_up`<br>`pan_down`<br>`tilt_up`<br>`tilt_down`<br>`roll_clockwise`<br>`roll_counterclockwise` | Motion style applied to the video generation |
| `seed` | INT | Yes | 0-2147483647 | Seed for video generation (default: 0) |
| `negative_prompt` | STRING | No | - | An optional text description of undesired elements on an image |
| `pixverse_template` | CUSTOM | No | - | An optional template to influence style of generation, created by the PixVerse Template node |

**Note:** When using 1080p quality, the motion mode is automatically set to normal and duration is limited to 5 seconds. For durations other than 5 seconds, the motion mode is also automatically set to normal.

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `output` | VIDEO | Generated video based on the input image and parameters |

**Source**: `comfy_api_nodes/nodes_pixverse.py`

**Used in 2 template(s)**
