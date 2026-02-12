# WavespeedImageUpscaleNode

**Category**: api node/image/WaveSpeed

**Display Name**: WaveSpeed Image Upscale

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/WavespeedImageUpscaleNode/en.md)

The WaveSpeed Image Upscale node uses an external AI service to increase the resolution and quality of an image. It takes a single input photo and upscales it to a higher target resolution, such as 2K, 4K, or 8K, producing a sharper and more detailed result.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `model` | STRING | Yes | `"SeedVR2"`<br>`"Ultimate"` | The AI model to use for upscaling. "SeedVR2" and "Ultimate" offer different quality and pricing tiers. |
| `image` | IMAGE | Yes | | The input image to be upscaled. |
| `target_resolution` | STRING | Yes | `"2K"`<br>`"4K"`<br>`"8K"` | The desired output resolution for the upscaled image. |

**Note:** This node requires exactly one input image. Providing a batch of images will result in an error.

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `image` | IMAGE | The upscaled, high-resolution output image. |

**Source**: `comfy_api_nodes/nodes_wavespeed.py`

**Used in 2 template(s)**
