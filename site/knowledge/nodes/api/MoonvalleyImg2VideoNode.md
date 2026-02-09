# MoonvalleyImg2VideoNode

**Category**: api node/video/Moonvalley Marey

**Display Name**: Moonvalley Marey Image to Video

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/MoonvalleyImg2VideoNode/en.md)

The Moonvalley Marey Image to Video node transforms a reference image into a video using the Moonvalley API. It takes an input image and a text prompt to generate a video with specified resolution, quality settings, and creative controls. The node handles the entire process from image upload to video generation and download.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `image` | IMAGE | Yes | - | The reference image used to generate the video |
| `prompt` | STRING | Yes | - | Text description for video generation (multiline input) |
| `negative_prompt` | STRING | No | - | Negative prompt text to exclude unwanted elements (default: extensive negative prompt list) |
| `resolution` | COMBO | No | "16:9 (1920 x 1080)"<br>"9:16 (1080 x 1920)"<br>"1:1 (1152 x 1152)"<br>"4:3 (1536 x 1152)"<br>"3:4 (1152 x 1536)" | Resolution of the output video (default: "16:9 (1920 x 1080)") |
| `prompt_adherence` | FLOAT | No | 1.0 - 20.0 | Guidance scale for generation control (default: 4.5, step: 1.0) |
| `seed` | INT | No | 0 - 4294967295 | Random seed value (default: 9, control after generate enabled) |
| `steps` | INT | No | 1 - 100 | Number of denoising steps (default: 33, step: 1) |

**Constraints:**

- The input image must have dimensions between 300x300 pixels and the maximum allowed height/width
- Prompt and negative prompt text length is limited to the Moonvalley Marey maximum prompt length

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `output` | VIDEO | The generated video output |

**Source**: `comfy_api_nodes/nodes_moonvalley.py`

**Used in 1 template(s)**
