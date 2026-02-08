# GetImageSize

**Category**: image

**Display Name**: Get Image Size

**Also known as**: dimensions, resolution, image info

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/GetImageSize/en.md)

The GetImageSize node extracts the dimensions and batch information from an input image. It returns the width, height, and batch size of the image while also displaying this information as progress text on the node interface. The original image data passes through unchanged.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `image` | IMAGE | Yes | - | The input image from which to extract size information |
| `unique_id` | UNIQUE_ID | No | - | Internal identifier used for displaying progress information |

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `width` | INT | The width of the input image in pixels |
| `height` | INT | The height of the input image in pixels |
| `batch_size` | INT | The number of images in the batch |

**Source**: `comfy_extras/nodes_images.py`

**Used in 10 template(s)**
