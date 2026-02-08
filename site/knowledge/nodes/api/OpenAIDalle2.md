# OpenAIDalle2

**Category**: api node/image/OpenAI

**Display Name**: OpenAI DALL·E 2

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/OpenAIDalle2/en.md)

```markdown
Generates images synchronously via OpenAI's DALL·E 2 endpoint.

## How It Works

This node connects to OpenAI's DALL·E 2 API to create images based on text descriptions. When you provide a text prompt, the node sends it to OpenAI's servers which generate corresponding images and return them to ComfyUI. The node can operate in two modes: standard image generation using just a text prompt, or image editing mode when both an image and mask are provided. In editing mode, it uses the mask to determine which parts of the original image should be modified while keeping other areas unchanged.

## Inputs

| Parameter | Data Type | Input Type | Default | Range | Description |
|-----------|-----------|------------|---------|-------|-------------|
| `prompt` | STRING | required | "" | - | Text prompt for DALL·E |
| `seed` | INT | optional | 0 | 0 to 2147483647 | not implemented yet in backend |
| `size` | COMBO | optional | "1024x1024" | "256x256", "512x512", "1024x1024" | Image size |
| `n` | INT | optional | 1 | 1 to 8 | How many images to generate |
| `image` | IMAGE | optional | None | - | Optional reference image for image editing. |
| `mask` | MASK | optional | None | - | Optional mask for inpainting (white areas will be replaced) |

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `IMAGE` | IMAGE | The generated or edited image(s) from DALL·E 2 |
```

**Source**: `comfy_api_nodes/nodes_openai.py`

**Used in 2 template(s)**
