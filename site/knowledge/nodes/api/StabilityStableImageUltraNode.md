# StabilityStableImageUltraNode

**Category**: api node/image/Stability AI

**Display Name**: Stability AI Stable Image Ultra

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/StabilityStableImageUltraNode/en.md)

Generates images synchronously based on prompt and resolution. This node creates images using Stability AI's Stable Image Ultra model, processing your text prompt and generating a corresponding image with the specified aspect ratio and style.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `prompt` | STRING | Yes | - | What you wish to see in the output image. A strong, descriptive prompt that clearly defines elements, colors, and subjects will lead to better results. To control the weight of a given word use the format `(word:weight)`, where `word` is the word you'd like to control the weight of and `weight` is a value between 0 and 1. For example: `The sky was a crisp (blue:0.3) and (green:0.8)` would convey a sky that was blue and green, but more green than blue. |
| `aspect_ratio` | COMBO | Yes | Multiple options available | Aspect ratio of generated image. |
| `style_preset` | COMBO | No | Multiple options available | Optional desired style of generated image. |
| `seed` | INT | Yes | 0-4294967294 | The random seed used for creating the noise. |
| `image` | IMAGE | No | - | Optional input image. |
| `negative_prompt` | STRING | No | - | A blurb of text describing what you do not wish to see in the output image. This is an advanced feature. |
| `image_denoise` | FLOAT | No | 0.0-1.0 | Denoise of input image; 0.0 yields image identical to input, 1.0 is as if no image was provided at all. Default: 0.5 |

**Note:** When an input image is not provided, the `image_denoise` parameter is automatically disabled.

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `output` | IMAGE | The generated image based on the input parameters. |

**Source**: `comfy_api_nodes/nodes_stability.py`

**Used in 2 template(s)**
