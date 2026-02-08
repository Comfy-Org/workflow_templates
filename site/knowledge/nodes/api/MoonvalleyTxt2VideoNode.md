# MoonvalleyTxt2VideoNode

**Category**: api node/video/Moonvalley Marey

**Display Name**: Moonvalley Marey Text to Video

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/MoonvalleyTxt2VideoNode/en.md)

The Moonvalley Marey Text to Video node generates video content from text descriptions using the Moonvalley API. It takes a text prompt and converts it into a video with customizable settings for resolution, quality, and style. The node handles the entire process from sending the generation request to downloading the final video output.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `prompt` | STRING | Yes | - | Text description of the video content to generate |
| `negative_prompt` | STRING | No | - | Negative prompt text (default: extensive list of excluded elements like synthetic, scene cut, artifacts, noise, etc.) |
| `resolution` | STRING | No | "16:9 (1920 x 1080)"<br>"9:16 (1080 x 1920)"<br>"1:1 (1152 x 1152)"<br>"4:3 (1536 x 1152)"<br>"3:4 (1152 x 1536)"<br>"21:9 (2560 x 1080)" | Resolution of the output video (default: "16:9 (1920 x 1080)") |
| `prompt_adherence` | FLOAT | No | 1.0-20.0 | Guidance scale for generation control (default: 4.0) |
| `seed` | INT | No | 0-4294967295 | Random seed value (default: 9) |
| `steps` | INT | No | 1-100 | Inference steps (default: 33) |

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `video` | VIDEO | The generated video output based on the text prompt |

**Source**: `comfy_api_nodes/nodes_moonvalley.py`

**Used in 1 template(s)**
