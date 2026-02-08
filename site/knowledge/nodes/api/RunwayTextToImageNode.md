# RunwayTextToImageNode

**Category**: api node/image/Runway

**Display Name**: Runway Text to Image

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/RunwayTextToImageNode/en.md)

The Runway Text to Image node generates images from text prompts using Runway's Gen 4 model. You can provide a text description and optionally include a reference image to guide the image generation process. The node handles the API communication and returns the generated image.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `prompt` | STRING | Yes | - | Text prompt for the generation (default: "") |
| `ratio` | COMBO | Yes | "16:9"<br>"1:1"<br>"21:9"<br>"2:3"<br>"3:2"<br>"4:5"<br>"5:4"<br>"9:16"<br>"9:21" | Aspect ratio for the generated image |
| `reference_image` | IMAGE | No | - | Optional reference image to guide the generation |

**Note:** The reference image must have dimensions not exceeding 7999x7999 pixels and an aspect ratio between 0.5 and 2.0. When a reference image is provided, it guides the image generation process.

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `output` | IMAGE | The generated image based on the text prompt and optional reference image |

**Source**: `comfy_api_nodes/nodes_runway.py`

**Used in 2 template(s)**
