# ImageCompare

**Category**: image

**Display Name**: Image Compare

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/ImageCompare/en.md)

The Image Compare node provides a visual interface to compare two images side-by-side using a draggable slider. It is designed as an output node, meaning it does not pass data to other nodes but instead displays the images directly in the user interface for inspection.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `image_a` | IMAGE | No | - | The first image to compare. |
| `image_b` | IMAGE | No | - | The second image to compare. |
| `compare_view` | IMAGECOMPARE | Yes | - | The control that enables the slider comparison view in the UI. |

**Note:** This node is an output node. While `image_a` and `image_b` are optional, at least one image must be provided for the node to have a visible effect. The node will display an empty area for any image input that is not connected.

**Source**: `comfy_extras/nodes_image_compare.py`

**Used in 10 template(s)**
