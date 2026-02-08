# FluxProUltraImageNode

**Category**: api node/image/BFL

**Display Name**: Flux 1.1 [pro] Ultra Image

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/FluxProUltraImageNode/en.md)

Generates images using Flux Pro 1.1 Ultra via API based on prompt and resolution. This node connects to an external service to create images according to your text description and specified dimensions.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `prompt` | STRING | Yes | - | Prompt for the image generation (default: empty string) |
| `prompt_upsampling` | BOOLEAN | No | - | Whether to perform upsampling on the prompt. If active, automatically modifies the prompt for more creative generation, but results are nondeterministic (same seed will not produce exactly the same result). (default: False) |
| `seed` | INT | No | 0 to 18446744073709551615 | The random seed used for creating the noise. (default: 0) |
| `aspect_ratio` | STRING | No | - | Aspect ratio of image; must be between 1:4 and 4:1. (default: "16:9") |
| `raw` | BOOLEAN | No | - | When True, generate less processed, more natural-looking images. (default: False) |
| `image_prompt` | IMAGE | No | - | Optional reference image to guide generation |
| `image_prompt_strength` | FLOAT | No | 0.0 to 1.0 | Blend between the prompt and the image prompt. (default: 0.1) |

**Note:** The `aspect_ratio` parameter must be between 1:4 and 4:1. When `image_prompt` is provided, `image_prompt_strength` becomes active and controls how much the reference image influences the final output.

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `output_image` | IMAGE | The generated image from Flux Pro 1.1 Ultra |

**Source**: `comfy_api_nodes/nodes_bfl.py`

**Used in 1 template(s)**
