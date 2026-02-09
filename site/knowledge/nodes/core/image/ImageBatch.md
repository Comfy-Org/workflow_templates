# ImageBatch

**Category**: image

## Description

The `ImageBatch` node is designed for combining two images into a single batch. If the dimensions of the images do not match, it automatically rescales the second image to match the first one's dimensions before combining them.

## Inputs

| Parameter | Data Type | Description |
|-----------|-------------|-------------|
| `image1`  | `IMAGE`     | The first image to be combined into the batch. It serves as the reference for the dimensions to which the second image will be adjusted if necessary. |
| `image2`  | `IMAGE`     | The second image to be combined into the batch. It is automatically rescaled to match the dimensions of the first image if they differ. |

## Outputs

| Output | Type | Description |
|--------|------|-------------|
| IMAGE | IMAGE |  |

**Source**: `nodes.py`

**Used in 21 template(s)**
