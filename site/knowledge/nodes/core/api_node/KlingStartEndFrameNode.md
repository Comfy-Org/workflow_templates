# KlingStartEndFrameNode

**Category**: api node/video/Kling

**Display Name**: Kling Start-End Frame to Video

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/KlingStartEndFrameNode/en.md)

Kling Start-End Frame to Video node creates a video sequence that transitions between your provided start and end images. It generates all the frames in between to produce a smooth transformation from the first frame to the last frame. This node calls the image-to-video API but only supports the input options that work with the `image_tail` request field.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `start_frame` | IMAGE | Yes | - | Reference Image - URL or Base64 encoded string, cannot exceed 10MB, resolution not less than 300*300px, aspect ratio between 1:2.5 ~ 2.5:1. Base64 should not include data:image prefix. |
| `end_frame` | IMAGE | Yes | - | Reference Image - End frame control. URL or Base64 encoded string, cannot exceed 10MB, resolution not less than 300*300px. Base64 should not include data:image prefix. |
| `prompt` | STRING | Yes | - | Positive text prompt |
| `negative_prompt` | STRING | Yes | - | Negative text prompt |
| `cfg_scale` | FLOAT | No | 0.0-1.0 | Controls the strength of the prompt guidance (default: 0.5) |
| `aspect_ratio` | COMBO | No | "16:9"<br>"9:16"<br>"1:1"<br>"21:9"<br>"9:21"<br>"3:4"<br>"4:3" | The aspect ratio for the generated video (default: "16:9") |
| `mode` | COMBO | No | Multiple options available | The configuration to use for the video generation following the format: mode / duration / model_name. (default: third option from available modes) |

**Image Constraints:**

- Both `start_frame` and `end_frame` must be provided and cannot exceed 10MB file size
- Minimum resolution: 300×300 pixels for both images
- `start_frame` aspect ratio must be between 1:2.5 and 2.5:1
- Base64 encoded images should not include the "data:image" prefix

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `output` | VIDEO | The generated video sequence |
| `video_id` | STRING | Unique identifier for the generated video |
| `duration` | STRING | Duration of the generated video |

**Source**: `comfy_api_nodes/nodes_kling.py`

**Used in 2 template(s)**
