# ImageCompositeMasked

**Category**: image

**Also known as**: paste image, overlay, layer

## Description

The `ImageCompositeMasked` node is designed for compositing images, allowing for the overlay of a source image onto a destination image at specified coordinates, with optional resizing and masking.

## Inputs

| Parameter | Data Type | Description |
|-----------|-------------|-------------|
| `destination` | `IMAGE` | The destination image onto which the source image will be composited. It serves as the background for the composite operation. |
| `source` | `IMAGE` | The source image to be composited onto the destination image. This image can optionally be resized to fit the destination image's dimensions. |
| `x` | `INT` | The x-coordinate in the destination image where the top-left corner of the source image will be placed. |
| `y` | `INT` | The y-coordinate in the destination image where the top-left corner of the source image will be placed. |
| `resize_source` | `BOOLEAN` | A boolean flag indicating whether the source image should be resized to match the destination image's dimensions. |
| `mask` | `MASK` | An optional mask that specifies which parts of the source image should be composited onto the destination image. This allows for more complex compositing operations, such as blending or partial overlays. |

## Outputs

| Parameter | Data Type | Description |
|-----------|-------------|-------------|
| `image` | `IMAGE` | The resulting image after the compositing operation, which combines elements of both t

**Source**: `comfy_extras/nodes_mask.py`

**Used in 2 template(s)**
