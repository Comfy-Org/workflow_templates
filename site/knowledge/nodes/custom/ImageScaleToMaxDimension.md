# ImageScaleToMaxDimension

**Category**: image/upscaling

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/ImageScaleToMaxDimension/en.md)

The ImageScaleToMaxDimension node resizes images to fit within a specified maximum dimension while maintaining the original aspect ratio. It calculates whether the image is portrait or landscape oriented, then scales the larger dimension to match the target size while proportionally adjusting the smaller dimension. The node supports multiple upscaling methods for different quality and performance requirements.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `image` | IMAGE | Yes | - | The input image to be scaled |
| `upscale_method` | STRING | Yes | "area"<br>"lanczos"<br>"bilinear"<br>"nearest-exact"<br>"bicubic" | The interpolation method used for scaling the image |
| `largest_size` | INT | Yes | 0 to 16384 | The maximum dimension for the scaled image (default: 512) |

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `image` | IMAGE | The scaled image with the largest dimension matching the specified size |

**Source**: `comfy_extras/nodes_images.py`

**Used in 4 template(s)**
