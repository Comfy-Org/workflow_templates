# LoadImage

**Category**: image

## Description

The LoadImage node is designed to load and preprocess images from a specified path. It handles image formats with multiple frames, applies necessary transformations such as rotation based on EXIF data, normalizes pixel values, and optionally generates a mask for images with an alpha channel. This node is essential for preparing images for further processing or analysis within a pipeline.

## Inputs

| Parameter | Data Type | Description |
|-----------|--------------|-------------|
| `image`   | COMBO[STRING] | The 'image' parameter specifies the identifier of the image to be loaded and processed. It is crucial for determining the path to the image file and subsequently loading the image for transformation and normalization. |

## Outputs

| Output | Type | Description |
|--------|------|-------------|
| IMAGE | IMAGE |  |
| MASK | MASK |  |

**Source**: `nodes.py`

**Used in 204 template(s)**
