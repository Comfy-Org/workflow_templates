# RecraftCrispUpscaleNode

**Category**: api node/image/Recraft

**Display Name**: Recraft Crisp Upscale Image

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/RecraftCrispUpscaleNode/en.md)

Upscale image synchronously. Enhances a given raster image using 'crisp upscale' tool, increasing image resolution, making the image sharper and cleaner.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `image` | IMAGE | Yes | - | The input image to be upscaled |
| `auth_token` | STRING | No | - | Authentication token for Recraft API |
| `comfy_api_key` | STRING | No | - | API key for Comfy.org services |

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `image` | IMAGE | The upscaled image with enhanced resolution and clarity |

**Source**: `comfy_api_nodes/nodes_recraft.py`

**Used in 1 template(s)**
