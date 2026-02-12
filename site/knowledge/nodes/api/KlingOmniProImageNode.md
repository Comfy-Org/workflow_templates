# KlingOmniProImageNode

**Category**: api node/image/Kling

**Display Name**: Kling Omni Image (Pro)

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/KlingOmniProImageNode/en.md)

The Kling Omni Image (Pro) node generates or edits images using the Kling AI model. It creates images based on a text description and allows you to provide reference images to guide the style or content. The node sends a request to an external API, which processes the task and returns the final image.

## Inputs

| Parameter | Data Type | Required | Range | Description |
| :--- | :--- | :--- | :--- | :--- |
| `model_name` | COMBO | Yes | `"kling-image-o1"` | The specific Kling AI model to use for image generation. |
| `prompt` | STRING | Yes | - | A text prompt describing the image content. This can include both positive and negative descriptions. The text must be between 1 and 2500 characters long. |
| `resolution` | COMBO | Yes | `"1K"`<br>`"2K"` | The target resolution for the generated image. |
| `aspect_ratio` | COMBO | Yes | `"16:9"`<br>`"9:16"`<br>`"1:1"`<br>`"4:3"`<br>`"3:4"`<br>`"3:2"`<br>`"2:3"`<br>`"21:9"` | The desired aspect ratio (width to height) for the generated image. |
| `reference_images` | IMAGE | No | - | Up to 10 additional reference images. Each image must be at least 300 pixels in both width and height, and its aspect ratio must be between 1:2.5 and 2.5:1. |

## Outputs

| Output Name | Data Type | Description |
| :--- | :--- | :--- |
| `image` | IMAGE | The final image generated or edited by the Kling AI model. |

**Source**: `comfy_api_nodes/nodes_kling.py`

**Used in 1 template(s)**
