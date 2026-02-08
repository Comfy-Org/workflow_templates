# MoonvalleyVideo2VideoNode

**Category**: api node/video/Moonvalley Marey

**Display Name**: Moonvalley Marey Video to Video

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/MoonvalleyVideo2VideoNode/en.md)

The Moonvalley Marey Video to Video node transforms an input video into a new video based on a text description. It uses the Moonvalley API to generate videos that match your prompt while preserving motion or pose characteristics from the original video. You can control the style and content of the output video through text prompts and various generation parameters.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `prompt` | STRING | Yes | - | Describes the video to generate (multiline input) |
| `negative_prompt` | STRING | No | - | Negative prompt text (default: extensive list of negative descriptors) |
| `seed` | INT | Yes | 0-4294967295 | Random seed value (default: 9) |
| `video` | VIDEO | Yes | - | The reference video used to generate the output video. Must be at least 5 seconds long. Videos longer than 5s will be automatically trimmed. Only MP4 format supported. |
| `control_type` | COMBO | No | "Motion Transfer"<br>"Pose Transfer" | Control type selection (default: "Motion Transfer") |
| `motion_intensity` | INT | No | 0-100 | Only used if control_type is 'Motion Transfer' (default: 100) |
| `steps` | INT | Yes | 1-100 | Number of inference steps (default: 33) |

**Note:** The `motion_intensity` parameter is only applied when `control_type` is set to "Motion Transfer". When using "Pose Transfer", this parameter is ignored.

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `output` | VIDEO | The generated video output |

**Source**: `comfy_api_nodes/nodes_moonvalley.py`

**Used in 2 template(s)**
