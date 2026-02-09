# PixverseTextToVideoNode

**Category**: api node/video/PixVerse

**Display Name**: PixVerse Text to Video

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/PixverseTextToVideoNode/en.md)

Generates videos based on prompt and output_size. This node creates video content using text descriptions and various generation parameters, producing video output through the PixVerse API.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `prompt` | STRING | Yes | - | Prompt for the video generation (default: "") |
| `aspect_ratio` | COMBO | Yes | Options from PixverseAspectRatio | Aspect ratio for the generated video |
| `quality` | COMBO | Yes | Options from PixverseQuality | Video quality setting (default: PixverseQuality.res_540p) |
| `duration_seconds` | COMBO | Yes | Options from PixverseDuration | Duration of the generated video in seconds |
| `motion_mode` | COMBO | Yes | Options from PixverseMotionMode | Motion style for the video generation |
| `seed` | INT | Yes | 0 to 2147483647 | Seed for video generation (default: 0) |
| `negative_prompt` | STRING | No | - | An optional text description of undesired elements on an image (default: "") |
| `pixverse_template` | CUSTOM | No | - | An optional template to influence style of generation, created by the PixVerse Template node |

**Note:** When using 1080p quality, the motion mode is automatically set to normal and duration is limited to 5 seconds. For non-5 second durations, the motion mode is also automatically set to normal.

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `output` | VIDEO | The generated video file |

**Source**: `comfy_api_nodes/nodes_pixverse.py`

**Used in 1 template(s)**
