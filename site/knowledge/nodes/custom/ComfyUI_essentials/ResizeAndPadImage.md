# ResizeAndPadImage

**Category**: image/transform

**Also known as**: fit to size

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/ResizeAndPadImage/en.md)

The ResizeAndPadImage node resizes an image to fit within specified dimensions while maintaining its original aspect ratio. It scales the image down proportionally to fit within the target width and height, then adds padding around the edges to fill any remaining space. The padding color and interpolation method can be customized to control the appearance of the padded areas and the quality of the resizing.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `image` | IMAGE | Yes | - | The input image to be resized and padded |
| `target_width` | INT | Yes | 1 to MAX_RESOLUTION | The desired width of the output image (default: 512) |
| `target_height` | INT | Yes | 1 to MAX_RESOLUTION | The desired height of the output image (default: 512) |
| `padding_color` | COMBO | Yes | "white"<br>"black" | The color to use for padding areas around the resized image |
| `interpolation` | COMBO | Yes | "area"<br>"bicubic"<br>"nearest-exact"<br>"bilinear"<br>"lanczos" | The interpolation method used for resizing the image |

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `image` | IMAGE | The resized and padded output image |

**Source**: `comfy_extras/nodes_images.py`

**Used in 5 template(s)**
