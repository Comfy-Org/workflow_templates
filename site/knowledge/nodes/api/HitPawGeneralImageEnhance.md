# HitPawGeneralImageEnhance

**Category**: api node/image/HitPaw

**Display Name**: HitPaw General Image Enhance

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/HitPawGeneralImageEnhance/en.md)

This node enhances low-resolution images by upscaling them to super-resolution, removing artifacts and noise. It uses an external API to process the image and can automatically adjust the input size to stay within processing limits. The maximum allowed output size is 4 megapixels.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `model` | STRING | Yes | `"generative_portrait"`<br>`"generative"` | The enhancement model to use. |
| `image` | IMAGE | Yes | - | The input image to be enhanced. |
| `upscale_factor` | INT | Yes | `1`<br>`2`<br>`4` | The factor by which to upscale the image's dimensions. |
| `auto_downscale` | BOOLEAN | No | - | Automatically downscale input image if output would exceed the limit. (default: `False`) |

**Note:** The node will raise an error if the calculated output size (input height × upscale_factor × input width × upscale_factor) exceeds 4,000,000 pixels (4MP) and `auto_downscale` is disabled. When `auto_downscale` is enabled, the node will attempt to downscale the input image to fit within the limit before applying the requested upscale factor.

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `image` | IMAGE | The enhanced and upscaled output image. |

**Source**: `comfy_api_nodes/nodes_hitpaw.py`

**Used in 1 template(s)**
