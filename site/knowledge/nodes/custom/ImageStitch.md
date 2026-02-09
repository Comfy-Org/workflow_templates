# ImageStitch

**Category**: image/transform

**Display Name**: Image Stitch

**Also known as**: combine images, join images, concatenate images, side by side

## Description

This node allows you to stitch two images together in a specified direction (up, down, left, right), with support for size matching and spacing between images.

## Inputs

| Parameter Name | Data Type | Input Type | Default | Range | Description |
|---------------|-----------|-------------|---------|--------|-------------|
| `image1` | IMAGE | Required | - | - | The first image to be stitched |
| `image2` | IMAGE | Optional | None | - | The second image to be stitched, if not provided returns only the first image |
| `direction` | STRING | Required | right | right/down/left/up | The direction to stitch the second image: right, down, left, or up |
| `match_image_size` | BOOLEAN | Required | True | True/False | Whether to resize the second image to match the dimensions of the first image |
| `spacing_width` | INT | Required | 0 | 0-1024 | Width of spacing between images, must be an even number |
| `spacing_color` | STRING | Required | white | white/black/red/green/blue | Color of the spacing between stitched images |

> For `spacing_color`, when using colors other than "white/black", if `match_image_size` is set to `false`, the padding area will be filled with black

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `IMAGE` | IMAGE | The stitched image |

**Source**: `comfy_extras/nodes_images.py`

**Used in 5 template(s)**
