# MaskToImage

**Category**: mask

**Display Name**: Convert Mask to Image

**Also known as**: convert mask

## Description

The `MaskToImage` node is designed to convert a mask into an image format. This transformation allows for the visualization and further processing of masks as images, facilitating a bridge between mask-based operations and image-based applications.

## Inputs

| Parameter | Data Type | Description |
|-----------|-------------|-------------|
| `mask`    | `MASK`      | The mask input is essential for the conversion process, serving as the source data that will be transformed into an image format. This input dictates the shape and content of the resulting image. |

## Outputs

| Parameter | Data Type | Description |
|-----------|-------------|-------------|
| `image`   | `IMAGE`     | The output is an image representation of the input mask, enabling visual inspection and further image-based manipulations. |

**Source**: `comfy_extras/nodes_mask.py`

**Used in 3 template(s)**
