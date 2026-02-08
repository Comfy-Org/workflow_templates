# RecraftCreativeUpscaleNode

**Category**: api node/image/Recraft

**Display Name**: Recraft Creative Upscale Image

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/RecraftCreativeUpscaleNode/en.md)

The Recraft Creative Upscale Image node enhances a raster image by increasing its resolution. It uses a "creative upscale" process that focuses on improving small details and faces within the image. This operation is performed synchronously through an external API.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `image` | IMAGE | Yes | | The input image to be upscaled. |

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `image` | IMAGE | The resulting upscaled image with enhanced details. |

**Source**: `comfy_api_nodes/nodes_recraft.py`

**Used in 1 template(s)**
