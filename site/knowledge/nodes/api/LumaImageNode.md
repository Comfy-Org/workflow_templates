# LumaImageNode

**Category**: api node/image/Luma

**Display Name**: Luma Text to Image

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/LumaImageNode/en.md)

Generates images synchronously based on prompt and aspect ratio. This node creates images using text descriptions and allows you to control the image dimensions and style through various reference inputs.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `prompt` | STRING | Yes | - | Prompt for the image generation (default: empty string) |
| `model` | COMBO | Yes | Multiple options available | Model selection for image generation |
| `aspect_ratio` | COMBO | Yes | Multiple options available | Aspect ratio for the generated image (default: 16:9 ratio) |
| `seed` | INT | Yes | 0 to 18446744073709551615 | Seed to determine if node should re-run; actual results are nondeterministic regardless of seed (default: 0) |
| `style_image_weight` | FLOAT | No | 0.0 to 1.0 | Weight of style image. Ignored if no style_image provided (default: 1.0) |
| `image_luma_ref` | LUMA_REF | No | - | Luma Reference node connection to influence generation with input images; up to 4 images can be considered |
| `style_image` | IMAGE | No | - | Style reference image; only 1 image will be used |
| `character_image` | IMAGE | No | - | Character reference images; can be a batch of multiple, up to 4 images can be considered |

**Parameter Constraints:**

- The `image_luma_ref` parameter can accept up to 4 reference images
- The `character_image` parameter can accept up to 4 character reference images
- The `style_image` parameter accepts only 1 style reference image
- The `style_image_weight` parameter is only used when `style_image` is provided

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `output` | IMAGE | The generated image based on the input parameters |

**Source**: `comfy_api_nodes/nodes_luma.py`

**Used in 1 template(s)**
