# MagnificImageStyleTransferNode

**Category**: api node/image/Magnific

**Display Name**: Magnific Image Style Transfer

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/MagnificImageStyleTransferNode/en.md)

This node applies the visual style from a reference image to your input image. It uses an external AI service to process the images, allowing you to control the strength of the style transfer and the preservation of the original image's structure.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `image` | IMAGE | Yes | - | The image to apply style transfer to. |
| `reference_image` | IMAGE | Yes | - | The reference image to extract style from. |
| `prompt` | STRING | No | - | An optional text prompt to guide the style transfer. |
| `style_strength` | INT | No | 0 to 100 | Percentage of style strength (default: 100). |
| `structure_strength` | INT | No | 0 to 100 | Maintains the structure of the original image (default: 50). |
| `flavor` | COMBO | No | "faithful"<br>"gen_z"<br>"psychedelia"<br>"detaily"<br>"clear"<br>"donotstyle"<br>"donotstyle_sharp" | Style transfer flavor. |
| `engine` | COMBO | No | "balanced"<br>"definio"<br>"illusio"<br>"3d_cartoon"<br>"colorful_anime"<br>"caricature"<br>"real"<br>"super_real"<br>"softy" | Processing engine selection. |
| `portrait_mode` | COMBO | No | "disabled"<br>"enabled" | Enable portrait mode for facial enhancements. |
| `portrait_style` | COMBO | No | "standard"<br>"pop"<br>"super_pop" | Visual style applied to portrait images. This input is only available when `portrait_mode` is set to "enabled". |
| `portrait_beautifier` | COMBO | No | "none"<br>"beautify_face"<br>"beautify_face_max" | Facial beautification intensity on portraits. This input is only available when `portrait_mode` is set to "enabled". |
| `fixed_generation` | BOOLEAN | No | - | When disabled, expect each generation to introduce a degree of randomness, leading to more diverse outcomes (default: True). |

**Constraints:**

* Exactly one `image` and one `reference_image` are required.
* Both images must have an aspect ratio between 1:3 and 3:1.
* Both images must have a minimum height and width of 160 pixels.
* The `portrait_style` and `portrait_beautifier` parameters are only active and required when `portrait_mode` is set to "enabled".

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `image` | IMAGE | The resulting image after style transfer has been applied. |

**Source**: `comfy_api_nodes/nodes_magnific.py`

**Used in 1 template(s)**
