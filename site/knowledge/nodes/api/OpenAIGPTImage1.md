# OpenAIGPTImage1

**Category**: api node/image/OpenAI

**Display Name**: OpenAI GPT Image 1.5

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/OpenAIGPTImage1/en.md)

Generates images synchronously via OpenAI's GPT Image 1 endpoint. This node can create new images from text prompts or edit existing images when provided with an input image and optional mask.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `prompt` | STRING | Yes | - | Text prompt for GPT Image 1 (default: "") |
| `seed` | INT | No | 0 to 2147483647 | Random seed for generation (default: 0) - not implemented yet in backend |
| `quality` | COMBO | No | "low"<br>"medium"<br>"high" | Image quality, affects cost and generation time (default: "low") |
| `background` | COMBO | No | "opaque"<br>"transparent" | Return image with or without background (default: "opaque") |
| `size` | COMBO | No | "auto"<br>"1024x1024"<br>"1024x1536"<br>"1536x1024" | Image size (default: "auto") |
| `n` | INT | No | 1 to 8 | How many images to generate (default: 1) |
| `image` | IMAGE | No | - | Optional reference image for image editing (default: None) |
| `mask` | MASK | No | - | Optional mask for inpainting (white areas will be replaced) (default: None) |

**Parameter Constraints:**

- When `image` is provided, the node switches to image editing mode
- `mask` can only be used when `image` is provided
- When using `mask`, only single images are supported (batch size must be 1)
- `mask` and `image` must be the same size

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `IMAGE` | IMAGE | Generated or edited image(s) |

**Source**: `comfy_api_nodes/nodes_openai.py`

**Used in 5 template(s)**
