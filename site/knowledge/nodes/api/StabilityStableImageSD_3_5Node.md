# StabilityStableImageSD_3_5Node

**Category**: api node/image/Stability AI

**Display Name**: Stability AI Stable Diffusion 3.5 Image

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/StabilityStableImageSD_3_5Node/en.md)

This node generates images synchronously using Stability AI's Stable Diffusion 3.5 model. It creates images based on text prompts and can also modify existing images when provided as input. The node supports various aspect ratios and style presets to customize the output.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `prompt` | STRING | Yes | - | What you wish to see in the output image. A strong, descriptive prompt that clearly defines elements, colors, and subjects will lead to better results. (default: empty string) |
| `model` | COMBO | Yes | Multiple options available | The Stable Diffusion 3.5 model to use for generation. |
| `aspect_ratio` | COMBO | Yes | Multiple options available | Aspect ratio of generated image. (default: 1:1 ratio) |
| `style_preset` | COMBO | No | Multiple options available | Optional desired style of generated image. |
| `cfg_scale` | FLOAT | Yes | 1.0 to 10.0 | How strictly the diffusion process adheres to the prompt text (higher values keep your image closer to your prompt). (default: 4.0) |
| `seed` | INT | Yes | 0 to 4294967294 | The random seed used for creating the noise. (default: 0) |
| `image` | IMAGE | No | - | Optional input image for image-to-image generation. |
| `negative_prompt` | STRING | No | - | Keywords of what you do not wish to see in the output image. This is an advanced feature. (default: empty string) |
| `image_denoise` | FLOAT | No | 0.0 to 1.0 | Denoise of input image; 0.0 yields image identical to input, 1.0 is as if no image was provided at all. (default: 0.5) |

**Note:** When an `image` is provided, the node switches to image-to-image generation mode and the `aspect_ratio` parameter is automatically determined from the input image. When no `image` is provided, the `image_denoise` parameter is ignored.

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `image` | IMAGE | The generated or modified image. |

**Source**: `comfy_api_nodes/nodes_stability.py`

**Used in 2 template(s)**
